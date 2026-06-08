# 01 — Concorrência introduzida no Go

> O legado PHP é sequencial dentro de cada request. Qualquer concorrência no Go é **introduzida**: alguém escreveu `go func()`, `errgroup.Go`, `sync.WaitGroup`, paralelizou um loop. Esta reference cobre onde procurar e a primeira pergunta a fazer em cada caso: isso muda a ordem dos efeitos ou cria não-determinismo na resposta?

## Sumário

- [Onde procurar concorrência no código Go](#onde-procurar-concorrência-no-código-go)
- [Padrões mais comuns](#padrões-mais-comuns)
- [Concorrência "escondida" em bibliotecas](#concorrência-escondida-em-bibliotecas)
- [Pergunta-mestra por ponto](#pergunta-mestra-por-ponto)
- [Catalogar pontos](#catalogar-pontos)

---

## Onde procurar concorrência no código Go

Grep direto, escopado ao subtree do handler e suas dependências (a partir do call graph de `00-go-route-locating.md`):

```bash
# goroutines explícitas
grep -rn "go func\|go [a-zA-Z]\+(" --include="*.go" internal/<rota>/

# pacotes/syncs
grep -rn "errgroup\|sync.WaitGroup\|sync.Mutex\|sync.RWMutex\|sync.Once\|sync.Map\|atomic\." --include="*.go"

# channels
grep -rn "make(chan\|<-chan\|chan<-" --include="*.go"

# context cancel/timeout que afetam comportamento
grep -rn "context.WithCancel\|context.WithTimeout\|context.WithDeadline" --include="*.go"
```

Reveja **todos** os hits dentro do call graph da rota. Não dependa de comentários "// async" — eles mentem.

## Padrões mais comuns

- **`go func() { ... }()` solto no handler**: dispara trabalho em paralelo e o handler segue. Tipicamente para "não bloquear" a resposta. Risco principal: ciclo de vida e ordem (ver `04-context-and-lifecycle.md` e `03-ordering-and-effects.md`).
- **`errgroup.Group`**: paraleliza múltiplas chamadas, espera todas, propaga erro. Comum para "buscar dois recursos ao mesmo tempo". Risco: o legado fazia serial; paralelizar muda ordem de chamadas externas (visível em `external.calls.json`).
- **`sync.WaitGroup`**: igual a `errgroup` mais cru, sem propagação de erro. Risco adicional: erros perdidos.
- **`channels`**: comunicação entre goroutines. Risco: deadlock, fan-in/fan-out alterando ordem, leak quando ninguém lê.
- **`sync.Once`**: inicialização única. Risco: se a "única" depende de algo do request, o primeiro request decide para todos.
- **`pipeline` por canal**: producer/consumer entre stages. Risco: a ordem do output depende de timing.
- **`worker pool`**: pool de goroutines processando uma fila. Risco: a fila precisa ser drenada antes da resposta para preservar AS-IS.
- **`sync.Map`/`atomic.Value`**: estado compartilhado por design. Confirme se o estado existia no legado (raríssimo) ou foi introduzido.

## Concorrência "escondida" em bibliotecas

Algumas libs paralelizam por debaixo dos panos. Suspeitas comuns:

- **HTTP clients com `MaxIdleConnsPerHost > 1`** e múltiplas chamadas dentro do mesmo handler: a stdlib mantém connections, mas as chamadas em si são na ordem em que o código pede. Não muda ordem, exceto se o código pede em goroutine.
- **gRPC clients**: streams podem entregar mensagens fora de ordem se o handler usa goroutines de leitura.
- **ORMs com batch async** (raros em Go) — verifique.
- **Caches com refresh em background** (ex.: `singleflight` + refresh): leitura "sincrona" pode disparar trabalho em goroutine. Pode ser desejado, mas confirme.
- **Workers iniciados em `init()`** que processam tarefas globais — não pertencem à rota, mas podem ser disparados por ela.
- **OpenTelemetry/tracing exporters**: enviam spans em background. Comportamento aceitável, mas confirme que não bloqueia ou perde span em panic.

Não confie em "mas eu não chamei `go`". Verifique cada dep importante.

## Pergunta-mestra por ponto

Para cada ponto de concorrência encontrado, responda:

1. **Qual fronteira de I/O esse ponto toca?** (banco-leitura, banco-escrita, cache, API externa, log, fila)
2. **A mesma fronteira existe no call graph PHP?** Se sim, em que ordem com as outras?
3. **A concorrência muda a ordem de efeitos** observada no legado? (referência: `side-effects-mapping/05-ordering-and-transactions.md`)
4. **A concorrência introduz não-determinismo na resposta** (campos cuja ordem/conteúdo depende de qual goroutine terminou primeiro)?
5. **O ponto compartilha estado entre goroutines** (ou com o handler)? Se sim, está protegido?
6. **O ponto sobrevive ao retorno do handler**? Em que `context`? Com que critério de término?

Se a resposta a (3) ou (4) for "sim" sem decisão explícita, é candidato a *altera semântica*. Se (5) sem proteção, é candidato a *race*. Se (6) sem critério, é candidato a *vazamento*.

## Catalogar pontos

Saída esperada (alimenta a tabela do `SKILL.md`):

```markdown
## Concorrência introduzida — <METHOD> <path>

### Ponto C1 — `internal/onboarding/service.go:42`
- Tipo: `go func()` solta
- Trecho:
  ```go
  go func() {
      audit.Log(ctx, "onboarding completed", user.ID)
  }()
  ```
- Toca: log
- Equivalente no PHP: `Log::info(...)` síncrono dentro do handler
- Muda ordem de efeitos? Sim: no PHP o log acontece antes do retorno; no Go pode ocorrer depois (ou ser cancelado).
- Não-determinismo na resposta? Não (log não entra na resposta).
- Estado compartilhado? `ctx` (escopo do request); `user.ID` (cópia segura).
- Ciclo de vida? `ctx` é `r.Context()` — pode estar cancelado quando o log tentar gravar. Sem recover.

### Ponto C2 — `internal/onboarding/service.go:58`
- Tipo: `errgroup` paraleliza duas chamadas à API externa
- ...
```
