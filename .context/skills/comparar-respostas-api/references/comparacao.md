# Regras de Comparação — Fallback sem Python

Este arquivo descreve como comparar manualmente se o script `cmp_api.py` não estiver disponível
ou falhar. Em condições normais, use o script (veja `references/script-python.md`).

## Status code

Comparação direta de inteiros. `200 == 200` → ok. `200 != 201` → divergência.

Status diferente já marca o resultado como divergente, mas **continue** comparando o body para
mostrar o quadro completo ao desenvolvedor.

## Body

### Passo 1 — Parse

Tente `JSON.parse` (ou equivalente) nas duas respostas.

- Ambas parseiam → segue para o passo 2 (comparação estrutural).
- Uma falha → caia para **comparação textual exata** (byte a byte) e registre no relatório:
  > Resposta A/B não é JSON válido — comparação foi feita textualmente.
- Ambas falham → comparação textual exata, sem nota especial.

### Passo 2 — Comparação estrutural recursiva

Regra central:

- **Objetos** (`{}` / JSON object / dict): **a ordem das chaves NÃO importa**.
  - Compare os conjuntos de chaves. Chave presente em um e não no outro → divergência (`faltando em A` ou `faltando em B`).
  - Para cada chave em comum, compare recursivamente os valores.

- **Arrays** (`[]`): **a ordem importa**.
  - Tamanhos diferentes → divergência (`tamanho A=N B=M`).
  - Mesmo tamanho → compare índice a índice, recursivamente.

- **Primitivos** (`string`, `number`, `boolean`, `null`):
  - Igualdade estrita, incluindo tipo. `"1" != 1`, `0 != false`, `null != ""`.

- **Tipos heterogêneos** no mesmo caminho (ex: A tem objeto, B tem array): divergência de tipo.

### Passo 3 — Caminhos das divergências

Cada divergência deve ser reportada com um caminho. Convenção:

- Raiz: `<raiz>`
- Chave de objeto: `.chave`
- Índice de array: `[N]`

Exemplos:

- `usuarios[0].email`
- `meta.total`
- `tags[3]`

### Exemplos rápidos

| A | B | Resultado |
|---|---|---|
| `{"a":1,"b":2}` | `{"b":2,"a":1}` | iguais (ordem de chaves não importa) |
| `[1,2,3]` | `[3,2,1]` | diferentes em `[0]` e `[2]` |
| `{"x":[1,2]}` | `{"x":[2,1]}` | diferentes em `x[0]` e `x[1]` |
| `{"n":1}` | `{"n":"1"}` | diferentes em `n` (tipo) |
| `{"a":1,"b":2}` | `{"a":1}` | `b` faltando em B |
| `null` | `""` | diferentes (tipo) |

## Fallback de shell (sem Python e sem Node)

Use `jq -S . arquivo > arquivo.norm` para normalizar ordem de chaves (jq preserva ordem de
array), depois `diff arquivo_a.norm arquivo_b.norm`. Reporte as linhas do diff traduzindo,
na medida do possível, para caminhos JSON.

Nunca compare bodies JSON com `diff` textual sem antes normalizar a ordem de chaves de
objetos — produz falso positivo.
