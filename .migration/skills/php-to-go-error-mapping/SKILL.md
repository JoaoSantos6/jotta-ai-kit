---
name: php-to-go-error-mapping
description: >-
  Traduz o tratamento de erros e status HTTP do legado PHP para Go preservando
  o contrato externo exato: status code, headers, shape do corpo de erro,
  envelope, nomes de campo, tipos e mensagens literais — inclusive padrões
  herdados como "200 OK com erro no corpo", exceptions virando 500, e retornos
  `false`/`null` que viram resposta de erro silenciosa. Use SEMPRE que estiver
  migrando uma rota PHP para Go e precisar tratar erros, status HTTP, resposta
  de erro, mensagens de erro, ou manter o contrato de erro idêntico ao legado —
  mesmo quando o pedido falar apenas em "tratar erros", "lidar com falhas",
  "retornar status", "mapear exceptions", "alinhar a resposta com o legado" ou
  "o cliente está casando mensagem de erro", sem citar "mapeamento de erros" ou
  "contrato de erro". Acione antes de declarar pronta uma rota Go e sempre que
  um linter/SonarQube sugerir "consertar" um status que diverge do esperado.
---

# PHP to Go Error Mapping

Em uma migração AS-IS, o contrato de erro é parte do contrato externo. Consumidores do legado podem casar **status code**, **shape do corpo**, **nomes de campo** e até **a string literal da mensagem**. "Melhorar" um status `200 OK com erro no corpo` para `400`/`500` quebra clientes silenciosamente. Esta skill garante que cada caminho de erro do PHP produza, em Go, exatamente o mesmo observável.

## Quando usar

- Antes de declarar pronta uma rota Go migrada do PHP, para validar o contrato de erro.
- Quando o consumidor (app, parceiro, integração) reclama que "a resposta de erro mudou" depois da migração.
- Quando o time discute se um status deve ser "corrigido" — esta skill produz o critério.
- Para construir o middleware de erro do serviço Go a partir dos padrões reais do legado, não dos idiomáticos Go.

## Quando NÃO usar

- Para verificar paridade ponta a ponta (resposta + banco + cache + API externa) → use `go-parity-verification`. Esta skill é estritamente sobre erros e status.
- Para revisar concorrência introduzida em Go → use `go-concurrency-review`.
- Para rotas novas, sem contraparte legada — não há AS-IS de erro a preservar; use o que faz sentido idiomaticamente.

## Fluxo de trabalho

1. **Localize o handler Go** com `references/00-go-route-locating.md` e correlacione com a rota PHP equivalente. Erros fora do handler (middlewares, recovers globais) entram aqui.
2. **Enumere todos os caminhos de erro do legado** combinando:
   - `side-effects-mapping` (cada fronteira de I/O é um ponto que pode falhar).
   - `php-quirks-capture/06-null-and-warnings.md` (warnings suprimidos com `@`, `null`s retornados que não interrompem o fluxo, defaults silenciosos).
3. **Capture, por caminho**, o triplete observável no legado: **status HTTP**, **shape** (envelope + campos + tipos) e **mensagem literal** — usando `references/01-status-and-shape.md` e `references/02-error-message-catalog.md`.
4. **Entenda a semântica de erro do PHP** (exception vs `false`/`null` vs warning vs 200-com-erro) com `references/03-php-error-semantics.md`. Sem isso, você traduz por código de erro Go e perde casos.
5. **Traduza para Go** preservando o triplete com `references/04-go-error-translation.md`: padrões de `error` wrapping, middleware de erro que monta o shape, mapa explícito caminho→status, e como "manter um 200-com-erro" sem o linter pressionar para `4xx`.
6. **Verifique** que para cada caminho enumerado, o Go produz o mesmo triplete — preferencialmente cobrindo cada um nos goldens da `go-parity-verification`.
7. **Rode a auto-verificação**.

## Index das references

- **Localização da rota no Go** — abra quando começar a tradução de qualquer rota; o handler e os middlewares definem onde os erros nascem e onde a resposta é montada. → `references/00-go-route-locating.md`
- **Status, headers e shape do corpo de erro** (envelope, campos, tipos, status code, content-type) — abra ao registrar o contrato de erro de cada caminho. → `references/01-status-and-shape.md`
- **Catálogo de mensagens de erro literais** (quais são contrato e clientes podem casar; quais são livres) — abra para decidir o que muda de string com risco e o que pode ser reescrito. → `references/02-error-message-catalog.md`
- **Semântica de erro do PHP** (exception, `return false/null`, 200-com-erro, `@`, warnings, defaults silenciosos) — abra quando o caminho de erro do legado não é uma exception explícita. → `references/03-php-error-semantics.md`
- **Tradução para Go** (`error` wrapping, sentinels, middleware de erro, tabela caminho→status, como não "consertar" silenciosamente) — abra ao escrever o código Go que reproduz o contrato. → `references/04-go-error-translation.md`

## Princípios

- **Status é contrato.** Não "conserte" `200 OK com erro no corpo` para `4xx`. Mude apenas com decisão explícita, comunicada aos consumidores. AS-IS significa reproduzir, inclusive más práticas.
- **Mensagens literais podem ser contrato.** Se o cliente do legado faz `if (response.message === "Resposta inválida")`, mudar a string quebra. Trate cada mensagem como suspeita até prova em contrário.
- **Shape antes de status.** Envelope/campos/tipos do corpo são mais propensos a quebrar parsers do que o status. Trave o shape primeiro.
- **Exception em PHP raramente vira `panic` em Go.** O PHP traduz exceptions para resposta HTTP num handler global; em Go o equivalente é o middleware de erro. Mapeie por **tipo de exception** → resposta, não por linguagem.
- **Sinalize melhorias como decisão.** Toda divergência consciente vira nota na PR ("legado: 200; Go: 400; aprovado por X em Y"), nunca silenciosa.
- **Não silencie warnings em Go.** O equivalente a `@` do PHP é o erro ignorado em Go (`_ = foo()`). Cada ignorado precisa de justificativa — ou o legado já mascarava bugs que agora você passa adiante.

## Checklist de auto-verificação

- [ ] Call graph Go produzido por `00-go-route-locating.md`, incluindo middlewares de erro?
- [ ] Lista exaustiva dos caminhos de erro do legado, cruzando `side-effects-mapping` + `php-quirks-capture/06`?
- [ ] Para cada caminho, triplete capturado (status, shape, mensagem) com evidência do legado?
- [ ] Mensagens marcadas como contrato vs livres, com critério (cliente conhecido casa por string? Documentação pública?)?
- [ ] Semântica de erro do PHP entendida por caminho (exception/`false`/`null`/200-com-erro/warning)?
- [ ] Mapa caminho→resposta-Go preenchido e implementado via middleware/translation explícito (não decisão dispersa em cada handler)?
- [ ] "200 com erro no corpo" preservado onde existia, com supressão consciente de linter/SonarQube?
- [ ] Cada divergência intencional aprovada e documentada na PR?
- [ ] Caminhos cobertos por testes (idealmente goldens em `go-parity-verification`)?

## Formato de saída

Para cada rota, uma tabela viva (markdown ou doc interno):

```markdown
# Mapa de erros — <METHOD> <path>

Call graph Go: <link 00>
Rota PHP equivalente: <link>

## Mensagens de contrato vs livres
- Contrato (não pode mudar):
  - "<mensagem literal>" — evidência: <consumidor X casa por string>
- Livres (podem ser revistas):
  - "<mensagem>" — sem consumidor identificado

## Caminhos de erro
| # | Origem (legado) | Tipo PHP | Status | Shape | Mensagem | Tradução Go | Conformidade |
|---|------------------|----------|--------|-------|----------|-------------|--------------|
| 1 | Validation::validate falha | exception ValidationException | 422 | { "errors": {field: [msg]} } | "Campo X obrigatório" | sentinel ErrValidation + middleware monta shape | OK |
| 2 | Repo::find retorna null + handler segue | return null | 200 | { "ok": false, "message": "Não encontrado" } | "Não encontrado" (contrato) | sentinel ErrNotFound + handler emite 200 com erro no corpo | OK (linter suprimido por nota) |
| 3 | DB connection refused | PDOException | 500 | { "error": "Internal Server Error" } | livre | middleware genérico devolve 500 | OK |
| 4 | API externa timeout | exceção do client | 502 | { "ok": false, "message": "Falha ao integrar" } | "Falha ao integrar" (contrato) | wrap + middleware mapeia para 502 com mensagem | OK |

## Divergências intencionais
- caminho #N: legado 200, Go 400. Motivo: <decisão>. Aprovado por <quem>. Comunicado em <onde>.
```
