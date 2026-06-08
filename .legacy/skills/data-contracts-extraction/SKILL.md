---
name: data-contracts-extraction
description: >-
  Extrai o contrato exato dos recursos de dados que uma rota de um sistema
  legado em PHP toca — schema real das tabelas (tipos, nullability, defaults,
  índices, FKs, charset/collation), convenção e prefixo das chaves de cache,
  formato de serialização dos valores (php serialize, igbinary, json), contrato
  da API externa (endpoints, auth, shapes, erros, idempotência, fonte de
  verdade) e o mapeamento de tipos SQL/PHP para Go. Use SEMPRE que for migrar,
  portar ou reescrever uma rota PHP para Go reusando o MESMO banco e o MESMO
  cache, para garantir interoperabilidade e tipagem correta, mesmo que o pedido
  fale só em "migrar a rota". Acione junto do handoff, antes e durante o
  desenvolvimento da rota em Go.
---

# Data Contracts Extraction

Numa migração AS-IS que reaproveita banco e cache, o contrato dos dados é a **fonte de verdade** — não o que o código PHP supõe que os dados são, e não o estilo que você usaria num projeto Go novo. O Go precisa ler o que o PHP escreveu (e vice-versa) byte a byte: mesmo schema, mesma chave de cache, mesmo formato de serialização, mesma língua com a API externa. Esta skill extrai esse contrato.

## Quando usar

- Antes e durante o desenvolvimento da rota em Go, para tipar structs e clients corretamente.
- Sempre que houver coexistência (legado e Go lendo/escrevendo os mesmos recursos).
- Para alimentar a skill de planejamento de desenvolvimento com tipos e contratos prontos.

## Quando NÃO usar

- Para coerção/comportamento implícito da linguagem → use `php-quirks-capture`.
- Para *quando* os recursos são escritos/invalidados e em que ordem → use `side-effects-mapping`.

## Fluxo de trabalho

1. **Rastreie a rota.** Leia `references/00-route-tracing.md` para descobrir **quais** tabelas, chaves de cache e endpoints a rota toca. Você só extrai contrato do que ela usa.
2. **Extraia o schema** de cada tabela com `references/01-db-schema.md`, sempre do banco real (não infira do ORM).
3. **Documente as chaves de cache** com `references/02-cache-keys.md`, incluindo o prefixo efetivo do store real.
4. **Identifique o formato de serialização** dos valores com `references/03-serialization-formats.md` — o ponto mais arriscado da coexistência.
5. **Mapeie o contrato da API externa** com `references/04-external-api-contract.md`, com atenção à idempotência e à fonte de verdade.
6. **Traduza tipos para Go** com `references/05-type-mapping.md`.
7. **Monte o documento de contrato** (saída) e rode a auto-verificação.

## Index das references

- **Schema do banco** (colunas, tipos, null, defaults, índices, FKs, charset) → `references/01-db-schema.md`
- **Chaves de cache** (construção, prefixo de framework, hashing, tags, TTL) → `references/02-cache-keys.md`
- **Serialização** (php serialize vs igbinary vs JSON, interop com Go, estratégia de coexistência) → `references/03-serialization-formats.md`
- **API externa** (endpoints, auth, shapes, erros, idempotência, fonte de verdade) → `references/04-external-api-contract.md`
- **Mapeamento de tipos** (SQL/PHP → Go, nullability, decimais, datas, JSON) → `references/05-type-mapping.md`
- **Rastreamento da rota** (compartilhada) → `references/00-route-tracing.md`

Cada reference tem sumário no topo; consuma só a seção necessária.

## Formato de saída

Produza um markdown por rota, com uma seção por recurso:

```markdown
# Contratos de dados — <METHOD> <path>

Recursos tocados (do 00-route-tracing): <tabelas, chaves de cache, endpoints>

## Banco
<por tabela: tabela de colunas com tipo Go, índices, FKs, charset, observações>

## Cache
<por chave: template, prefixo efetivo, chave física real, hashing, tags, TTL>
<formato do valor (resumo) + link para a seção de serialização>

## Serialização
<formato por valor, evidência da amostra real, interop Go, estratégia de coexistência>

## API externa
<por endpoint: auth, request/response, erros, idempotência, fonte de verdade vs banco>

## Mapa de tipos consolidado
<lista campo legado → tipo Go, para alimentar o desenvolvimento>
```

## Princípios

- **O banco/cache real vence.** Schema autoritativo e amostras reais do store mandam mais que migrations desatualizadas ou suposições do ORM.
- **Interoperabilidade byte a byte.** Chave, formato de valor e tipos enviados à API precisam ser idênticos aos do PHP, ou a coexistência quebra em silêncio.
- **Nullability é informação.** `NULL` no banco vira ponteiro/Null em Go; tratar como zero value é drift.
- **Decisões de coexistência são de arquitetura.** Mudar formato de serialização ou fonte de verdade afeta dados do usuário; documente o trade-off em vez de decidir sozinho.

## Auto-verificação antes de entregar

- [ ] Todos os recursos do tracing tiveram contrato extraído (tabelas, chaves, endpoints)?
- [ ] Schema veio do banco real, com tipos, null, defaults, índices e FKs?
- [ ] Chave de cache inclui o prefixo efetivo observado no store real?
- [ ] Formato de serialização confirmado com amostra real (não suposto)?
- [ ] Estratégia de coexistência definida para valores em `serialize()`/igbinary?
- [ ] Contrato da API cobre idempotência e regra de fonte de verdade vs banco?
- [ ] Mapa de tipos respeita nullability e usa decimal/tempo corretos?
