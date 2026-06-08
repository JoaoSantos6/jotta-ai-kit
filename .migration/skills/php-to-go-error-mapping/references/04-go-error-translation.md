# 04 — Tradução idiomática para Go (preservando o contrato)

> Em Go, "tratar erro bem" sem cuidado tende a "consertar" silenciosamente o legado: o linter empurra para `4xx`, a regra de SonarQube quer mensagens "úteis", o middleware de erro padrão monta um shape que não bate. Esta reference dá padrões idiomáticos Go que **preservam** o contrato, com instruções explícitas para suprimir o que precisa ser suprimido.

## Sumário

- [Sentinel errors e tipos de erro de domínio](#sentinel-errors-e-tipos-de-erro-de-domínio)
- [`errors.Is` / `errors.As` para classificar](#errorsis--errorsas-para-classificar)
- [Wrap com contexto sem perder identidade](#wrap-com-contexto-sem-perder-identidade)
- [Middleware/handler de erro que monta o shape do legado](#middlewarehandler-de-erro-que-monta-o-shape-do-legado)
- [Mapa caminho→resposta como tabela](#mapa-caminho→resposta-como-tabela)
- [Como manter "200 OK com erro no corpo"](#como-manter-200-ok-com-erro-no-corpo)
- [`panic`/`recover`: quando e como](#panicrecover-quando-e-como)
- [Tabela caminho-de-erro PHP → resposta Go esperada](#tabela-caminho-de-erro-php--resposta-go-esperada)

---

## Sentinel errors e tipos de erro de domínio

Cada caminho de erro do legado vira um **erro identificável** em Go:

```go
package onboardingerr

import "errors"

var (
    ErrInvalidAnswer   = errors.New("Resposta inválida")
    ErrAlreadyAnswered = errors.New("Usuário já cadastrado")
    ErrUpstreamTimeout = errors.New("Falha ao integrar")
)
```

Para erros que carregam dados (campo, código), use tipo struct:

```go
type ValidationError struct {
    FieldErrors map[string][]string
}

func (e *ValidationError) Error() string { return "Dados inválidos" }
```

Notas:

- O texto da `errors.New` é a **mensagem literal** que o middleware vai emitir. Já é o catálogo do `02-error-message-catalog.md`.
- Mantenha o pacote `errors` do domínio próximo do código que produz o erro, ou centralize em `internal/errors` se servir várias rotas.

## `errors.Is` / `errors.As` para classificar

No middleware/handler, use `errors.Is` para sentinels e `errors.As` para tipos:

```go
switch {
case errors.Is(err, onboardingerr.ErrInvalidAnswer):
    writeOK200WithBody(w, errorBody{OK: false, Message: err.Error()})
case errors.As(err, &vErr):
    writeJSON(w, 422, errorBody{OK: false, Errors: vErr.FieldErrors, Message: "Dados inválidos"})
case errors.Is(err, onboardingerr.ErrUpstreamTimeout):
    writeJSON(w, 502, errorBody{OK: false, Message: err.Error()})
default:
    writeJSON(w, 500, errorBody{OK: false, Message: "Internal Server Error"})
}
```

Padrão central: a decisão de **status + shape + mensagem** vive em **um** lugar, alinhado com o legado. Espalhar por cada handler garante drift.

## Wrap com contexto sem perder identidade

Para adicionar contexto sem perder a identidade do erro original:

```go
if err := repo.Save(ctx, x); err != nil {
    return fmt.Errorf("save onboarding: %w", err)
}
```

`%w` preserva a cadeia; `errors.Is/As` continuam funcionando. **Não** use `%v` em caminho de erro de domínio — apaga a identidade e o middleware decide errado.

Para emitir mensagem literal do contrato com causa interna no log (mas não na resposta):

```go
return fmt.Errorf("%w: %v", onboardingerr.ErrUpstreamTimeout, err)
```

A mensagem visível no `Error()` ainda vai trazer "Falha ao integrar: <detalhe>". Se o cliente casa só "Falha ao integrar", isso quebra. Nesse caso:

- O `error` interno carrega detalhe (`fmt.Errorf("upstream: %w", err)`).
- O middleware, ao classificar com `errors.Is`, **emite a mensagem do sentinel literal**, sem concatenar o detalhe. Mantém o contrato.

## Middleware/handler de erro que monta o shape do legado

Concentre a tradução em um único componente:

```go
func ErrorMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        rw := &recordingWriter{ResponseWriter: w}
        next.ServeHTTP(rw, r)
        if rw.err != nil {
            translate(rw, rw.err)
        }
    })
}

func translate(w http.ResponseWriter, err error) {
    // mesma estrutura switch acima
}
```

Variantes por framework:

- **chi/echo/gin**: middleware ou `HTTPErrorHandler` específico. No echo, custom `e.HTTPErrorHandler` substitui o default que sempre emite `{"message": ...}`.
- **gRPC/Connect**: `interceptor` que traduz `error` em `status.Error(codes.X, msg)`. Idempotente: aceitar `connect.Error` já formado.
- **Handlers que retornam `error`**: padrão `func(w, r) error` (chi/echo aceitam); o wrapper traduz.

## Mapa caminho→resposta como tabela

Não codifique a tradução por opinião — codifique a partir da tabela do `SKILL.md`:

```go
// internal/onboarding/errormap.go
type errorResponse struct {
    Status  int
    Body    func(err error) any
    Headers map[string]string
}

var errorMap = []struct {
    Match func(error) bool
    Resp  errorResponse
}{
    {Match: func(e error) bool { return errors.Is(e, onboardingerr.ErrInvalidAnswer) },
     Resp:  errorResponse{Status: 200, Body: func(e error) any { return errorBody{OK: false, Message: e.Error()} }}},
    // ...
}
```

Vantagens:

- Adicionar/mudar tradução vira diff numa única tabela.
- Teste fácil: iterar a tabela com goldens e verificar status/shape/mensagem.
- A tabela é o documento. PR é uma linha.

## Como manter "200 OK com erro no corpo"

Quando o legado emite `200` para erro de domínio, e o linter/SonarQube pressiona `4xx`:

- Comentário e supressão local:

  ```go
  // AS-IS: legado responde 200 com erro no corpo (ver migration brief / mapa de erros).
  // Mudar para 4xx quebra clientes que casam por status==200.
  //nolint:bodyclose,errcheck // ajuste por regra real
  w.WriteHeader(http.StatusOK)
  ```

- Suppressões em `.golangci.yml` quando a regra é estrutural (ex.: regras que casam "endpoints que emitem erro precisam ser 4xx"). Documente cada exclusão.

- **Não** use o middleware genérico de framework que sempre traduz erro para `4xx`/`5xx`. Construa o seu, que respeita a tabela.

- Para SonarQube: adicione a justificativa na PR e marque como "won't fix" quando se justificar. Não esconda; documente.

## `panic`/`recover`: quando e como

- **Não** use `panic` para sinalizar erro de domínio. `panic` é para inconsistências do programa (nil deref de algo que jamais deveria ser nil).
- **Sempre** tenha um `recover` no middleware de recovery (ou use o do framework) para que panics virem `500` com mensagem genérica (ou a mesma do legado em caso de exception não tratada).
- O `recover` precisa logar **stack trace** e o caminho original para diagnose.

Equivalência aproximada: exception não tratada em PHP → resposta default do handler global. Em Go: panic → resposta do middleware de recovery. Configure o middleware para emitir exatamente o que o legado emitia (status + shape + mensagem).

## Tabela caminho-de-erro PHP → resposta Go esperada

Modelo de tabela final por rota (forma curta):

```markdown
| # | PHP — caminho | PHP — resposta | Go — sentinel/tipo | Go — resposta |
|---|---------------|----------------|--------------------|---------------|
| 1 | ValidationException | 422, {ok:false, errors, message} | *ValidationError | 422, mesmo shape |
| 2 | repo->find()==null & handler segue | 200, {ok:false, message:"Não encontrado"} | ErrNotFound (sentinel) | 200, mesmo shape, mensagem literal |
| 3 | PDOException | 500, {error:"Internal Server Error"} | qualquer erro não classificado | 500, mesmo shape e mensagem |
| 4 | API timeout (catch GuzzleException) | 502, {ok:false, message:"Falha ao integrar"} | ErrUpstreamTimeout (sentinel) | 502, mesmo shape |
| 5 | `@file_get_contents` retorna false, default vazio | 200, default | `_, _ := ...`; sentinel só se default não cobre | 200, default |
```

Anexe esta tabela como artefato da skill no diretório do serviço (ex.: `docs/migration/onboarding-error-map.md`) — ela é o contrato vivo entre legado e Go.
