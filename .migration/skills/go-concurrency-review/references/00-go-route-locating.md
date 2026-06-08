# 00 — Localização da rota no serviço Go

> **Reference compartilhada.** Este arquivo é **idêntico** nas skills `go-parity-verification`, `php-to-go-error-mapping` e `go-concurrency-review`. Objetivo: localizar o handler Go equivalente à rota PHP legada e mapear todas as suas fronteiras de I/O, produzindo o bloco padronizado que as três skills consomem. Espelha o que `00-route-tracing.md` faz do lado do legado.

## Sumário

- [Quando ler este arquivo](#quando-ler-este-arquivo)
- [Passo 1 — Localizar o registro da rota](#passo-1--localizar-o-registro-da-rota)
- [Passo 2 — Seguir o call graph do handler](#passo-2--seguir-o-call-graph-do-handler)
- [Passo 3 — Marcar fronteiras de I/O](#passo-3--marcar-fronteiras-de-io)
- [Passo 4 — Correlacionar com a rota PHP equivalente](#passo-4--correlacionar-com-a-rota-php-equivalente)
- [Armadilhas específicas do Go](#armadilhas-específicas-do-go)
- [Padrões por framework de roteamento](#padrões-por-framework-de-roteamento)
- [Bloco de saída padronizado](#bloco-de-saída-padronizado)

---

## Quando ler este arquivo

Leia no **início** de qualquer uma das três skills, antes de comparar paridade, traduzir erros ou revisar concorrência. Sem o call graph e a lista de fronteiras de I/O do Go, você está adivinhando. Pare de ler quando tiver o bloco padronizado preenchido — o resto da skill parte daí.

## Passo 1 — Localizar o registro da rota

Detecte primeiro qual roteador o serviço usa. **Não assuma** uma biblioteca: leia a stack real do repositório. Procure por:

- `net/http`: chamadas a `http.HandleFunc`, `http.NewServeMux`, `mux.Handle("METHOD path", ...)` em Go 1.22+.
- `chi`: `r.Get/Post/...`, `r.Route(...)`, `r.Mount(...)` em arquivos como `cmd/<svc>/router.go` ou `internal/http/router.go`.
- `gin`: `engine.GET/POST/...`, `engine.Group(...)`.
- `echo`: `e.GET/POST/...`, `e.Group(...)`.
- `fiber`: `app.Get/Post/...`.
- `gorilla/mux`: `r.HandleFunc(...).Methods("POST")`.
- Geradores (`oapi-codegen`, `buf`/`connect`, `protoc-gen-go-grpc`): a rota pode ser declarada por contrato e ligada via `RegisterHandlers`.

Comandos úteis (ajuste ao layout do projeto):

```bash
# encontrar o registro da rota (ajuste a substring conforme o path do legado)
grep -rn "onboarding" --include="*.go" cmd/ internal/ pkg/
# encontrar o handler por assinatura
grep -rn "func .*Handler\|func .*Handle(\|http\.HandlerFunc" --include="*.go"
```

Mapeie **método HTTP + path → handler concreto** (função, método de struct, ou closure). Anote todos os middlewares/interceptors que rodam antes do handler (auth, recover, request-id, logger, rate limit, body limit, decoder). Eles fazem parte do comportamento observável e podem injetar headers, abortar com status próprio ou alterar o contexto — tudo isso é AS-IS.

## Passo 2 — Seguir o call graph do handler

A partir do handler, siga **cada chamada** até a fronteira de I/O. Em Go a indireção é mais explícita que em PHP, mas existe:

- Métodos do próprio handler/controller.
- Services, use-cases, repositories, gateways/clients, mappers.
- Funções de pacote (`pkg.Foo(...)`) — fáceis de perder de vista.
- Closures passadas a `errgroup.Go`, `sync.WaitGroup`, `go func()`.
- Hooks de framework (middlewares do echo/chi/gin) que rodam **após** o handler (logging, métricas, recovery) — também são efeitos.

Construa a árvore: para cada nó registre arquivo, `pkg.Tipo.Método`, e o que recebe/retorna. Pare de descer quando chegar a:

- Uma fronteira de I/O (banco, cache, HTTP externo, fila/mensageria, log, filesystem).
- Código puro (transformação/cálculo) — anote, mas não aprofunde.

## Passo 3 — Marcar fronteiras de I/O

Toda chamada que cruza o processo é uma **fronteira**. Em Go, os sinais variam por driver:

| Tipo | Sinais comuns no código Go |
|------|----------------------------|
| Banco (leitura) | `db.Query/QueryRow/QueryContext`, `sqlx.Select/Get`, `sqlc.Queries`, `gorm.First/Find`, `ent.Client.Query`, `pgx.Query` |
| Banco (escrita) | `db.Exec/ExecContext`, `sqlx.NamedExec`, `sqlc.Queries.Create*/Update*/Delete*`, `gorm.Create/Save/Updates/Delete`, `pgx.Exec` |
| Cache | `redis.Client.Get/Set/Del`, `go-redis/v9`, `bigcache`, `groupcache`, `ristretto` |
| HTTP externo | `http.Client.Do`, `req.Get/Post`, clients gerados (`oapi-codegen`), gRPC clients |
| Fila / mensageria | `kafka.Writer.WriteMessages`, `nats.Publish`, `rabbitmq Publish`, `pubsub.Publish`, `sqs.SendMessage` |
| Log | `log/slog`, `zerolog`, `zap`, `logrus`, `log.Printf` |
| Filesystem | `os.OpenFile`, `os.WriteFile`, blob clients (`s3`, `gcs`) |

Cada fronteira vira entrada nas skills consumidoras.

## Passo 4 — Correlacionar com a rota PHP equivalente

A migração é AS-IS sobre o **mesmo banco, mesmo cache e mesma API externa**. Cada fronteira do Go deve corresponder a uma fronteira do PHP. Para cada item da lista do Go:

- Aponte o item correspondente do call graph PHP (saída de `00-route-tracing.md` do legado).
- Marque divergências de cardinalidade: fronteiras a mais ou a menos no Go.
- Marque divergências de **modo**: o PHP chamava síncrono e o Go virou `go func()`? O PHP usava efeito pós-resposta (`fastcgi_finish_request`, `register_shutdown_function`, `kernel.terminate`) e o Go usa goroutine? Isso é insumo direto da Skill C (`go-concurrency-review`).

Se não encontrar a rota equivalente em PHP, **pare e peça o handoff de fluxo de dados antes de seguir**. Comparar paridade, traduzir erro ou revisar concorrência sem a contraparte legada é trabalho cego.

## Armadilhas específicas do Go

- **Goroutines pós-resposta.** `go func(){...}()` disparado dentro do handler para "não bloquear" a resposta. Equivalente conceitual aos efeitos pós-resposta do PHP, mas com semântica diferente: o `context` da request pode já ter sido cancelado, o `request body` pode ter sido fechado, e o panic na goroutine **derruba o processo** se não houver recover. Marque cada uma.
- **`defer` mudando ordem de efeitos.** `defer client.Close()` ou `defer tx.Rollback()` movem trabalho para o fim da função; isso já é I/O e entra na lista de fronteiras.
- **`context` cancelado no meio.** Se a request foi cancelada, drivers de banco e clients HTTP retornam erro sem completar — comportamento que não existe no PHP equivalente síncrono.
- **Middlewares que escrevem a resposta.** Middlewares de erro/recovery podem sobrescrever status/corpo após o handler retornar. O contrato observável pode vir do middleware, não do handler.
- **`init()` e variáveis de pacote.** Conexões/clients criados em `init()` ou `var x = ...` carregam estado entre requests, semelhante a singletons do PHP — não confunda com escopo por request.
- **Roteador "match-everything".** Handlers default (`mux.HandleFunc("/", ...)`) podem capturar paths inesperados. Confirme que a rota investigada é a que de fato responde.

## Padrões por framework de roteamento

- **`net/http` (stdlib, Go 1.22+):** `mux.HandleFunc("POST /onboarding/{id}", ...)`. Middlewares são wrappers manuais: `mux.Handle("...", recover(logger(auth(handler))))`.
- **`chi`:** rotas e grupos em `Routes()`. Middlewares com `r.Use(...)`. Cuidado com `r.Mount("/api", subrouter)`.
- **`gin`:** `RouterGroup` com middlewares por grupo. `c.Next()`/`c.Abort()` controlam o pipeline; abortar não impede defers no handler atual.
- **`echo`:** middlewares globais e por grupo; `c.Error(err)` aciona o `HTTPErrorHandler` configurado — fonte comum de divergência de status.
- **`fiber`:** baseado em fasthttp; comportamento de body/headers difere sutilmente de `net/http`. Não assuma equivalência byte a byte com PHP sem verificar.
- **gRPC/Connect/Twirp:** interceptors fazem o papel de middlewares; conversões para HTTP/JSON podem reescrever o erro.
- **Geradores de servidor (oapi-codegen, kin-openapi):** o handler real é uma implementação de interface; o roteador é gerado. Localize a interface e a struct que a implementa.

## Bloco de saída padronizado

Produza este bloco e salve. As três skills referenciam por link/resumo em vez de re-rastrear.

```markdown
## Call graph Go — <METHOD> <path>

Rota equivalente PHP: <METHOD> <path>  (call graph PHP: <link/resumo de 00-route-tracing>)

Framework de roteamento detectado: <net/http | chi | gin | echo | fiber | grpc | outro>
Entrypoint: <pacote>.<Tipo>.<Método>  (arquivo: <caminho>:<linha>)
Middlewares/interceptors antes do handler: <lista ou "nenhum">
Middlewares depois do handler (escrevem resposta/erro): <lista ou "nenhum">

Árvore de chamadas (resumida):
- Handler.Onboarding
  - Service.Process
    - Repository.Save              [I/O: banco-escrita]
    - Cache.Forget(key)            [I/O: cache]
  - ExternalClient.Send            [I/O: http-externo]
  - go func(){ Audit.Log(...) }    [I/O: log — pós-resposta, em goroutine]
- ErrorMiddleware.Map               [pode reescrever status/corpo]

Fronteiras de I/O encontradas:
1. banco-escrita — Repository.Save — tabela X — driver: <sqlc|sqlx|gorm|pgx|...>
2. cache — Cache.Forget — chave Y — client: <go-redis|...>
3. http-externo — ExternalClient.Send — endpoint Z — client: <http.Client|gerado|...>
4. log — Audit.Log — modo: goroutine pós-resposta (sinalizar para go-concurrency-review)

Correlação com o PHP:
| Fronteira Go         | Fronteira PHP equivalente | Divergência |
|----------------------|---------------------------|-------------|
| Repository.Save      | OnboardingModel::save     | nenhuma     |
| Cache.Forget         | Cache::forget             | nenhuma     |
| ExternalClient.Send  | curl_exec em ApiClient    | nenhuma     |
| Audit.Log (goroutine)| Log::info síncrono        | modo mudou  |
```

Esse bloco é insumo:

- da Skill A (`go-parity-verification`) para saber **o que** comparar dimensão a dimensão (resposta, banco, cache, API);
- da Skill B (`php-to-go-error-mapping`) para enumerar **todos os caminhos** que podem produzir erro/status;
- da Skill C (`go-concurrency-review`) para isolar **pontos de concorrência introduzida** sobre a ordem de efeitos do legado.
