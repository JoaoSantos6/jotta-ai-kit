# 03 — Formatos de serialização

> Ponto crítico da coexistência: o valor que o PHP grava no cache (ou em colunas) precisa ser lido pelo Go e vice-versa. PHP frequentemente usa `serialize()`, que **não tem equivalente nativo em Go**. Identificar o formato evita o pior bug de migração: dado ilegível entre os dois lados.

## Sumário

- [Os formatos que o PHP usa](#os-formatos-que-o-php-usa)
- [Como identificar o formato observando o valor](#como-identificar-o-formato-observando-o-valor)
- [`serialize()` do PHP em detalhe](#serialize-do-php-em-detalhe)
- [igbinary e outros drivers](#igbinary-e-outros-drivers)
- [JSON: cuidados sutis](#json-cuidados-sutis)
- [Estratégias de coexistência](#estratégias-de-coexistência)
- [Saída esperada](#saída-esperada)

---

## Os formatos que o PHP usa

Um valor de cache ou coluna pode estar em:

- **`serialize()` nativo do PHP** — formato textual próprio (`a:2:{...}`).
- **igbinary** — binário compacto (driver de cache configurável).
- **JSON** — `json_encode`.
- **msgpack** — via extensão.
- **String/numérico cru** — sem serialização.

O driver de cache do framework decide o default (Laravel Redis usa `serialize()` PHP por padrão, salvo `igbinary`). Confirme a config **e** uma amostra real.

## Como identificar o formato observando o valor

Pegue uma amostra real do store e inspecione o prefixo:

- Começa com `a:`, `O:`, `s:`, `i:`, `b:`, `d:` → `serialize()` do PHP.
- Começa com `{` ou `[` → JSON.
- Bytes binários não imprimíveis no início → igbinary ou msgpack.
- Número/texto puro → cru.

```bash
redis-cli get "<chave física>" | head -c 80 | xxd | head
```

## `serialize()` do PHP em detalhe

Formato textual com tipo e tamanho:

- `s:5:"hello";` — string de 5 bytes.
- `i:42;` — inteiro.
- `b:1;` — bool true.
- `d:1.5;` — float.
- `N;` — null.
- `a:2:{i:0;s:1:"a";i:1;s:1:"b";}` — array.
- `O:8:"ClassName":1:{...}` — **objeto** (guarda nome da classe e propriedades).

Go não desserializa isso nativamente. Opções: uma lib de terceiros que faça `php_serialize` (avaliar manutenção/segurança), ou mudar o formato (ver estratégias). Objetos (`O:`) são especialmente problemáticos: dependem de uma classe PHP que não existe em Go.

## igbinary e outros drivers

igbinary e msgpack são binários e exigem lib específica em Go para interoperar. Se o cache usa igbinary, confirme se existe lib Go compatível **com a mesma versão de formato**; senão, a coexistência direta pode ser inviável sem reserializar.

## JSON: cuidados sutis

Mesmo em JSON há divergências:

- `json_encode` do PHP escapa `/` como `\/` por padrão e converte UTF-8 para `\uXXXX` salvo flags (`JSON_UNESCAPED_SLASHES`, `JSON_UNESCAPED_UNICODE`). O Go (`encoding/json`) não escapa `/` e mantém UTF-8. Strings podem diferir byte a byte mesmo representando o mesmo dado.
- Array associativo PHP vira objeto JSON; lista vira array (ver `php-quirks-capture/04-arrays.md`).
- Inteiros grandes e floats podem formatar diferente.

Para coexistência, esses detalhes importam se algo compara o JSON serializado (hash, assinatura), não só o conteúdo desserializado.

## Estratégias de coexistência

Em ordem de preferência, conforme o cenário:

1. **JSON dos dois lados** — se viável mudar o legado para `json_encode`/`json_decode`, é o caminho mais interoperável. Pode violar o "não mexer no legado"; avalie.
2. **Lib Go para `php_serialize`/igbinary** — mantém o legado intacto; exige validar a lib contra amostras reais.
3. **Namespacing por versão** — Go escreve em chaves novas e relê só as suas, evitando ler o formato antigo; útil quando coexistência total não é necessária.

A escolha é decisão de arquitetura — documente o trade-off, não decida sozinho.

## Saída esperada

```markdown
### Valor sob <chave/coluna>
- Formato: <php-serialize | igbinary | json | msgpack | cru>
- Evidência: <prefixo da amostra real>
- Estrutura: <shape do dado desserializado>
- Contém objeto PHP (O:)? <sim/não — qual classe>
- Interop em Go: <lib necessária | nativo | requer mudança>
- Estratégia recomendada: <1/2/3 acima + trade-off>
```
