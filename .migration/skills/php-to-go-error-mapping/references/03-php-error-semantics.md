# 03 — Semântica de erro no PHP

> Em PHP, "erro" não é só `throw`. Há `return false`/`return null`, warnings suprimidos com `@`, defaults silenciosos de parâmetro, type juggling que mascara, e o tradicional `200 OK com erro no corpo`. Esta reference cataloga cada padrão para você saber **o que** está traduzindo antes de escolher um idioma Go para reproduzir.

## Sumário

- [Exceptions: ascendentes, framework handlers e `Throwable`](#exceptions-ascendentes-framework-handlers-e-throwable)
- [`return false` / `return null` como sinalização de erro](#return-false--return-null-como-sinalização-de-erro)
- [Warnings, notices e `@` (supressão)](#warnings-notices-e--supressão)
- [200 com erro no corpo](#200-com-erro-no-corpo)
- [Defaults silenciosos e null propagation](#defaults-silenciosos-e-null-propagation)
- [`die()`/`exit()` no meio do fluxo](#dieexit-no-meio-do-fluxo)
- [Type juggling escondendo erro](#type-juggling-escondendo-erro)
- [Diferenças entre PHP 7 e PHP 8](#diferenças-entre-php-7-e-php-8)

---

## Exceptions: ascendentes, framework handlers e `Throwable`

- Em Laravel: `App\Exceptions\Handler::render` mapeia exceptions para resposta. Cada exception (validation, auth, not found, model not found, http) tem seu mapa default; subscrições/overrides em `Handler::register` podem mudar.
- Em Symfony: `kernel.exception` listener; `HttpExceptionInterface` carrega status; `ConverterListener` ajusta para JSON conforme `Accept`.
- Em CodeIgniter/legado caseiro: `set_exception_handler`, blocos `try/catch` no controller, ou nada — exception escapa para o `display_errors` (mostra ou não conforme config).

Para cada exception emitida no fluxo da rota, anote:

- Classe (e ancestrais até `\Throwable`).
- Onde é lançada (arquivo::método).
- Onde é capturada (handler global, middleware específico, `catch` local).
- Resposta resultante (status + shape + mensagem).

A tradução em Go raramente é "exception → panic". É **sentinel/wrapping** + middleware de erro (ver `04-go-error-translation.md`).

## `return false` / `return null` como sinalização de erro

Padrão muito comum em PHP procedural/antigo: a função retorna `false` (ou `null`) em erro, e o chamador trata por convenção. Exemplos:

- `mysql_query()` retorna `false` em erro.
- `json_decode($s)` retorna `null` em JSON inválido **e** quando o JSON é literalmente `"null"`.
- `preg_match()` retorna `false` em erro de regex, `0` em "não casou", `1` em casou.
- Métodos de domínio escritos manualmente: `if (!$user) return false;`.

Cuidados na tradução:

- Em Go, isso vira `(T, error)`. **Distinga** `não encontrado` de `erro de sistema` — em PHP ambos podem ser `null`/`false`; em Go convém ter `ErrNotFound` (sentinel) separado de erros de I/O.
- Atenção a tri-estados: `null` vs `false` vs `0` carregam significados diferentes em PHP quando lidos com `===`. Veja `php-quirks-capture/06-null-and-warnings.md` para o catálogo.
- Onde o legado fazia `if (!$x)` (truthy check), o Go precisa decidir explicitamente: `if x == nil`, `if x == "0"`, `if x == 0`. Cada um tem semântica diferente; consulte `php-quirks-capture/02-truthy-falsy.md`.

## Warnings, notices e `@` (supressão)

- `E_WARNING`/`E_NOTICE` em PHP **não interrompem** o fluxo por padrão; aparecem no log e no `output buffer` (às vezes corrompendo o JSON da resposta).
- O operador `@` suprime warnings de uma expressão. Comum em código antigo: `@file_get_contents(...)`, `@$arr['key']`.
- PHP 8 endureceu vários warnings (undefined index, undefined property) e alguns viraram **erros fatais** ou warnings mais visíveis. A versão do PHP do legado (ver `php-quirks-capture/SKILL.md`) muda a semântica.

Tradução:

- Cada `@` no legado é uma **decisão de ignorar erro**. Em Go isso vira `_, _ = foo()` ou `result, _ := foo()`. Cada ignorado precisa de comentário curto justificando o porquê. Sem isso, você passa adiante um bug mascarado.
- Warnings que corrompiam JSON (output buffer "vazado") podem ter quebrado clientes que parseavam tolerante; o Go não vai corromper assim. Considere se algum cliente dependia desse comportamento patológico (raríssimo, mas existe).
- Não tente "consertar" cada `@`. Reproduza o comportamento (ignorar) com nota; melhore como decisão de produto, depois.

## 200 com erro no corpo

Já coberto em `01-status-and-shape.md`. Aqui o ponto é semântico: para o PHP, esse padrão tipicamente significa "função retornou normalmente, mas o domínio falhou". O **handler** do legado embrulha esse retorno num JSON `{ok: false, ...}` antes de emitir.

Implicação para Go:

- O erro do domínio vira `error` específico (`ErrInvalidAnswer`, `ErrAlreadyAnswered`...).
- O middleware/handler detecta o tipo do erro e emite `200` com o shape correto.
- Não convertende erro de domínio para `4xx` no caminho geral; só na via que **explicitamente** decidir mudar (e isso é decisão de produto).

## Defaults silenciosos e null propagation

- Parâmetros de função com default no PHP (`function f($x = null)`) somados a callers que não passam o valor → silêncio. Em Go o default não existe; a função explicita.
- `?->` (null-safe operator, PHP 8) propaga `null`: `$user?->profile?->email` retorna `null` se qualquer link for `null`. O legado pode então tratar `null` como caminho de erro implícito ou como "sem dado".
- Em Go, isso vira `if user == nil || user.Profile == nil { ... }` ou `Optional`/`sql.Null*`. Decidir entre "ausência" e "erro" precisa de critério.

## `die()`/`exit()` no meio do fluxo

Padrão extremamente antigo: legados emitem status/mensagem e chamam `die(...)`/`exit(...)`, encerrando o request abrutamente. Implicações:

- Efeitos pós-resposta (`register_shutdown_function`) ainda rodam — possíveis efeitos colaterais escondidos.
- Em Go o equivalente é o handler simplesmente retornar depois de escrever resposta; `os.Exit` **nunca**.
- Verifique se há `die()` em pontos não óbvios (helpers de validação, middleware caseiro). Cada um é um caminho de erro implícito.

## Type juggling escondendo erro

`php-quirks-capture/01-type-juggling.md` tem o catálogo. Padrões relevantes para erros:

- `if ($result == false)` casa também com `0`, `""`, `[]`, `"0"`. Falso-positivo em "houve erro" pode ter virado contrato.
- `switch ($code)` com `case 0:` casa com `"abc"` em PHP 7 (cuidado).
- Comparações com `null` (`==` vs `===`) em mensagens de erro condicional.

Para cada uso de comparação solta no caminho de erro, anote o **comportamento real** observado no legado e decida como reproduzir em Go (geralmente explicitando o tipo).

## Diferenças entre PHP 7 e PHP 8

- PHP 8 promoveu vários warnings a erros (undefined property em modo strict, divisão por zero, comparações entre tipos incompatíveis em `<`/`>`).
- Operações antes "tolerantes" agora podem **lançar** exception. O caminho de erro mudou de "warning + null" para "exception".
- Fixar a versão do PHP do legado é obrigatório para concluir a semântica de erro. Anote no topo do mapa de erros.
