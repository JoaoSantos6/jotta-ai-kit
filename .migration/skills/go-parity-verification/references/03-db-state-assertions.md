# 03 — Assertions de estado do banco

> Resposta certa com banco errado é o caso clássico de drift mascarado. Esta reference cobre como comparar o estado do banco depois do request Go contra o golden do legado, respeitando tipos e isolando o teste **sem gerenciar Docker ativamente**.

## Sumário

- [Escopo da comparação](#escopo-da-comparação)
- [Comparar linhas e colunas](#comparar-linhas-e-colunas)
- [Tipos: por que `string` ≠ `number` mesmo quando "parece igual"](#tipos-por-que-string--number-mesmo-quando-parece-igual)
- [Efeitos indiretos: triggers, cascade, defaults](#efeitos-indiretos-triggers-cascade-defaults)
- [Como isolar cada caso de teste](#como-isolar-cada-caso-de-teste)
- [Estratégias sem gerenciar Docker](#estratégias-sem-gerenciar-docker)
- [Saída esperada](#saída-esperada)

---

## Escopo da comparação

Não compare o banco inteiro. Restrinja às tabelas listadas em `side-effects-mapping/01-db-writes.md` para a rota — mais qualquer tabela tocada indiretamente por triggers/cascade que aparece em `side-effects-mapping/05-ordering-and-transactions.md`. Tudo fora desse conjunto é ruído que pollui o diff.

Para cada tabela, decida:

- Comparar **todas** as linhas afetadas pelo request (inserts/updates/deletes).
- Não comparar linhas pré-existentes intocadas — se foram alteradas, é drift; capture-as como afetadas.

## Comparar linhas e colunas

- Identifique cada linha por **chave natural ou PK estável**, não por PK autoincrement (que vai diferir entre runs). Quando a PK autoincrement for o único identificador, normalize por padrão de referência (linha A.fk = linha B.pk), não por valor.
- Compare **coluna por coluna**, com o tipo Go correto (vindo de `data-contracts-extraction/05-type-mapping.md`). Não compare via `fmt.Sprintf`/string concat — você esconde diferenças de tipo.
- Para colunas `NULL`: distinga `NULL` de zero value. Use `sql.NullString`/`sql.NullInt64` ou ponteiros, e asserts que distingam os dois.
- Para colunas `JSON`/`JSONB`: parse os dois lados em estruturas comparáveis (não compare strings JSON cruas; ordem de chaves pode divergir — ver `02-diff-strategy.md`).

## Tipos: por que `string` ≠ `number` mesmo quando "parece igual"

PHP frequentemente devolve `"1"` (string) onde o Go espera `int`. Se o teste comparar via `==` depois de stringificar, você não percebe. Drives Go bem configurados (`sqlc`, `pgx`, `sqlx` com structs tipadas) tipam corretamente; ORMs frouxos (gorm com `interface{}`) podem esconder. Force a leitura para o tipo declarado no schema antes de comparar — se a leitura falhar, é drift.

Pontos de atenção (referencie `php-quirks-capture/03-strings-numbers.md`):

- `DECIMAL`/`NUMERIC`: comparar com `decimal.Decimal`, **não** com `float64`. Diferença de centavo é drift.
- `DATETIME`/`TIMESTAMP`: compare em UTC explícito, com a precisão que o schema usa (segundos, milissegundos). `TIMESTAMPTZ` no Postgres normaliza para UTC ao ler; `DATETIME` no MySQL não tem timezone — confie no que o golden captou.
- `ENUM`/`SET` MySQL: o legado pode gravar valor case-insensitive; o Go pode normalizar. Compare o valor cru.
- `BIT(1)` MySQL: o legado pode ler como `"\x00"`/`"\x01"`, o Go como `bool`. Force o tipo na leitura.

## Efeitos indiretos: triggers, cascade, defaults

Tabelas que ninguém escreve no handler mas mudam de estado:

- **Triggers**: o golden pega o estado pós-request, então elas já estão refletidas. Mas se o Go usa um driver que desabilita triggers (raro, mas possível com replicação), você verá drift no `_after` e não no `_before`.
- **Cascade**: deletes que propagam por FK. Inclua as tabelas filhas no escopo de comparação.
- **Defaults gerados pelo banco**: `DEFAULT CURRENT_TIMESTAMP`, sequências, `GENERATED ALWAYS AS`. Esses valores existem só pós-insert; normalize se forem voláteis (timestamps), mantenha se forem determinísticos.
- **Listeners/observers que rodam fora do banco**: efeitos de model events do Laravel/Eloquent são código PHP — em Go, o equivalente é código Go explícito. Se o legado escreve em uma tabela secundária via observer e o Go esquece, o golden expõe.

## Como isolar cada caso de teste

Cada caso precisa começar de um estado conhecido e não contaminar o próximo. Opções, em ordem de preferência:

1. **Transação por teste** (`sqlx`/`database/sql`): abra transação no `setup`, faça o request usando uma conexão que reutilize a transação (ou um pool atado a ela), faça asserts, **rollback** no `cleanup`. Limitação: o código Go precisa aceitar `*sql.Tx` ou `DBTX`-like; chamadas que abrem nova transação dentro precisam ser controladas.
2. **`go-txdb`** (drivers `txdb`/`txdb-go`): registra um driver que aplica todas as queries num scope de transação e rola back ao fechar. Funciona quando o código abre sua própria conexão.
3. **Banco de teste por caso**: cada teste cria um schema/database novo, popula a partir do golden `db.before.sql`, roda o request, compara contra `db.after.sql`, dropa. Lento, mas robusto contra qualquer padrão de conexão.
4. **`sqlmock`** para queries determinísticas: útil para erros e para queries que não precisam tocar banco real. Não substitui um banco real quando a rota grava lógica complexa.

Em todos os casos: relógio fixado (`clock.Now()` injetável), RNG fixado, ordem de iteração estabilizada.

## Estratégias sem gerenciar Docker

O projeto tem rule explícita: **não subir/derrubar containers ativamente**. As opções compatíveis:

- **Fakes/mocks em processo**: `sqlmock` para casos onde a query é controlada; `dockertest`-style **não** é permitido pelo rule. Para Postgres puro, `pgxmock` e `pgxpool` fakes existem.
- **Banco de teste pré-provido pelo harness**: o projeto pode já expor uma fixture de banco gerenciada por outro mecanismo (CI, devcontainer, processo separado). Conecte-se ao DSN exposto e use estratégia 1 ou 2 acima.
- **`go-txdb`/`txdb` + banco já existente**: assume que o DSN aponta para um Postgres/MySQL acessível, mas **não gerencia o ciclo de vida** do container.
- **Embedded** (`embedded-postgres` para Postgres, em processo): aceitável porque não invoca Docker; sobe um binário local. Verifique a licença e o tamanho.

Se a única opção realista para uma assertion específica for um container, **delegue ao harness do projeto** com uma instrução clara ("este teste requer Postgres acessível via `DATABASE_URL`; o harness é responsável por provê-lo"). Não escreva código que chame `docker run`/`docker compose up`.

## Saída esperada

Para cada caso, dentro do relatório de paridade da Skill A:

```markdown
### Banco — caso <id>
Tabelas comparadas: <lista>

| Tabela | Linhas afetadas (Go) | Linhas afetadas (legado) | Diferenças |
|--------|----------------------|--------------------------|------------|
| onboarding | +1 | +1 | nenhuma |
| onboarding_answers | +5 | +5 | coluna `value` em #3: `0` vs `"0"` (drift, ver `php-quirks-capture/03`) |
| audit_log (via trigger) | +1 | +1 | nenhuma |

Normalizadores aplicados:
- `created_at`, `updated_at` (gerados pelo banco, escopo: todas as tabelas)
- `id` autoincrement (comparado por padrão de referência, não valor)
```
