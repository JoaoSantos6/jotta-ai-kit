# 02 — Chaves de cache

> O cache é compartilhado entre legado e novo serviço. Para que o Go leia o que o PHP escreveu (e vice-versa), a **chave** precisa ser idêntica byte a byte — incluindo prefixos que o framework adiciona sem aparecer no código.

## Sumário

- [Por que a chave exata importa](#por-que-a-chave-exata-importa)
- [Prefixos invisíveis de framework](#prefixos-invisíveis-de-framework)
- [Como a chave é construída no código](#como-a-chave-é-construída-no-código)
- [Hashing de chave](#hashing-de-chave)
- [Namespaces e tags](#namespaces-e-tags)
- [TTL](#ttl)
- [Saída esperada](#saída-esperada)

> Para o **formato do valor** guardado sob a chave, veja `references/03-serialization-formats.md`. Para o **efeito** (quando escreve/invalida), veja `side-effects-mapping/02-cache-operations.md`.

---

## Por que a chave exata importa

Uma chave divergente faz o Go nunca achar o que o PHP gravou — sem erro, só miss perpétuo e dado recalculado/duplicado. Durante a coexistência, isso quebra a consistência entre os dois sistemas de forma silenciosa.

## Prefixos invisíveis de framework

Frameworks prefixam a chave configurada:

- **Laravel**: `cache.prefix` (config) + a chave; o store Redis também usa o prefixo de database/connection. A chave física pode ser `laravel_cache:minha_chave` ou similar.
- **Symfony Cache**: namespaces e um prefixo derivado do pool.
- **Redis cru**: pode haver prefixo de aplicação concatenado manualmente.

Descubra o prefixo **efetivo** inspecionando o Redis/Memcached real (`KEYS *`, `SCAN`) — não confie só na string do código.

```bash
# inspeção do que existe de fato (cuidado com KEYS em produção; prefira SCAN)
redis-cli --scan --pattern '*onboarding*' | head
```

## Como a chave é construída no código

Capture a expressão exata que monta a chave, com a origem de cada parte:

- IDs concatenados (`"user:" . $userId . ":onboarding"`).
- Hash de parâmetros.
- Versão/namespace embutido (`"v2:..."`).

Reproduza a mesma concatenação em Go, com os mesmos separadores e na mesma ordem.

## Hashing de chave

Se a chave passa por `md5`/`sha1`/`crc32` antes de ir ao cache, o Go precisa usar **o mesmo algoritmo sobre exatamente a mesma string de entrada** (mesmos separadores, mesma serialização de parâmetros). Diferença de um caractere muda o hash inteiro.

## Namespaces e tags

- Cache tags (Laravel) geram chaves auxiliares e mudam o padrão físico — invalidação por tag não é um simples `DEL`.
- Se a rota usa tags, documente; replicar em Go exige reproduzir a estrutura de tag, não só a chave lógica.

## TTL

Registre o TTL por chave (segundos). Embora o TTL seja mais "efeito" que "contrato", ele pertence ao contrato de coexistência: TTLs diferentes entre PHP e Go fazem as entradas expirarem em momentos distintos.

## Saída esperada

```markdown
### Chave lógica: <descrição>
- Template no código: `<expressão de construção>`
- Origem das partes: <userId do request, etc.>
- Hashing: <nenhum | md5(sobre qual string)>
- Prefixo efetivo (do store real): <ex. laravel_cache:>
- Chave física resultante (exemplo real): <string completa>
- Tags/namespace: <se houver>
- TTL: <segundos>
```
