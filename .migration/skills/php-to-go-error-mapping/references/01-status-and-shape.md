# 01 — Status HTTP, headers e shape do corpo de erro

> O contrato de erro tem três peças: **status code**, **headers** e o **shape** (envelope, nomes, tipos) do corpo. Aqui é onde clientes do legado quebram primeiro, especialmente parsers automáticos. Esta reference cobre como capturar cada peça do legado e como representá-la em Go preservando o formato.

## Sumário

- [Capturar status por caminho](#capturar-status-por-caminho)
- [Headers relevantes para erro](#headers-relevantes-para-erro)
- [Shape do corpo: envelope, nomes, tipos](#shape-do-corpo-envelope-nomes-tipos)
- ["200 OK com erro no corpo"](#200-ok-com-erro-no-corpo)
- [Códigos não convencionais (419, 422, 423, 451, 0...)](#códigos-não-convencionais-419-422-423-451-0)
- [Representar o shape em Go](#representar-o-shape-em-go)
- [Saída esperada](#saída-esperada)

---

## Capturar status por caminho

Para cada caminho de erro identificado (cruzamento de `side-effects-mapping` + `php-quirks-capture/06`):

- Provoque o caminho no legado em ambiente controlado.
- Grave a resposta completa (cabeçalho de status + headers + body) — o golden de `go-parity-verification/01-golden-capture.md` já faz isso.
- Confirme se o status vem do framework, de exception handler global, de `http_response_code($n)` manual, ou de um middleware. A **fonte** importa: se vier do framework, o equivalente Go pode estar em outro lugar.

## Headers relevantes para erro

- `Content-Type` da resposta de erro: pode diferir do feliz (ex.: `text/html` em vez de `application/json` quando uma exception genérica escapa do handler). Reproduzir isso é parte do AS-IS.
- `WWW-Authenticate` em 401.
- `Retry-After` em 429/503.
- `Location` em 3xx-de-erro (incomum, mas existe).
- Headers customizados de tracing/erro (`X-Error-Code`, `X-Trace-Id`).
- `Set-Cookie` em erros de autenticação que invalidam sessão.

Capture literal; alguns parsers casam por presença/ausência.

## Shape do corpo: envelope, nomes, tipos

Capture o shape **exato**:

- **Envelope**: `{...}` na raiz, ou `{"data": ...}`, ou `{"ok": false, "error": {...}}`, ou texto puro/HTML.
- **Nomes de campo**: `error` vs `errors` vs `message` vs `msg`. Plural/singular importa.
- **Tipos**:
  - `"message": "..."` (string) vs `"message": ["..."]` (array de strings).
  - `"code": 123` (int) vs `"code": "123"` (string).
  - `"errors": {field: [...]}` (objeto) vs `"errors": [...]` (array).
- **Campos opcionais ausentes vs presentes-com-null**: `{"trace": null}` ≠ `{}`. PHP costuma omitir; Go com `omitempty` faz o mesmo, mas o default é incluir.
- **Encoding/escaping**: `json_encode` do PHP escapa `/` e unicode por padrão (ver `go-parity-verification/02-diff-strategy.md`).

Exemplo de captura:

```json
{
  "status_http": 422,
  "headers": { "Content-Type": "application/json;charset=UTF-8" },
  "envelope": "{ ok: bool, errors: object<field, array<string>>, message: string }",
  "body_example": {
    "ok": false,
    "errors": { "answer": ["O campo resposta é obrigatório."] },
    "message": "Dados inválidos"
  }
}
```

## "200 OK com erro no corpo"

Padrão herdado comum em APIs PHP antigas: o status é sempre `200`, e o sucesso/falha vai em `{"ok": true|false, "message": "..."}`. Razões históricas: clientes que tratavam não-2xx como falha de rede, infraestrutura que ocultava 5xx, ou só inércia.

Regras para o AS-IS:

- **Não converter para 4xx/5xx por iniciativa própria.** Isso quebra o cliente em silêncio.
- **Reproduza no Go**: o handler retorna `200` mesmo quando o domínio falhou; a resposta carrega `ok: false` e a mensagem. Veja `04-go-error-translation.md` para o padrão idiomático que evita o linter pressionar `4xx`.
- **Documente o porquê**: anote no código que isso é AS-IS, com link para o legado. Suprima regra do linter localmente (`//nolint:...`) e justifique.
- **Sinalize melhoria como decisão**: para mudar para `4xx`, abra uma decisão com o consumidor antes; não passe à PR técnica.

## Códigos não convencionais (419, 422, 423, 451, 0...)

Framework Laravel emite `419` para CSRF token mismatch, `422` para validation. Symfony e código antigo podem usar `423` (Locked), `451` (Unavailable for Legal Reasons), ou — em casos extremos — códigos não padronizados (`499`, ou status zero por bug). Capture literal.

`http_response_code(0)` ou `header("HTTP/1.1 0")` aparecem em legados quebrados; ainda assim, **é o contrato observável**. Documente e replique.

## Representar o shape em Go

Padrões idiomáticos que preservam o shape exato:

- **Structs com tags JSON explícitas** (preferível):

  ```go
  type ErrorBody struct {
      OK      bool                  `json:"ok"`
      Errors  map[string][]string   `json:"errors,omitempty"`
      Message string                `json:"message,omitempty"`
  }
  ```

  Use `omitempty` apenas se o legado omite. Se ele inclui `null`, declare o campo como ponteiro e marshal explícito.

- **`json.RawMessage`** quando o campo tem shape variável que o Go não consegue tipar facilmente (raro, mas existe em legados muito antigos).

- **Encoder customizado** quando precisar de ordem de campos específica (struct preserva ordem dos campos declarados; `map[string]any` não — alfabético em Go). Veja `go-parity-verification/02-diff-strategy.md`.

- **Marshaler com `SetEscapeHTML(false)` e escape de `/`** para combinar com `json_encode` padrão do PHP.

- **Content-Type explícito**: `w.Header().Set("Content-Type", "application/json;charset=UTF-8")` — note `;charset=UTF-8`, que `net/http` não coloca por padrão e que parsers estritos podem casar.

## Saída esperada

Para cada caminho de erro, uma linha na tabela do `SKILL.md` mais o detalhamento:

```markdown
### Caminho <N> — <título curto>
- Onde acontece (legado): <arquivo::função, condição>
- Onde acontece (Go): <handler/middleware/sentinel>
- Status HTTP: <código> (fonte no PHP: framework/exception/manual)
- Headers relevantes: <lista>
- Envelope: <descrição/tipo>
- Body de exemplo:
  ```json
  { ... }
  ```
- Tradução Go: <struct usada, content-type, omitempty/null explícito>
- Linter/SonarQube: <regra suprimida + justificativa, se "200 com erro">
```
