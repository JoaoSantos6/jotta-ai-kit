# 01 — Type juggling (coerção e comparações)

> Comportamentos de comparação e coerção do PHP que **mudam o resultado** e não têm equivalente direto em Go. São a causa mais comum de drift silencioso no AS-IS.

## Sumário

- [Comparação solta `==` vs estrita `===`](#comparação-solta--vs-estrita-)
- [Tabela de coerção em comparações](#tabela-de-coerção-em-comparações)
- [`in_array` / `array_search` sem strict](#in_array--array_search-sem-strict)
- [`switch` usa comparação solta](#switch-usa-comparação-solta)
- [Ordenação que depende de coerção](#ordenação-que-depende-de-coerção)
- [Como replicar em Go](#como-replicar-em-go)

---

## Comparação solta `==` vs estrita `===`

PHP 7 e PHP 8 mudaram regras de `==`. Identifique a versão do projeto antes de concluir qualquer coisa.

- `==` coage tipos antes de comparar; `===` compara tipo e valor.
- Exemplos clássicos (PHP 7): `0 == "abc"` era `true`; em PHP 8 é `false`. `"1" == "01"` é `true` (ambos viram número). `"10" == "1e1"` é `true`.
- `null == false`, `null == 0`, `null == ""` são `true`.

Para cada `==` na rota, decida se a coerção é intencional ou acidental, e replique o resultado exato em Go (geralmente com comparação explícita + normalização).

## Tabela de coerção em comparações

Quando os dois lados têm tipos diferentes, PHP converte segundo regras. Resumo prático (confirme contra a versão do projeto):

- número vs string numérica → compara como número.
- número vs string não-numérica → PHP 8 compara como string; PHP 7 convertia string para número (`0`).
- bool ou null vs qualquer coisa → converte o outro lado para bool.
- array vs array → compara tamanho, depois chaves/valores.

## `in_array` / `array_search` sem strict

`in_array($needle, $haystack)` sem o terceiro argumento `true` usa `==`. Isso causa falsos positivos: `in_array(0, ['a','b'])` podia ser `true` em PHP 7. Sempre verifique se há o `true`. Em Go, a busca é estrita por natureza — replique a versão **solta** apenas se o legado dependia dela.

## `switch` usa comparação solta

`switch` compara cada `case` com `==`. Um `case 0:` pode capturar uma string não-numérica em PHP 7. Ao traduzir `switch` para Go, confirme se algum case dependia de coerção; caso contrário, normalize a entrada antes do `switch`/`if`.

## Ordenação que depende de coerção

`sort()`, `usort()` e amigos comparam com regras de coerção. Uma lista mista de strings e números ordena diferente do que `sort.Slice` faria em Go. Se a rota ordena dados antes de gravar ou responder, isso é AS-IS observável.

## Como replicar em Go

- Documente o **resultado esperado**, não a regra abstrata: para os inputs reais da rota, qual o booleano/ordem que o PHP produz.
- Prefira normalizar explicitamente (parse para int/float/bool) e então comparar com `==` do Go.
- Quando o legado dependia de um bug de coerção, sinalize como "comportamento herdado" para o time decidir manter ou corrigir — não corrija silenciosamente.
