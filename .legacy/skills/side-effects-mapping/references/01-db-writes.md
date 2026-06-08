# 01 — Escritas no banco

> Toda escrita (INSERT/UPDATE/DELETE) é um efeito que o AS-IS precisa reproduzir nas mesmas condições e na mesma ordem. Inclui efeitos indiretos (triggers, cascatas, auto-increment) que não aparecem como linha de código no handler.

## Sumário

- [O que inventariar por escrita](#o-que-inventariar-por-escrita)
- [Escritas indiretas e mágicas](#escritas-indiretas-e-mágicas)
- [`last_insert_id` e dependências entre escritas](#last_insert_id-e-dependências-entre-escritas)
- [Ordem entre tabelas](#ordem-entre-tabelas)
- [Auto-commit e modo da conexão](#auto-commit-e-modo-da-conexão)
- [Upserts e gravações condicionais](#upserts-e-gravações-condicionais)
- [Saída esperada](#saída-esperada)

---

## O que inventariar por escrita

Para cada INSERT/UPDATE/DELETE encontrado no call graph:

- Tabela e colunas afetadas.
- Operação (insert/update/delete/upsert/replace).
- Condição/branch sob a qual dispara.
- Valores gravados e sua origem (request, cálculo, default).
- Se está dentro de transação (ver reference 05).
- Se é idempotente (rodar duas vezes muda o resultado?).

## Escritas indiretas e mágicas

Procure ativamente escritas que não estão no handler:

- **Triggers de banco** (`BEFORE/AFTER INSERT/UPDATE`): podem gravar em outras tabelas, manter contadores, escrever auditoria. O Go vai disparar os mesmos triggers se usar o mesmo banco — mas você precisa saber que existem para não duplicar a lógica em código.
- **Foreign keys com `ON DELETE/UPDATE CASCADE`**: um DELETE apaga linhas em cascata.
- **ORM model events / observers** (Laravel `saving`/`saved`/`deleting`, Eloquent observers): gravam timestamps, soft-deletes, relacionamentos.
- **Soft delete**: `DELETE` no código pode ser, na verdade, um `UPDATE deleted_at`.
- **Timestamps automáticos**: `created_at`/`updated_at` preenchidos pelo ORM, não por SQL explícito.

## `last_insert_id` e dependências entre escritas

Se uma escrita usa o ID gerado pela anterior (`lastInsertId()`, `->id` após `save`), há uma **dependência de ordem** obrigatória. Reproduza a mesma sequência em Go; não paralelize nem reordene essas escritas.

## Ordem entre tabelas

A ordem em que as tabelas são gravadas pode importar por causa de FKs e de leitores concorrentes. Registre a sequência exata observada no legado e mantenha-a, mesmo que pareça arbitrária.

## Auto-commit e modo da conexão

- Conexão em auto-commit grava a cada statement; sem auto-commit, só no commit. Isso muda o que fica persistido em caso de falha no meio.
- Descubra o modo efetivo da conexão legada e replique no driver Go (ver também reference 05 sobre transações).

## Upserts e gravações condicionais

- `INSERT ... ON DUPLICATE KEY UPDATE`, `REPLACE INTO`, `updateOrCreate` têm semântica específica (REPLACE faz DELETE+INSERT, disparando triggers de delete!). Capture qual é usada.
- Gravações condicionais ("só atualiza se mudou") afetam `updated_at` e contadores.

## Saída esperada

```markdown
### Escrita N — <tabela> (<operação>)
- Onde: <arquivo::método>
- Condição: <branch que dispara>
- Colunas/valores: <campos e origem>
- Indiretos: <triggers/cascade/model events que dispara>
- Depende de: <escrita anterior / last_insert_id?>
- Transação: <sim/não — qual>
- Idempotente: <sim/não>
```
