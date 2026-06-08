# 03 — Strings e números (coerção, precisão)

> Conversões implícitas entre string e número são onipresentes em PHP e silenciosas. Em Go elas não existem — todo parse é explícito e pode falhar. Capturar o comportamento exato evita diferenças em cálculos, IDs e validações.

## Sumário

- [Coerção string → número](#coerção-string--número)
- [Operadores aritméticos sobre strings](#operadores-aritméticos-sobre-strings)
- [`intval`, `floatval`, `(int)`, `(float)`](#intval-floatval-int-float)
- [Concatenação vs soma](#concatenação-vs-soma)
- [Precisão de float e dinheiro](#precisão-de-float-e-dinheiro)
- [Inteiros grandes e overflow](#inteiros-grandes-e-overflow)
- [Tradução para Go](#tradução-para-go)

---

## Coerção string → número

Em contexto numérico, PHP lê o **prefixo numérico** da string:

- `"10abc"` → `10` (PHP 7/8 emite warning em PHP 8, mas ainda usa `10` em muitos contextos aritméticos).
- `"abc"` → `0` (PHP 7) — em PHP 8 lança `TypeError` em algumas operações.
- `"  12"` → `12` (espaços à esquerda são tolerados).
- `"0x1A"` → `0` (hex em string não é interpretado como número).
- `"1e3"` → `1000.0` (notação científica é numérica).

Determine a versão do PHP, pois PHP 8 endureceu várias dessas regras.

## Operadores aritméticos sobre strings

`"10" + 5` → `15`. `"10" . 5` → `"105"`. O operador `+` **sempre** soma (não concatena) — erro comum de quem vem de JS. Numa rota, `$a + $b` onde ambos vêm do request como string produz número; replicar exige parse explícito em Go.

## `intval`, `floatval`, `(int)`, `(float)`

- `(int)"10.9"` → `10` (trunca, não arredonda).
- `intval("0x1A", 16)` → `26` (base explícita muda tudo).
- `(int)"1e3"` → `1` em PHP 7, `1000` em PHP 8 — **divergência por versão**.
- `(int)true` → `1`, `(int)null` → `0`, `(int)[]` → `0`, `(int)[1]` → `1`.

Anote qual função/cast o legado usa e o resultado para os inputs reais.

## Concatenação vs soma

Zeros à esquerda somem na coerção numérica: `"007"` somado vira `7`, mas exibido como string permanece `"007"`. Se a rota gera códigos/IDs com zeros à esquerda, qualquer operação aritmética intermediária os destrói. Verifique se algum identificador passa por `+`, `intval` ou comparação numérica.

## Precisão de float e dinheiro

- PHP usa float IEEE 754 (double). `0.1 + 0.2 != 0.3`.
- Valores monetários frequentemente trafegam como float ou string no legado. Replicar o **mesmo erro de arredondamento** importa para o AS-IS bater centavo a centavo.
- `round()` do PHP usa "round half away from zero" por padrão; o `math.Round` do Go faz o mesmo, mas `number_format` e casts truncam — confira a função exata.

## Inteiros grandes e overflow

- Em PHP, inteiro que estoura `PHP_INT_MAX` vira **float** silenciosamente (perde precisão). Em Go, `int64` faz overflow/wrap. Comportamentos opostos.
- IDs grandes (snowflake, bigint) tratados como número podem perder precisão no PHP; se o legado já perdia, replique; se não, use `int64`/string em Go.

## Tradução para Go

- Todo parse explícito: `strconv.Atoi`, `ParseFloat`, `ParseInt(s, base, bits)`.
- Trate o erro de parse decidindo o que o PHP faria (provavelmente `0` ou prefixo numérico) e reproduza.
- Para dinheiro, prefira inteiro de centavos ou `decimal`; mas se o legado usava float, documente e alinhe o arredondamento antes de "melhorar".
- Para zeros à esquerda e códigos, mantenha como string ponta a ponta.
