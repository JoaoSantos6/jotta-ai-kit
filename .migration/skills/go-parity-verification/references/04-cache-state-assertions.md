# 04 — Assertions de estado do cache

> Cache é o ponto onde a coexistência byte-a-byte com o legado mais quebra em silêncio. Se o Go escrever na mesma chave que o PHP usa um formato diferente, o legado lê lixo (ou vice-versa). Esta reference cobre o que comparar e como, sem gerenciar Docker.

## Sumário

- [Escopo: quais chaves comparar](#escopo-quais-chaves-comparar)
- [Comparação byte a byte do valor](#comparação-byte-a-byte-do-valor)
- [TTL como contrato](#ttl-como-contrato)
- [Formato de serialização (coexistência)](#formato-de-serialização-coexistência)
- [Operações observáveis: set, get, del, expire](#operações-observáveis-set-get-del-expire)
- [Isolamento do teste sem gerenciar Docker](#isolamento-do-teste-sem-gerenciar-docker)
- [Saída esperada](#saída-esperada)

---

## Escopo: quais chaves comparar

Use o cruzamento de duas fontes:

- `data-contracts-extraction/02-cache-keys.md` — quais chaves a rota toca, com o **prefixo efetivo** do store real (não o template "lógico"; o prefixo de framework, ambiente, tenancy importa).
- `side-effects-mapping/02-cache-operations.md` — quando cada chave é tocada (set/get/del/expire), em que ordem em relação ao banco/API.

Compare apenas chaves tocadas pela rota. Comparar o store inteiro é ruído. Mas atenção: chaves que **deveriam** ter sido tocadas e não foram são drift — capture a ausência tanto quanto a presença.

## Comparação byte a byte do valor

A comparação é em **bytes**, não na versão desserializada. Razões:

- O legado pode coexistir com o Go: o PHP precisa conseguir ler o que o Go gravou (e vice-versa). Isso só funciona se o formato for idêntico ao byte.
- Comparar versões "humanas" (deserializadas) esconde diferenças de ordem de campos, escaping, tipo (`"1"` vs `1`).
- Diferenças de bytes que não afetam o leitor são raras; quase sempre indicam drift.

Procedimento:

1. Leia o valor com `client.Get(ctx, key).Bytes()` (go-redis) ou equivalente do driver real.
2. Compare contra o `cache.after.json` do golden, no campo `value_b64`.
3. Para diferenças, decodifique os dois lados para diagnóstico, mas a falha do diff vem da comparação de bytes.

## TTL como contrato

TTL **é** contrato:

- Se a rota define TTL de 300s e o Go usa 600s, dobra a janela em que dados velhos servem. Drift.
- Se o legado **não** seta TTL (`SET` sem expire) e o Go seta, a chave passa a expirar — quebra silenciosamente.
- Se o legado seta TTL e o Go não, a chave fica eterna — pressão no Redis e dados velhos.

Compare via `client.PTTL(ctx, key)` ou equivalente. Tolerância aceita: a diferença entre captura e replay (poucos ms a poucos segundos). Documente a tolerância no normalizador. Acima dela, é drift.

Para chaves que o golden capturou como `TTL = -1` (sem expire) ou `TTL = -2` (não existe), compare exatamente.

## Formato de serialização (coexistência)

Esse é **o** ponto crítico. O legado pode usar:

- `serialize()` do PHP (formato `s:N:"..."`, `a:N:{...}`).
- `igbinary` (binário compacto do PHP, sem equivalente nativo em Go — precisa de lib específica).
- `json` (com escaping/ordem do PHP).
- `msgpack`.
- Raw string/int.

Detecte qual com `data-contracts-extraction/03-serialization-formats.md`. No teste de paridade do Go:

- Use a mesma lib (`go-php-serialize` para `serialize`, port de igbinary, encoder JSON com flags equivalentes) para gravar no mesmo formato.
- Para `serialize()` do PHP, **ordem dos campos no objeto/array associativo importa**. Se o legado gravou `a:2:{s:1:"a";...;s:1:"b";...}` em ordem A→B, e o Go gravar B→A, o leitor PHP funciona, mas o byte difere. Em coexistência, alinhe a ordem.
- Para JSON, configure o encoder Go para emitir como o PHP: escape de `/`, unicode escapado se o legado escapa, sem trailing newline (`json.Encoder` adiciona; use `json.Marshal`).

A regra geral: **o golden é o veredito**. O Go grava até bater bytes com o golden, ou justifica a divergência caso a caso (raríssimo).

## Operações observáveis: set, get, del, expire

Para alguns testes, comparar o **estado final** não é suficiente — a **sequência de operações** importa (ex.: `set` antes de `del` vs `del` antes de `set` resultam no mesmo estado final, mas em comportamento diferente em concorrência). Quando isso for relevante (geralmente é, em coexistência), instrumente:

- Use um wrapper do cliente Redis que grave cada operação (chave, op, args, ordem). `miniredis` pode reportar comandos; clientes reais aceitam middlewares/hooks.
- Compare a sequência contra `side-effects-mapping/02-cache-operations.md`.

## Isolamento do teste sem gerenciar Docker

Opções compatíveis com o rule de não-Docker:

1. **`miniredis`** (`github.com/alicebob/miniredis/v2`): Redis in-process puro Go. Implementa a maioria dos comandos. Use para asserts byte a byte do valor escrito. Limitações: alguns comandos avançados (Lua scripts complexos, módulos) podem não estar disponíveis — verifique se a rota usa.
2. **Fake do client**: implementar a interface do `redis.Cmdable` num fake em processo que grave o estado. Útil quando só se quer asserts de chamadas, não de estado.
3. **Redis de teste pré-provido pelo harness**: igual à estratégia 2 do banco — assume um `REDIS_URL` exposto pelo harness, sem gerenciar o ciclo de vida.

Para Memcached, fakes em processo existem (`memcached/mock`), mas são menos maduros. Se a rota usa Memcached, dependa do harness ou de um fake de interface.

Em nenhum caso escreva código que invoque `docker run`/`docker compose up`. Se a verificação **só** funciona com um Redis real e o harness não provê, sinalize como bloqueio para o time, não para a skill.

## Saída esperada

```markdown
### Cache — caso <id>
Chaves comparadas: <lista> (prefixo efetivo: <...>)
Formato detectado: <serialize | igbinary | json | msgpack | raw>

| Chave | Operação | Bytes (Go) | Bytes (legado) | TTL (Go) | TTL (legado) | Diferenças |
|-------|----------|------------|----------------|----------|--------------|------------|
| <chave-1> | SET | <hash> | <hash> | 300s | 300s | nenhuma |
| <chave-2> | SET | <hash> | <hash> | 600s | 300s | TTL diverge (drift) |
| <chave-3> | DEL | -      | -      | -    | -    | nenhuma |

Sequência de operações observada (Go vs legado):
1. SET <chave-1> ... — igual ao legado em ordem
2. ...

Normalizadores aplicados:
- TTL: tolerância 200ms (variação entre captura/replay)
```
