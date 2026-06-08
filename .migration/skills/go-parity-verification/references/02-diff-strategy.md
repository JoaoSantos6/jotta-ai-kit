# 02 — Estratégia de diff

> Comparar Go vs golden é fácil de fazer errado em duas direções: comparar bytes crus e ter um teste *flaky* por causa de timestamp; ou normalizar demais e mascarar drift real. Esta reference dá a régua: o que normalizar, o que **nunca** normalizar, e como justificar cada decisão.

## Sumário

- [Princípio: normalizar é uma decisão explícita](#princípio-normalizar-é-uma-decisão-explícita)
- [O que é seguro normalizar](#o-que-é-seguro-normalizar)
- [O que NUNCA normalizar](#o-que-nunca-normalizar)
- [Ordem de chaves em JSON](#ordem-de-chaves-em-json)
- [Array vs objeto JSON (`[]` vs `{}`)](#array-vs-objeto-json--vs-)
- [Escaping, unicode e numéricos](#escaping-unicode-e-numéricos)
- [Diff de banco e diff de cache](#diff-de-banco-e-diff-de-cache)
- [Diff de chamadas externas](#diff-de-chamadas-externas)
- [Como classificar uma diferença](#como-classificar-uma-diferença)
- [Saída esperada do diff](#saída-esperada-do-diff)

---

## Princípio: normalizar é uma decisão explícita

Cada normalizador é um pedaço de código que **esconde** algo do diff. Trate como um silenciador: precisa ter motivo, escopo e revisão. Mantenha-os num único arquivo (`normalizers.go` no diretório do teste de paridade) com comentário curto explicando o porquê. Sem essa disciplina, normalizadores viram lixo onde drift se esconde.

## O que é seguro normalizar

Apenas valores que **não** carregam contrato:

- Timestamps de criação/atualização gerados pelo banco (`created_at`, `updated_at`) — comparáveis pela existência e por estarem dentro de uma janela razoável.
- IDs autoincrement gerados pelo banco — comparar pelo padrão de existência e pelas referências relativas (linha A referencia linha B), não pelo valor absoluto.
- UUIDs gerados pelo sistema durante o request — quando não há controle do RNG. Marque o campo explicitamente.
- Trace IDs, request IDs, IDs de sessão gerados por middleware.
- Header `Date` da resposta, `X-Request-ID`, e similares de infraestrutura.
- Whitespace estritamente irrelevante em JSON (ver seção sobre ordem de chaves).

## O que NUNCA normalizar

Esses são contrato observável; qualquer diferença é drift:

- **Valores de negócio**: respostas do usuário, flags de estado, contadores, ids de domínio (que não foram gerados na hora).
- **Contagem de efeitos**: se o legado fez 1 chamada à API e o Go faz 2, isso não é "ruído de ordem". É drift.
- **Status HTTP** (ver `php-to-go-error-mapping`).
- **Shape do corpo**: presença/ausência de campos, tipos de campos (string `"0"` ≠ número `0`), envelope (`{"data":...}` vs raiz).
- **TTL** do cache: parte do contrato de invalidação.
- **Headers de cache** (`Cache-Control`, `ETag`).
- **Ordem** de chamadas externas (ver seção própria).

Quando estiver tentado a normalizar um valor de negócio "porque não importa", pare. Você está prestes a esconder drift que produção vai expor.

## Ordem de chaves em JSON

Diferença comum e armadilhosa: PHP `json_encode` preserva a ordem de inserção do array associativo. Go `encoding/json` ordena as chaves de `map[string]any` alfabeticamente; para structs, segue a ordem dos campos declarados.

Decisão:

- **Se o consumidor faz parse JSON (deserializa em objeto):** a ordem é irrelevante para ele; normalize (ordene as chaves dos dois lados) **apenas** no diff, e documente.
- **Se o consumidor casa por substring / parse linha a linha / é um diff humano:** a ordem é contrato. Não normalize — corrija o Go para emitir na ordem do PHP, usando structs com ordem deliberada ou `json.RawMessage`/serialização customizada.

Em dúvida, pergunte ao consumidor. Não decida sozinho.

## Array vs objeto JSON (`[]` vs `{}`)

Quirk clássico do PHP: `[]` (array vazio) serializa como `[]`, mas `["a" => 1]` (array associativo) serializa como `{"a":1}`. Quando você esvazia o array no PHP, o tipo serializado muda de `{}` para `[]`. Isso quebra consumidores que esperam objeto sempre.

- Capture o tipo serializado no golden literal.
- No Go, decida deliberadamente: `map[string]any{}` serializa como `{}`; `nil` serializa como `null`; `[]Foo{}` serializa como `[]`. Use o tipo que reproduz o PHP **observado**, não o que parece mais correto.
- Veja também `data-contracts-extraction/03-serialization-formats.md` para detalhes do contrato.

## Escaping, unicode e numéricos

- **Escaping**: `json_encode` do PHP escapa `/` por padrão (`\/`); Go não escapa. Se o consumidor compara strings, isso quebra. Resolva com `strings.Replace` no Go ou marshaler custom.
- **Unicode**: PHP por padrão escapa não-ASCII (`ç`); Go emite UTF-8 cru. Use `json.Encoder.SetEscapeHTML(false)` e marshaler custom quando precisar combinar com o PHP.
- **Numéricos**:
  - Floats que viram inteiros no PHP (`1.0` → `1`) vs Go (`1.0` → `1`). Aparente paridade pode esconder diferença de tipo no parse.
  - IDs grandes: PHP em 32 bits poderia overflowar para float; o golden registra como string. Go com `int64` mantém precisão. Se o golden é string, o Go precisa emitir string.
  - Decimais: NUNCA usar `float64` para dinheiro; usar `decimal.Decimal` ou string. Diferenças de centavo são drift, não ruído.
- **Booleans**: PHP às vezes serializa `false` como `0` ou `""` dependendo do código. Capture literal.

Referencie `php-quirks-capture/03-strings-numbers.md` para o catálogo completo do legado.

## Diff de banco e diff de cache

- **Banco**: comparar linha por linha por chave primária; comparar coluna por coluna respeitando tipos (não compare `string` vs `number` como iguais por valor). Normalizadores: `*_at` gerados pelo banco, IDs autoincrement (compare a forma das referências, não o valor).
- **Cache**: comparar **bytes** do valor, não a versão humana. Comparar TTL exato (a maioria dos clientes permite `PTTL`). Normalizador permitido: TTL relativo (diferença de poucos ms por causa do tempo gasto no request) — defina uma tolerância pequena e explícita.

## Diff de chamadas externas

- Liste em ordem absoluta e em ordem relativa a banco/cache.
- Compare: método, URL (path + query — em alguns casos a query tem ordem livre, em outros não), headers de contrato (`Content-Type`, `X-Idempotency-Key`, custom headers usados pelo parceiro), body.
- Normalizadores permitidos: auth tokens (já sanitizados na captura), trace headers, timestamps em headers. **Nunca** normalize chave de idempotência: é contrato e idempotência herdada (não duplicar respostas que a API já contém) depende dela.

## Como classificar uma diferença

Para cada diferença encontrada, atribua uma classificação:

1. **Drift a corrigir no Go** — o Go está fazendo diferente do legado, e o legado é a referência. Ação: PR no Go.
2. **Ruído normalizado (justificado)** — campo volátil/infra, decisão deliberada, escopo claro. Ação: adicionar normalizador comentado e referenciado.
3. **Bug herdado AS-IS (consciente)** — o legado está errado, mas o AS-IS exige reproduzir; o Go reproduz. Ação: documentar no `README.md` do caso (ver `01-golden-capture.md`) e linkar com a evidência em `php-quirks-capture` quando aplicável.
4. **Mudança intencional fora do AS-IS** — uma decisão de produto explicita que o Go diverge. Ação: marcar a rota como **fora do escopo AS-IS** e mover a verificação para BDD/teste de feature, não golden.

Se uma diferença não cabe em nenhuma das quatro, **pare**. Provavelmente é drift que você está prestes a maquiar.

## Saída esperada do diff

```markdown
## Diff — <METHOD> <path> — caso <id>

### Resposta
- igual / N diferenças
- diferenças:
  - <campo>: <legado> ≠ <go> → <classificação>

### Banco
- igual / N diferenças
- ...

### Cache
- igual / N diferenças (incluindo TTL e bytes do valor)
- ...

### API externa (em ordem)
- chamada #1: igual / diferente em <campo>
- ...

### Normalizadores aplicados
- <nome> — escopo: <campo/regex> — justificativa: <...>
```
