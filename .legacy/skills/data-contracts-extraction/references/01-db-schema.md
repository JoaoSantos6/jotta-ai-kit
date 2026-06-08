# 01 — Schema do banco

> Como o AS-IS reusa o mesmo banco, o schema é a fonte de verdade — não o que o código PHP "acha" que os dados são. Extraia o schema real das tabelas que a rota toca: tipos, nullability, defaults, índices e FKs, com a tradução de tratamento para Go.

## Sumário

- [O que extrair por tabela](#o-que-extrair-por-tabela)
- [Como obter o schema real](#como-obter-o-schema-real)
- [Nullability e defaults](#nullability-e-defaults)
- [Índices, únicos e o que eles implicam](#índices-únicos-e-o-que-eles-implicam)
- [Foreign keys e cascatas](#foreign-keys-e-cascatas)
- [Charset e collation](#charset-e-collation)
- [Divergência schema × uso no código](#divergência-schema--uso-no-código)
- [Saída esperada](#saída-esperada)

> Para o mapeamento de tipo coluna → tipo Go, veja `references/05-type-mapping.md`.

---

## O que extrair por tabela

Para cada tabela lida/escrita pela rota (vinda do `00-route-tracing`):

- Colunas, na ordem do schema.
- Tipo SQL exato (incluindo tamanho/precisão: `varchar(255)`, `decimal(10,2)`, `tinyint(1)`).
- Nullability (`NULL`/`NOT NULL`).
- Default.
- Auto-increment / generated columns.
- Índices (incluindo únicos e compostos).
- Foreign keys e ações de cascata.
- Charset/collation por coluna se divergir da tabela.

## Como obter o schema real

Prefira o schema autoritativo a inferir do ORM:

```sql
SHOW CREATE TABLE <tabela>;          -- MySQL: visão completa
DESCRIBE <tabela>;                    -- resumo de colunas
SHOW INDEX FROM <tabela>;             -- índices
```

Confirme contra migrations versionadas, se existirem. Se schema e migrations divergirem, o **banco real** vence num AS-IS.

## Nullability e defaults

- Coluna `NOT NULL` com default → o ORM pode omitir na inserção e o banco preenche. Em Go você precisa replicar o default ou enviar o valor.
- Coluna `NULL` → o campo Go correspondente precisa distinguir "zero" de "ausente" (ponteiro, `sql.NullX`, ou tipo opcional). Ver type-mapping.
- Defaults como `CURRENT_TIMESTAMP`, `ON UPDATE CURRENT_TIMESTAMP` são efeitos do banco — não os duplique em código sem necessidade.

## Índices, únicos e o que eles implicam

- Índice **único** define a chave natural — provavelmente o que decide insert vs update na rota (ver side-effects). Capture as colunas exatas.
- Índice composto sugere padrão de consulta; a ordem das colunas importa.
- Violação de único gera erro específico que o legado pode capturar e tratar (ex.: "já respondeu") — esse tratamento é AS-IS.

## Foreign keys e cascatas

- `ON DELETE CASCADE`/`SET NULL` produzem escritas indiretas (ver side-effects 01).
- FKs definem ordem de inserção (pai antes de filho). Registre para o desenvolvimento Go respeitar.

## Charset e collation

- Collation define comparação e ordenação de strings no banco (`utf8mb4_general_ci` é case-insensitive e accent-insensitive). Uma busca/`WHERE` que casava "JOSÉ" com "jose" depende disso.
- Charset errado corrompe acentos/emoji. Confirme `utf8mb4` vs `utf8` (este último, no MySQL, não guarda emoji).

## Divergência schema × uso no código

Anote quando o código trata um campo de forma diferente do tipo da coluna:

- Coluna `varchar` usada como número.
- Coluna `tinyint(1)` usada como bool (comum) ou como inteiro de fato.
- Coluna `JSON`/`text` guardando estrutura serializada (ver reference 03).

Essas divergências guiam o tipo Go correto.

## Saída esperada

```markdown
### Tabela <nome>
| Coluna | Tipo SQL | Null | Default | Extra | Tipo Go sugerido |
|--------|----------|------|---------|-------|------------------|
| id     | bigint unsigned | NOT NULL | — | auto_increment | uint64 |
| ...    | ...      | ...  | ...     | ...   | ...              |

Índices: <PK, únicos (colunas), compostos>
FKs: <coluna → tabela.coluna, ação de cascata>
Charset/collation: <...>
Observações de uso: <divergências schema × código>
```
