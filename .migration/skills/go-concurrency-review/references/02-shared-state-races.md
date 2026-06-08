# 02 — Estado compartilhado e race conditions

> Em Go, basta duas goroutines tocarem o mesmo dado sem sincronização para a corrida começar. Mapas concorrentes provocam **panic** (`fatal error: concurrent map writes`). Slices/structs corrompem silenciosamente. Esta reference cobre onde procurar, como proteger, e os limites do race detector.

## Sumário

- [Padrões de estado compartilhado dentro de um request](#padrões-de-estado-compartilhado-dentro-de-um-request)
- [Closures capturando variáveis de loop](#closures-capturando-variáveis-de-loop)
- [Mapas e o panic de "concurrent map writes"](#mapas-e-o-panic-de-concurrent-map-writes)
- [Slices, structs e pseudo-imutabilidade](#slices-structs-e-pseudo-imutabilidade)
- [Padrões seguros](#padrões-seguros)
- [Race detector: o que cobre e o que não cobre](#race-detector-o-que-cobre-e-o-que-não-cobre)
- [Saída esperada](#saída-esperada)

---

## Padrões de estado compartilhado dentro de um request

PHP não tem isso. Em Go, surge quando:

- Uma struct do handler é capturada por closures em `go func()` e o handler também a usa.
- Goroutines em `errgroup.Go` escrevem em um `map`/`slice` compartilhado para "agregar resultados".
- Um campo de log/context é mutado depois que goroutines já o leram.
- Buffers de resposta acessados em paralelo (anti-padrão).
- Variáveis de pacote (singletons, caches) modificadas durante o request.

Liste cada acesso a estado fora da goroutine que o criou. Se o estado é só lido (após criação e antes da goroutine iniciar), pode ser seguro; se é mutado, precisa de proteção.

## Closures capturando variáveis de loop

Armadilha clássica:

```go
for _, item := range items {
    go func() {
        process(item)        // captura a variável `item` por referência
    }()
}
```

Em Go ≤ 1.21, `item` é compartilhada entre iterações; goroutines podem ver todas com o último valor. Em Go ≥ 1.22, o `for` cria nova variável por iteração — comportamento mudou.

**Verifique a versão do Go do repositório** (`go.mod` `go 1.x`). Em <1.22, sempre passe explicitamente:

```go
for _, item := range items {
    item := item // shadow
    go func() {
        process(item)
    }()
}
```

Ou:

```go
for _, item := range items {
    go func(item Item) {
        process(item)
    }(item)
}
```

Mesma armadilha com `errgroup.Go`. Race detector geralmente pega, mas não sempre — depende do tempo de execução.

## Mapas e o panic de "concurrent map writes"

Map em Go **não** é thread-safe. Escrita concorrente derruba o processo. Padrões a proteger:

- Dois `go func()` escrevendo no mesmo `map[string]any` de agregação.
- Cache local de request (`requestScope := map[string]any{}`) acessado em paralelo.
- Logger que mantém map de fields e é chamado de várias goroutines.

Opções: `sync.RWMutex` ao redor, `sync.Map` (raramente o melhor — API estranha, ganho real só em alguns padrões), ou agregar por canal e escrever em um único lugar.

## Slices, structs e pseudo-imutabilidade

- **Slices** são views sobre arrays; passar slice para goroutine **compartilha** o array subjacente. Escrita concorrente corrompe sem panic, só com dados errados.
- **Structs grandes** passadas por ponteiro são compartilhadas; copiar por valor isola, mas pode ser caro.
- **`strings` são imutáveis** em Go — leitura concorrente é segura. `[]byte` não.
- **Atomic pointers** (`atomic.Pointer[T]` em Go 1.19+) substituem mutex em padrões "swap inteiro de struct".

## Padrões seguros

- **Confinamento**: dado vive em uma goroutine só; comunicação por channel.
- **Imutabilidade após hand-off**: criar dado, congelar (não mutar mais), só então passar a goroutines.
- **Mutex**: simples, claro, suficiente para a maioria dos casos. `sync.RWMutex` quando há muito mais leitura.
- **`sync.Once`** para inicialização única (cuidado: a "única vez" pode ser por processo, não por request).
- **Atomic** para counters e flags. Não para structs complexas (use mutex).
- **`errgroup.WithContext`** para fan-out com cancelamento — mas isso não trata estado compartilhado, só ciclo de vida.

## Race detector: o que cobre e o que não cobre

`go test -race ./...` instrumenta acessos e detecta corridas observadas durante a execução. Limites importantes:

- **Cobre o que executou**: races em caminhos não cobertos por teste passam despercebidos. Aumentar cobertura é parte da defesa.
- **Não cobre lógica**: ordem de efeitos correta logicamente mas problemática semanticamente (ex.: API antes do banco) **não** é race; é drift de ordem (ver `03-ordering-and-effects.md`).
- **Não cobre deadlocks** que evitam a corrida acontecer.
- **Custo**: 5x-10x slowdown e mais memória. Aceitável em CI, não em produção.
- **Falsos negativos** em algumas combinações de barreiras/atomic.
- **Falsos positivos** raros, geralmente quando código usa unsafe ou padrões exóticos.

Rode `-race`:

- Em **toda** suíte de testes da rota.
- Idealmente em testes de paridade (ver `go-parity-verification/06-test-harness-go.md`) para combinar carga real com instrumentação.
- Em fuzz tests quando aplicáveis.

## Saída esperada

Para cada estado compartilhado revisado:

```markdown
### S1 — `internal/onboarding/service.go:74` — `results map[string]Answer`
- Acesso 1: goroutine A escreve para chave "ext_api"
- Acesso 2: goroutine B escreve para chave "db_read"
- Sincronização atual: nenhuma
- Risco: panic de concurrent map writes
- Recomendação: agregar por channel; escrever no map fora das goroutines
- `-race` detectou? sim

### S2 — `internal/onboarding/service.go:90` — slice `items`
- ...
```
