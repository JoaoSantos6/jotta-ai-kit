# 02 — Operações de cache

> O cache é compartilhado entre legado e novo serviço (migração AS-IS reusa o mesmo cache). Escrever ou invalidar de forma diferente corrompe o estado para os dois lados. Mapeie cada operação, sua chave, TTL e a ordem em relação às escritas de banco.

## Sumário

- [O que inventariar por operação](#o-que-inventariar-por-operação)
- [Padrões de invalidação](#padrões-de-invalidação)
- [Ordem cache × banco](#ordem-cache--banco)
- [TTL, stampede e locks](#ttl-stampede-e-locks)
- [Convivência legado × novo serviço](#convivência-legado--novo-serviço)
- [Saída esperada](#saída-esperada)

> Para o formato/serialização do **valor** armazenado e a convenção de **chaves**, veja a skill `data-contracts-extraction` (references 02 e 03). Aqui o foco é o **efeito** (quando escreve/invalida e em que ordem).

---

## O que inventariar por operação

Para cada acesso de cache no call graph (`Cache::`, `$redis->`, `$memcached->`, `apcu_*`):

- Operação: get / set / delete(forget) / increment / flush / add.
- Chave exata (e como é construída — ver contratos).
- TTL aplicado no set.
- Condição/branch que dispara.
- Ordem relativa às escritas de banco.

## Padrões de invalidação

- **Write-through**: grava banco e cache juntos.
- **Invalidate-on-write**: grava banco e **apaga** a chave (próxima leitura repovoa).
- **Cache-aside**: leitura tenta cache, em miss lê banco e popula.

Identifique qual padrão a rota usa por chave; replicar o padrão errado gera dado obsoleto servido ao outro lado.

## Ordem cache × banco

A ordem importa para correção sob concorrência:

- Invalidar **antes** de gravar o banco abre janela para repovoar com dado velho.
- Invalidar **depois** de commitar é o usual. Capture a ordem exata do legado e preserve-a.
- Se a invalidação está dentro ou fora da transação muda o instante efetivo (ver reference 05).

## TTL, stampede e locks

- Anote o TTL por chave; um TTL diferente no Go muda o comportamento observável.
- Verifique locks/mutex de cache (ex.: `Cache::lock`, `SETNX`) usados para evitar stampede. São efeitos com semântica própria — replique-os.

## Convivência legado × novo serviço

Durante a migração, legado e Go podem ler/escrever as mesmas chaves ao mesmo tempo. Garanta que:

- A **chave** gerada em Go seja byte a byte igual à do PHP (prefixos de framework incluídos).
- O **formato do valor** seja compatível (ver `data-contracts-extraction/03-serialization-formats.md`) — senão um lado não lê o que o outro escreveu.
- O **TTL** seja equivalente.

## Saída esperada

```markdown
### Cache op N — <chave>
- Operação: <get/set/forget/incr/...>
- Onde: <arquivo::método>
- Condição: <branch>
- TTL: <valor ou n/a>
- Padrão: <write-through | invalidate-on-write | cache-aside>
- Ordem vs banco: <antes/depois de qual escrita>
- Dentro de transação: <sim/não>
```
