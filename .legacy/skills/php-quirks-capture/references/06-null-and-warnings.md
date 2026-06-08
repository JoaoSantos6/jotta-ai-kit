# 06 — Null, warnings e defaults silenciosos

> PHP continua executando após muitos erros que, em Go, seriam panic ou erro de compilação. Acessos a índices/propriedades indefinidos, supressão com `@` e defaults de parâmetro produzem comportamento que o AS-IS precisa reproduzir — ou conscientemente endurecer.

## Sumário

- [Acesso a índice/propriedade indefinido](#acesso-a-índicepropriedade-indefinido)
- [Operador de supressão `@`](#operador-de-supressão-)
- [Defaults de parâmetro e argumentos faltando](#defaults-de-parâmetro-e-argumentos-faltando)
- [Null safe `?->` e propagação de null](#null-safe---e-propagação-de-null)
- [Conversões implícitas com null](#conversões-implícitas-com-null)
- [Diferenças PHP 7 vs 8](#diferenças-php-7-vs-8)
- [Tradução para Go](#tradução-para-go)

---

## Acesso a índice/propriedade indefinido

- `$a['inexistente']` em PHP 7 retorna `null` + **warning** (E_NOTICE/E_WARNING), mas o script segue. Em PHP 8 vira `E_WARNING` mais barulhento, ainda sem parar.
- `$obj->propInexistente` idem.
- Em muitas rotas, esse `null` resultante alimenta a lógica seguinte (ex.: vira `""` ou `0` em coerção). Esse caminho é comportamento real, não acidente — capture o valor efetivo que flui adiante.

Em Go, acesso a chave inexistente de map retorna o zero value sem erro (parecido), mas `nil` em ponteiro/slice/map causa panic. Mapeie cada acesso para o equivalente seguro.

## Operador de supressão `@`

`@funcao()` silencia erros/warnings daquela expressão. O legado pode depender de continuar após uma falha suprimida (ex.: `@file_get_contents` que retorna `false`). Procure `@` na rota; cada um esconde um caminho de erro que você precisa tratar explicitamente em Go.

## Defaults de parâmetro e argumentos faltando

- Parâmetros com default (`function f($x = 10)`) usam o default quando o argumento falta.
- Em PHP 7, chamar função com argumentos a menos podia emitir warning e usar `null`; PHP 8 lança `ArgumentCountError`. Verifique a versão.
- Argumentos nomeados (PHP 8) e variádicos (`...$args`) mudam como os dados chegam.

## Null safe `?->` e propagação de null

`$a?->b?->c` (PHP 8) curto-circuita para `null` se algum elo for null, sem erro. Em Go isso vira checagem explícita de `nil` em cada nível. Reproduza o curto-circuito: o resultado `null` provavelmente alimenta um default depois.

## Conversões implícitas com null

- `null` em contexto string vira `""` (com deprecation warning em PHP 8.1+ para args de funções internas).
- `null` em contexto numérico vira `0`.
- `null` em array/concatenação some ou vira `""`.

Esses defaults silenciosos costumam ser o "valor real" usado pela rota.

## Diferenças PHP 7 vs 8

PHP 8 transformou vários warnings em erros/exceptions e mudou coerções. **Sempre fixe a versão do legado** antes de afirmar um comportamento; a mesma linha de código diverge entre 7.x e 8.x.

## Tradução para Go

- Para cada acesso possivelmente indefinido, decida o valor que o PHP produziria (`null`→`""`/`0`/zero value) e reproduza explicitamente.
- Cada `@` vira tratamento de erro explícito que **continua** o fluxo como o legado fazia.
- Não "conserte" um caminho que dependia de null silencioso sem sinalizar como comportamento herdado para o time decidir.
- Proteja contra panic (nil deref) onde o PHP apenas seguia com `null`.
