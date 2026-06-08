# 06 — Harness de teste em Go

> O teste de paridade só convence quando ele é fácil de escrever, fácil de ler e robusto contra flakiness. Esta reference descreve a estrutura prática a usar — **adaptada à stack real do repositório**. Antes de seguir, leia o código existente: framework de teste, helpers de fixture e padrões já adotados pelo time vencem qualquer sugestão genérica daqui.

## Sumário

- [Detectar a stack do repositório](#detectar-a-stack-do-repositório)
- [Estrutura de diretórios de teste](#estrutura-de-diretórios-de-teste)
- [Table-driven test de paridade](#table-driven-test-de-paridade)
- [Injetando fakes de banco, cache e HTTP externo](#injetando-fakes-de-banco-cache-e-http-externo)
- [Controle de relógio, RNG e ordem](#controle-de-relógio-rng-e-ordem)
- [Esqueleto de teste ponta a ponta](#esqueleto-de-teste-ponta-a-ponta)
- [Boas práticas operacionais](#boas-práticas-operacionais)

---

## Detectar a stack do repositório

Antes de escrever qualquer linha, identifique:

- **Framework de teste**: stdlib `testing`, `testify` (`require`/`assert`/`suite`), `ginkgo`/`gomega`, `is`. Use o que o repositório já usa, não importe um novo.
- **Helpers de assertions**: deep diff (`go-cmp`, `pretty`, `testify`), JSON diff (`gojsondiff`), golden helpers (`goldie`).
- **Driver de banco**: `database/sql` puro, `sqlx`, `sqlc`, `pgx`, `gorm`, `ent`. Determine como o handler obtém a conexão (injeção, contexto, global) — isso define como o teste substitui.
- **Cliente de cache**: `go-redis/v9`, `gomodule/redigo`, `bradfitz/gomemcache`. Determine como é injetado.
- **HTTP client**: `http.Client` da stdlib injetado, client gerado (`oapi-codegen`), wrapper interno. Determine como apontar para `httptest.NewServer`.
- **Roteador**: ver `00-go-route-locating.md` — define como instanciar o handler para o teste.

Se a injeção não existe (clients criados dentro do handler), abra a discussão **antes** de tentar testar: o teste de paridade exige injeção. Refatorar a injeção é parte da migração, não desvio.

## Estrutura de diretórios de teste

Sugestão coerente com convenções comuns do Go (adapte ao real):

```
internal/onboarding/
├── handler.go
├── handler_test.go          # testes unitários do handler
└── parity_test.go           # testes de paridade (este arquivo)
testdata/
└── parity/
    └── onboarding/
        ├── case_new_user/
        │   ├── request.http
        │   ├── response.http
        │   ├── db.before.sql
        │   ├── db.after.sql
        │   ├── cache.before.json
        │   ├── cache.after.json
        │   ├── external.calls.json
        │   └── README.md
        ├── case_repeat_user/
        │   └── ...
        └── normalizers.go    # normalizadores justificados (ver 02)
```

Convencione um build tag (`//go:build parity`) para isolar os testes de paridade do `go test ./...` padrão quando eles dependerem de infra (Redis real, banco de teste). Em CI, rode com `-tags=parity`.

## Table-driven test de paridade

Padrão idiomático:

```go
func TestParityOnboarding(t *testing.T) {
    cases := loadParityCases(t, "testdata/parity/onboarding")
    for _, c := range cases {
        t.Run(c.Name, func(t *testing.T) {
            env := newParityEnv(t, c) // banco isolado, cache isolado, mock externo, clock fixo
            defer env.Close()

            // executa a rota Go com o request gravado
            resp := env.Do(c.Request)

            // compara as quatro dimensões
            assertResponseParity(t, resp, c.GoldenResponse, c.Normalizers)
            assertDBParity(t, env.DB, c.GoldenDBAfter, c.Normalizers)
            assertCacheParity(t, env.Cache, c.GoldenCacheAfter, c.Normalizers)
            assertExternalCallsParity(t, env.ExternalRecorder, c.GoldenExternalCalls, c.Normalizers)
        })
    }
}
```

Pontos importantes:

- `loadParityCases` lê o diretório de goldens; nada é hard-coded no teste.
- `newParityEnv` é o ponto único de construção do ambiente; ele encapsula isolamento e injeção. Mude lá quando a stack mudar.
- Cada assertion devolve diff legível (`go-cmp` com transformers, ou `gojsondiff` formatado).

## Injetando fakes de banco, cache e HTTP externo

Diretrizes (consistentes com `03-` e `04-`):

- **Banco**: prefira `go-txdb` ou transação por teste. Quando o handler abrir sua própria transação, use `txdb` (que envolve a conexão num scope global revertido).
- **Cache**: `miniredis.RunT(t)` (limpo automaticamente). Aponte o `redis.Client` do handler para o `miniredis.Addr()` via construtor/env injetada.
- **HTTP externo**: `httptest.NewServer` com handler que grava cada request e responde a partir de `external.calls.json` em modo replay. Aponte o `http.Client` ou o client gerado para a URL do server.
- **Logger/clock/uuid**: injete via construtor; em teste use `slog.New(slog.NewTextHandler(io.Discard))` ou um recorder, e clock/uuid determinísticos.

Se o repositório usa `wire`/`fx` para DI, configure um provider de teste; se usa construtores manuais, faça um helper `newHandlerForParity`.

## Controle de relógio, RNG e ordem

Determinismo é pré-requisito para paridade. Forneça:

- **Clock**: interface `Clock { Now() time.Time }` injetada. Em teste, use `FixedClock{T: parseTime(case.ClockISO)}`.
- **RNG**: para `uuid`/`rand`, injete um gerador determinístico (semente do caso). Sem isso, normalize o campo (mas é melhor controlar).
- **Ordem de iteração**: maps em Go iteram em ordem aleatória; se a rota itera um map para gerar a resposta/queries, isso é fonte de flakiness. Use slices ordenados ou `sort` explícito.
- **Ordem de queries**: drivers tipicamente fazem `INSERT` na ordem chamada; preserve isso no teste.

## Esqueleto de teste ponta a ponta

```go
//go:build parity
// +build parity

package onboarding_test

import (
    "context"
    "net/http/httptest"
    "testing"

    "github.com/alicebob/miniredis/v2"
    "github.com/stretchr/testify/require"
    // ajuste imports ao real
)

func TestParityOnboarding(t *testing.T) {
    cases := loadParityCases(t, "testdata/parity/onboarding")

    for _, c := range cases {
        c := c
        t.Run(c.Name, func(t *testing.T) {
            t.Parallel() // só se cada caso usa banco/cache isolados

            ctx := context.Background()

            db := openTxDB(t, c.GoldenDBBefore)        // ver 03
            defer db.Close()

            cache := miniredis.RunT(t)                  // ver 04
            seedCache(t, cache, c.GoldenCacheBefore)

            externalServer, recorder := newReplayServer(t, c.GoldenExternalCalls) // ver 05
            defer externalServer.Close()

            clock := fixedClock(c.ClockISO)
            uuidGen := seededUUIDGen(c.UUIDSeed)

            h := newHandlerForParity(db, redisClient(cache), httpClientFor(externalServer), clock, uuidGen)

            rr := httptest.NewRecorder()
            req := c.Request.Build(ctx)
            h.ServeHTTP(rr, req)

            assertResponseParity(t, rr.Result(), c.GoldenResponse, c.Normalizers)
            assertDBParity(t, db, c.GoldenDBAfter, c.Normalizers)
            assertCacheParity(t, cache, c.GoldenCacheAfter, c.Normalizers)
            assertExternalCallsParity(t, recorder.Calls(), c.GoldenExternalCalls, c.Normalizers)
        })
    }
}
```

Adapte aos padrões reais (testify, ginkgo, helpers do projeto, DI específica). O esqueleto serve para validar que **todos** os blocos estão presentes; trate-o como checklist, não como código a copiar literalmente.

## Boas práticas operacionais

- **Falha clara**: ao falhar uma assertion, o output precisa conter o caso, a dimensão, e o trecho específico que divergiu. Use `t.Errorf` com diff formatado.
- **`-update-goldens`**: flag para regravação intencional; o teste **escreve** o golden quando ligado e **lê** quando desligado. PRs com goldens regravados precisam de aprovação manual.
- **`-race`**: rode os testes de paridade com race detector ligado por padrão. A Skill C usa o mesmo.
- **Sem rede externa**: o teste de paridade não acessa a API real, nem o Redis/banco de produção. Use somente fakes/replays e o harness do projeto.
- **Sem Docker ativo**: nenhum teste deve chamar `docker run`. Use `miniredis`/`txdb`/`embedded-postgres` ou o harness pré-existente.
- **Determinismo em CI**: confirme que dois runs consecutivos do mesmo commit produzem o mesmo resultado. Flakiness é bug do harness, não "natureza dos testes".
