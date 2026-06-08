# 05 — Mapeamento de tipos (SQL/PHP → Go)

> Tabela de referência reutilizável para traduzir tipos de coluna e tipos do PHP para Go preservando semântica. Pensada para ser consumida também pela skill de desenvolvimento no novo serviço, não só na extração de contratos.

## Sumário

- [Princípio: nullability decide ponteiro vs valor](#princípio-nullability-decide-ponteiro-vs-valor)
- [Inteiros](#inteiros)
- [Decimais e dinheiro](#decimais-e-dinheiro)
- [Float](#float)
- [Booleanos (`tinyint(1)`)](#booleanos-tinyint1)
- [Strings e texto](#strings-e-texto)
- [Datas e horas](#datas-e-horas)
- [JSON e colunas serializadas](#json-e-colunas-serializadas)
- [Tabela-resumo](#tabela-resumo)

---

## Princípio: nullability decide ponteiro vs valor

- Coluna `NOT NULL` → tipo de valor direto em Go (`int64`, `string`).
- Coluna `NULL` → use `*T`, `sql.NullX`, ou um tipo opcional, para distinguir "zero" de "ausente". Confundir os dois é drift: um `0`/`""` gravado vira indistinguível de NULL.

## Inteiros

- `tinyint`/`smallint`/`mediumint`/`int`/`bigint` → `int8`/`int16`/`int32`/`int32`/`int64` conforme tamanho.
- `unsigned` → use o `uintN` correspondente **se** o domínio realmente não tem negativos; senão `int64` para evitar surpresas em subtração.
- `bigint unsigned` (IDs) → `uint64` ou `string` se for trafegar em JSON para clientes que perdem precisão.

## Decimais e dinheiro

- `decimal(p,s)` / `numeric` → **nunca** `float64`. Use `string` ou um tipo decimal (ex.: `shopspring/decimal`) para preservar precisão.
- Se o legado já tratava como float e perdia precisão, replique conscientemente (ver `php-quirks-capture/03-strings-numbers.md`), mas sinalize.

## Float

- `float`/`double` → `float32`/`float64`. Lembre que o PHP usa double; alinhe em `float64` e replique o arredondamento (`number_format`, `round`).

## Booleanos (`tinyint(1)`)

- MySQL não tem bool real; `tinyint(1)` é a convenção. Mapeie para `bool` em Go **se** o código sempre usa como 0/1.
- Cuidado: se a coluna guarda outros inteiros (2, 3...) apesar do `(1)`, ela **não** é bool — mapeie para `int8` e capture os significados.

## Strings e texto

- `char(n)` → string; lembre do padding de espaços à direita do `char` (MySQL faz strip na leitura por padrão, mas confirme).
- `varchar(n)`/`text`/`mediumtext`/`longtext` → `string`.
- Respeite o charset (ver `01-db-schema.md`): `utf8mb4` para emoji/acentos.
- Collation case/accent-insensitive afeta comparações — replique no `WHERE`/comparação Go se a lógica dependia disso.

## Datas e horas

- `datetime` → `time.Time` com `*time.Location` igual ao timezone efetivo do legado (ver `php-quirks-capture/05-dates-timezones.md`). Não guarda fuso na coluna.
- `timestamp` → `time.Time`; converte conforme `time_zone` da conexão — replique o mesmo `loc`/parâmetro de conexão no driver Go.
- `date` → `time.Time` (use só a parte da data) ou um tipo `civil.Date`.
- `time` → duração/`string` conforme uso.
- Colunas `NULL` de data → `*time.Time` ou `sql.NullTime`.

## JSON e colunas serializadas

- Coluna `json` (MySQL) → `json.RawMessage` ou struct tipada; valide o shape real.
- Coluna `text`/`blob` que guarda `serialize()` do PHP ou igbinary → ver `references/03-serialization-formats.md`; **não** trate como JSON sem confirmar.

## Tabela-resumo

| SQL | NOT NULL → Go | NULL → Go | Observação |
|-----|---------------|-----------|------------|
| `tinyint(1)` | `bool` | `*bool`/`sql.NullBool` | só se for 0/1 de fato |
| `int` / `int unsigned` | `int32`/`uint32` | ponteiro/Null | cuidado com unsigned em aritmética |
| `bigint unsigned` | `uint64`/`string` | ponteiro | precisão em JSON |
| `decimal(p,s)` | `decimal`/`string` | ponteiro | nunca float |
| `double` | `float64` | `sql.NullFloat64` | replicar arredondamento |
| `varchar/text` | `string` | `*string`/`sql.NullString` | charset/collation |
| `datetime` | `time.Time`+loc | `*time.Time`/`sql.NullTime` | timezone efetivo |
| `timestamp` | `time.Time` | `sql.NullTime` | `time_zone` da conexão |
| `json` | struct/`RawMessage` | ponteiro | validar shape |
| `text` (serializado) | ver ref. 03 | — | não é JSON |
