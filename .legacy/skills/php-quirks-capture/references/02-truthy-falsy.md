# 02 — Truthy / falsy e checagens de presença

> O conjunto de valores "falsy" do PHP é maior e mais sutil que o de Go. `if ($x)`, `empty()`, `isset()` e `is_null()` significam coisas diferentes — confundi-los muda o fluxo da rota.

## Sumário

- [Valores falsy do PHP](#valores-falsy-do-php)
- [`isset` vs `empty` vs `is_null` vs `array_key_exists`](#isset-vs-empty-vs-is_null-vs-array_key_exists)
- [Null coalescing `??` e `?:`](#null-coalescing--e-)
- [Tradução para Go](#tradução-para-go)
- [Checklist por ocorrência](#checklist-por-ocorrência)

---

## Valores falsy do PHP

Em contexto booleano (`if`, `while`, `&&`, `!`), são falsy:

- `false`
- `0` e `0.0` (e `-0.0`)
- `"0"` (string com um zero) — **pega muita gente**
- `""` (string vazia)
- `[]` (array vazio)
- `null`
- objetos: sempre truthy (até um objeto "vazio").
- `"0.0"`, `"false"`, `" "` (espaço) e `"00"` são **truthy**.

Consequência: `if ($valor)` num campo que pode ser `"0"` se comporta diferente de `if valor != ""` em Go. Numa rota de onboarding, uma resposta `"0"` (ex.: "0 dependentes") pode ser tratada como ausência de resposta no PHP.

## `isset` vs `empty` vs `is_null` vs `array_key_exists`

- `isset($x)` → `true` se existe **e não é null**. Em array, `isset($a['k'])` é `false` se a chave existe mas vale `null`.
- `empty($x)` → `true` se é falsy (lista acima) **ou** não existe. Não emite warning.
- `is_null($x)` → `true` somente se for exatamente `null`.
- `array_key_exists('k', $a)` → `true` mesmo se o valor for `null` (diferente de `isset`).

A escolha entre eles no legado é informação de comportamento. Ex.: validar `if (empty($resposta))` rejeita `"0"`, `""`, `0` e `null` de uma vez; replicar isso em Go exige checar todos esses casos, não só `nil`.

## Null coalescing `??` e `?:`

- `$a ?? $b` → usa `$a` se estiver setado e não-null; senão `$b`. Não dispara warning em índice indefinido.
- `$a ?: $b` → usa `$a` se for **truthy**; senão `$b`. Cuidado: `"0" ?: "default"` retorna `"default"`.

Confunda `??` com `?:` e o default dispara em casos diferentes.

## Tradução para Go

- Não traduza `if ($x)` como `if x != nil`. Liste os valores falsy possíveis daquele campo e reproduza-os.
- Para campos vindos do banco/cache como string, lembre que `"0"` é falsy no PHP mas `"0" != ""` é `true` em Go.
- `empty()` costuma virar uma função auxiliar `isEmptyPHP(v)` que cobre o conjunto inteiro, em vez de checagens espalhadas.

## Checklist por ocorrência

Para cada `if`, `empty`, `isset`, `??`, `?:` na rota:

- [ ] Quais tipos/valores reais o campo pode assumir?
- [ ] `"0"`, `0`, `""`, `[]` ou `null` mudam o branch?
- [ ] A checagem distingue "ausente" de "presente porém vazio"?
- [ ] O equivalente em Go cobre exatamente o mesmo conjunto?
