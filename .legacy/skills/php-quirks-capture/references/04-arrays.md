# 04 — Arrays (ordenação, chaves, operadores)

> O array do PHP é um mapa ordenado que também faz papel de lista. Go separa `slice` (ordenado) de `map` (sem ordem garantida). Essa diferença causa drift em qualquer rota que itere, ordene ou serialize arrays.

## Sumário

- [Array PHP = mapa ordenado](#array-php--mapa-ordenado)
- [Ordem de iteração](#ordem-de-iteração)
- [Chaves: coerção e colisão](#chaves-coerção-e-colisão)
- [Operador `+` vs `array_merge`](#operador--vs-array_merge)
- [Funções de ordenação](#funções-de-ordenação)
- [Lista vs associativo na serialização](#lista-vs-associativo-na-serialização)
- [Tradução para Go](#tradução-para-go)

---

## Array PHP = mapa ordenado

Um único tipo `array` guarda pares chave→valor **na ordem de inserção**, com chaves int ou string misturadas. `["a", "b"]` é açúcar para `[0=>"a", 1=>"b"]`. Isso significa que toda saída JSON, todo `foreach` e toda concatenação preservam ordem de inserção — comportamento que precisa ser reproduzido.

## Ordem de iteração

`foreach` percorre na ordem de inserção, **sempre**. Em Go, iterar um `map` tem ordem aleatória por design. Se a rota monta uma resposta iterando um array, você precisa de um `slice` (ou um slice de chaves ordenado) em Go para garantir a mesma ordem. Esse é um dos drifts mais fáceis de introduzir e mais difíceis de notar em review.

## Chaves: coerção e colisão

- Chaves string numéricas viram int: `$a["1"]` e `$a[1]` são a mesma chave.
- `true`→`1`, `false`→`0`, `null`→`""`, floats são truncados: `$a[1.9]` vira `$a[1]`.
- Atribuições podem colidir silenciosamente por essas regras.

## Operador `+` vs `array_merge`

- `$a + $b`: mantém os elementos de `$a` e adiciona de `$b` **apenas as chaves que faltam**. Não renumera.
- `array_merge($a, $b)`: reindexa chaves numéricas e sobrescreve chaves string.

Resultados diferentes para os mesmos inputs. Verifique qual é usado antes de traduzir um "merge" para Go.

## Funções de ordenação

- `sort`/`rsort` reindexam; `asort`/`ksort` preservam chaves.
- `usort` recebe comparador e **não é estável** antes do PHP 8.0; a partir do 8.0 é estável. Anote a versão — a ordem de empates muda.
- Comparações dentro do sort usam coerção (ver reference 01).

## Lista vs associativo na serialização

`json_encode([0=>"a",1=>"b"])` → array JSON `["a","b"]`. Se as chaves não forem 0..n contíguas, vira **objeto** JSON `{"0":"a","2":"b"}`. Remover um item do meio de uma lista e serializar muda array→objeto. Em Go isso é a diferença entre `[]T` e `map[string]T`; escolha conforme o que o PHP emite para os dados reais.

## Tradução para Go

- Precisa de ordem? Use `slice`. Precisa de acesso por chave **e** ordem? Use `slice` de structs ou um slice de chaves + map.
- Reproduza a ordem de inserção observada, não uma ordenação "natural".
- Ao serializar, confirme se o PHP emitia array ou objeto JSON para aqueles dados e espelhe o tipo em Go.
- Cuidado com empates em `usort`: replique a estabilidade conforme a versão do PHP de origem.
