# 04 — Context, ciclo de vida e goroutines pós-resposta

> `context` é a coleira que define quando trabalho em Go termina. Cancelar errado mata efeitos que deveriam completar; não cancelar nada vaza goroutines. Goroutines que rodam **depois** da resposta são equivalentes a `fastcgi_finish_request` / `register_shutdown_function` / `kernel.terminate` do PHP, mas com regras próprias — esta reference cobre.

## Sumário

- [`r.Context()` cancelado no meio](#rcontext-cancelado-no-meio)
- [Goroutines pós-resposta](#goroutines-pós-resposta)
- [Equivalência com PHP](#equivalência-com-php)
- [Recover obrigatório em goroutine](#recover-obrigatório-em-goroutine)
- [Vazamento de goroutine](#vazamento-de-goroutine)
- [Padrão recomendado para pós-resposta](#padrão-recomendado-para-pós-resposta)
- [Saída esperada](#saída-esperada)

---

## `r.Context()` cancelado no meio

`r.Context()` é cancelado quando:

- O cliente fecha a conexão (timeout, navegou para fora).
- O servidor decide encerrar (shutdown).
- Um middleware com timeout dispara.
- O handler retorna (em alguns frameworks).

Implicações para efeitos no meio do fluxo:

- `db.ExecContext(ctx, ...)`: aborta. Em transação, **rolla back** a operação atual. Pode deixar estado parcial dependendo de onde estava.
- `http.Client.Do(req.WithContext(ctx))`: aborta a chamada. Se a API externa **recebeu** o request, o server-side da API decide o que fazer — pode persistir mesmo assim.
- `redis.Client.Get(ctx, key)`: aborta.

Como o legado PHP **não** tem esse cancelamento (a request roda até terminar), o Go com `r.Context()` pode terminar **antes** que o legado terminaria. Drift sutil:

- Banco: PHP termina o INSERT mesmo se cliente desconectar; Go aborta. Estado pós-request diverge.
- API externa: PHP completa a chamada; Go cancela. A API pode ter recebido ou não.

Decisões a tomar por efeito:

- **Efeito crítico que deve completar**: use `context.Background()` derivado (com timeout próprio), não `r.Context()`.
- **Efeito que pode parar com o cliente**: mantenha `r.Context()`. Lê de banco para resposta é um exemplo natural.
- **Efeito pós-resposta**: ver seção própria abaixo.

## Goroutines pós-resposta

Padrão `go func() { ... }()` solto no handler para "não bloquear":

- A função retorna (ou pode retornar) **antes** da goroutine terminar.
- `r.Context()` provavelmente já foi cancelado quando a goroutine acessa banco/API.
- `r.Body` foi fechado.
- Panic na goroutine **derruba o processo** se não houver `recover`.

Em PHP, o equivalente é `fastcgi_finish_request`, `register_shutdown_function` ou (Symfony) `kernel.terminate`. Diferenças:

- No PHP, a infraestrutura garante que o handler global rode em volta — exception não derruba o worker.
- No Go, você precisa montar o equivalente: recover, context independente, logging.

## Equivalência com PHP

| Conceito PHP | Equivalente Go | Cuidados |
|--------------|----------------|----------|
| `fastcgi_finish_request()` | `flusher.Flush()` + retornar do handler; trabalho continua em goroutine separada | precisa goroutine + recover + context próprio |
| `register_shutdown_function(...)` | goroutine disparada antes de `return`, ou `defer` com `recover` | `defer` roda antes do return — não é "pós-resposta" |
| `kernel.terminate` (Symfony) | middleware que dispara trabalho assíncrono via canal | precisa worker do lado consumidor |
| Excepção pós-resposta capturada pelo handler global | recover + log estruturado | sem recover, processo cai |

Se o legado dependia de `register_shutdown_function` para gravar um log ou disparar evento, o Go precisa **garantir** que esse efeito ainda ocorra — com `context.Background()` derivado, timeout próprio, e recover.

## Recover obrigatório em goroutine

```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            logger.Error("panic in audit goroutine", "panic", r, "stack", debug.Stack())
        }
    }()
    audit.Log(ctxIndependente, "onboarding completed", userID)
}()
```

Sem o `recover`, qualquer panic dentro da goroutine derruba o processo Go inteiro (e todas as requests em curso). Em PHP isso simplesmente não acontece — o handler global encapsula. Em Go, é decisão sua.

## Vazamento de goroutine

Goroutine que nunca termina ocupa memória, file descriptors, conexões. Sintomas: uso de memória crescendo, gorountine count crescendo (visível em `/debug/pprof/goroutine`).

Causas típicas:

- Channel sem reader/writer (`<- ch` ou `ch <-` que ninguém atende).
- `time.After` em loop apertado (mantém o timer vivo até disparar — em Go ≤1.22 sem cancel).
- Goroutine espera `context.Done()` mas o context nunca é cancelado.
- `errgroup` onde uma das goroutines nunca retorna e o `Wait` bloqueia indefinidamente.

Para cada goroutine criada na rota, garanta **critério explícito de término**: retorno por sucesso, erro, ou cancelamento.

## Padrão recomendado para pós-resposta

```go
// Dentro do handler, antes de retornar:
go func(userID string) {
    defer func() {
        if r := recover(); r != nil {
            logger.Error("post-response panic", "panic", r, "stack", debug.Stack())
        }
    }()

    // Context independente: NÃO usar r.Context()
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := audit.Log(ctx, "onboarding completed", userID); err != nil {
        logger.Error("audit log failed", "err", err)
    }
}(userID)
```

Pontos:

- **Cópia dos dados** capturados (`userID` por valor) — não capture o request inteiro.
- **`context.Background()`** com timeout próprio — `r.Context()` já vai estar cancelado.
- **Recover** com log estruturado.
- **Sem retorno de erro**: a goroutine roda depois da resposta, então o erro só pode ir para log/métrica.
- **Tempo limite**: sem timeout, goroutine pode pendurar indefinidamente.
- **Idealmente uma fila ao invés**: para volume, considere enfileirar em vez de goroutine direta. Decisão de design.

## Saída esperada

Por goroutine pós-resposta avaliada:

```markdown
### G1 — `internal/onboarding/service.go:142`
- Propósito: gravar audit log
- Equivalente legado: `register_shutdown_function([$audit, 'log'])` (ver side-effects-mapping/04)
- Captura: ✓ por valor (userID, eventName)
- Context: ✗ usa `r.Context()` — precisa virar `context.Background()` derivado
- Timeout próprio: ✗ — adicionar 5s
- Recover: ✗ — adicionar
- Cancelamento garantido? sim, pelo timeout
- Critério de término: timeout ou sucesso
- Veredito: corrigir
- Recomendação: aplicar o padrão recomendado (context independente + timeout + recover)
```
