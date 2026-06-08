---
name: go-concurrency-review
description: >-
  Detecta concorrência introduzida no serviço Go que não existia no PHP
  equivalente — `go func()`, `errgroup`, `sync.WaitGroup`, channels,
  paralelização de chamadas, goroutines pós-resposta — e verifica se essa
  concorrência muda a ordem de efeitos, introduz race condition, ou transforma
  um efeito síncrono em fire-and-forget (ou vice-versa). Em PHP cada request é
  sequencial e shared-nothing; em Go é fácil acidentalmente quebrar essa
  semântica. Use SEMPRE que estiver revisando uma rota Go migrada de PHP, ou
  quando alguém pedir revisão de concorrência, race condition, paralelismo,
  goroutines, ordem de efeitos, ou comportamento concorrente — mesmo quando o
  pedido falar apenas em "revisar", "validar", "code review", "está ok rodar
  paralelo?", "olha aqui esse `go func`", sem citar "concorrência" ou
  "race condition". Acione PROATIVAMENTE ao revisar qualquer rota migrada.
---

# Go Concurrency Review

PHP é *shared-nothing* por request: o código dentro de um request roda de cima para baixo, sem paralelismo, sem estado compartilhado entre handlers. Em Go, é tentador (e às vezes correto) usar `go func()`, `errgroup` e channels para acelerar. Mas concorrência nova **pode** mudar o comportamento observável: a ordem dos efeitos colaterais embaralha, um efeito síncrono vira fire-and-forget (ou o oposto), e estado compartilhado sem sincronização vira race.

Esta skill revisa o código Go da rota sob essa ótica. Concorrência só é aceitável se **não muda** o comportamento observável vs legado. Em AS-IS, o critério é estrito.

## Quando usar

- Em **toda** revisão de rota Go migrada de PHP — proativamente. Não espere o autor pedir.
- Quando aparecer um `go func()`, `errgroup.Go`, `sync.WaitGroup`, channel novo, ou paralelização de chamadas.
- Quando o `-race` reportar algo numa rota migrada.
- Quando uma chamada à API externa "saiu da request" (fire-and-forget).

## Quando NÃO usar

- Para verificar paridade ponta a ponta de resposta/banco/cache/API → use `go-parity-verification`.
- Para mapear status/shape/mensagem de erro do PHP para Go → use `php-to-go-error-mapping`.
- Para rotas Go puras (sem contraparte PHP). O critério vira o desenho do serviço, não o AS-IS — fora do escopo desta skill.

## Fluxo de trabalho

1. **Localize o handler Go** com `references/00-go-route-locating.md` e produza o bloco padronizado de call graph + fronteiras de I/O.
2. **Pegue a ordem de efeitos mapeada no legado** em `side-effects-mapping/05-ordering-and-transactions.md` e `side-effects-mapping/03-external-api-calls.md`. Essa é a **referência** contra a qual o Go será julgado.
3. **Identifique cada ponto de concorrência introduzida no Go** com `references/01-introduced-concurrency.md` (goroutines, errgroup, WaitGroup, channels, paralelização).
4. **Cheque estado compartilhado** com `references/02-shared-state-races.md` (maps concorrentes, closures capturando variáveis, slices compartilhados). Rode `-race`.
5. **Cheque ordem e modo dos efeitos** com `references/03-ordering-and-effects.md`: a ordem mapeada no PHP foi preservada? Algum efeito síncrono virou fire-and-forget ou o contrário?
6. **Cheque ciclo de vida** com `references/04-context-and-lifecycle.md`: `context` cancelado interrompendo efeitos no meio; goroutine pós-resposta sem recover/escopo; vazamento de goroutine; efeito crítico cancelado junto com a resposta quando no legado ele completava (`fastcgi_finish_request`, `register_shutdown_function`).
7. **Emita veredito por ponto**: seguro / altera semântica / corrigir, com recomendação acionável.
8. **Confirme `-race`** considerado e, idealmente, parte da suíte (paridade + race).
9. **Rode a auto-verificação**.

## Index das references

- **Localização da rota no Go** (call graph + fronteiras, com armadilhas específicas de goroutine pós-resposta) — abra ao começar a revisão. → `references/00-go-route-locating.md`
- **Concorrência introduzida no Go** (onde procurar; padrões `go func()`, `errgroup`, `sync.WaitGroup`, channels, paralelização de I/O que era serial no PHP) — abra para enumerar cada ponto de concorrência da rota. → `references/01-introduced-concurrency.md`
- **Estado compartilhado e races** (maps, slices, structs, closures capturando loop vars; padrões seguros; race detector e seus limites) — abra para cada ponto de concorrência que toca estado. → `references/02-shared-state-races.md`
- **Ordem e efeitos** (preservar a sequência mapeada; fire-and-forget que virou síncrono e o contrário; janelas de visibilidade) — abra ao comparar a ordem do Go com `side-effects-mapping`. → `references/03-ordering-and-effects.md`
- **Context e ciclo de vida** (`context` cancelado no meio; goroutine pós-resposta; vazamento; equivalência com `fastcgi_finish_request`/`register_shutdown_function`) — abra para qualquer goroutine que pode rodar depois da resposta ou ser cortada por cancelamento. → `references/04-context-and-lifecycle.md`

## Princípios

- **AS-IS é critério de aceitação.** Concorrência é aceitável **somente** se o comportamento observável continua igual ao legado: mesma resposta, mesmo estado pós-request, mesmas chamadas externas em mesma ordem.
- **Ordem de efeitos é contrato.** A sequência mapeada em `side-effects-mapping` define o que pode ou não rodar em paralelo. Reordenar `banco → API → cache` é mudar a semântica de falha.
- **Síncrono ≠ fire-and-forget.** Se o legado bloqueava esperando a API, o Go bloqueando preserva; o Go com `go func()` para "não esperar" muda o contrato observado pelo cliente (resposta sai sem confirmação).
- **Sem race detector, sem prova.** Toda revisão considera `-race`. Race detector é necessário, não suficiente — cubra cenários de carga real.
- **Estado compartilhado dentro do request é coisa de Go.** O PHP não tem; cada goroutine que vê o mesmo struct/map é uma decisão de design que o legado não tinha — trate cada uma como suspeita até prova de segurança.
- **Goroutine pós-resposta é poderosa e perigosa.** Em PHP existe o equivalente (`fastcgi_finish_request`, `register_shutdown_function`, `kernel.terminate`), mas com regras claras: aqui é fácil perder erros (não há catch), vazar (sem cancel) ou derrubar o processo (panic sem recover).

## Checklist de auto-verificação

- [ ] Bloco padronizado de `00-go-route-locating.md` produzido?
- [ ] Ordem de efeitos do legado importada de `side-effects-mapping/05` e usada como referência?
- [ ] Cada ponto de concorrência introduzida no Go listado (incluindo libs que paralelizam por baixo)?
- [ ] Para cada ponto: ordem dos efeitos preservada? modo (síncrono vs fire-and-forget) preservado?
- [ ] Estado compartilhado entre goroutines identificado e protegido (mutex/channel/cópia)? Closures capturando loop vars revistas?
- [ ] `go test -race` rodado e limpo na rota? Cenários adicionais que o race detector não cobre (lógica, ordem) cobertos por testes?
- [ ] Goroutines pós-resposta: têm `recover`? têm timeout/cancel próprio? logam erro? não dependem de `r.Context()` cancelado?
- [ ] Vazamento de goroutine descartado: cada goroutine tem critério claro de término?
- [ ] Veredito por ponto emitido (seguro / altera semântica / corrigir) com recomendação?
- [ ] Decisões "concorrência aceitável" justificadas com comparação observável vs legado, não com benchmark isolado?

## Formato de saída

Para cada rota:

```markdown
# Revisão de concorrência — <METHOD> <path>

Call graph Go: <link 00>
Ordem de efeitos do legado: <resumo / link side-effects-mapping/05>
`go test -race`: <executado | não executado> — resultado: <limpo / detectou em X>

## Pontos de concorrência
| # | Local | Tipo | Toca | Risco | Veredito | Recomendação |
|---|-------|------|------|-------|----------|--------------|
| 1 | service/onboarding.go:42 | go func pós-resposta | log + métrica | ciclo de vida (panic, context) | corrigir | adicionar recover; usar context independente |
| 2 | service/onboarding.go:58 | errgroup paraleliza 2 chamadas externas | API externa A e B | ordem de efeitos | altera semântica | serializar A→B (legado fazia serial) |
| 3 | handler.go:30 | channel para coletar resultados | nenhum estado externo | nenhum | seguro | manter |

## Estado compartilhado revisado
- <struct/var>: <proteção atual> → <ação>

## Goroutines pós-resposta
- <local>: <propósito> | recover? <s/n> | context: <r.Context() | context.Background() | derivado com timeout> | cancelamento garantido? <s/n>

## `-race` e cobertura
- Comando: `go test -race ./internal/onboarding/...`
- Cenários adicionais: <testes específicos para ordem de efeitos, fire-and-forget>
```
