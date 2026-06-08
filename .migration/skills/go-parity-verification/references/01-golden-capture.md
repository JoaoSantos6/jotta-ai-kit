# 01 — Captura de goldens do legado

> O golden é o **registro do que o legado de fato faz** para um conjunto de inputs. Em paridade AS-IS ele vale mais que qualquer BDD: BDD descreve a intenção, o golden descreve a realidade — inclusive bugs que o consumidor já pode depender. Esta reference cobre como obter goldens reais, completos e determinísticos.

## Sumário

- [O que precisa estar no golden](#o-que-precisa-estar-no-golden)
- [Como gravar a resposta HTTP](#como-gravar-a-resposta-http)
- [Snapshot do estado do banco](#snapshot-do-estado-do-banco)
- [Dump das chaves de cache tocadas](#dump-das-chaves-de-cache-tocadas)
- [Registro das chamadas à API externa](#registro-das-chamadas-à-api-externa)
- [Versionar e manter determinístico](#versionar-e-manter-determinístico)
- [Atualização de goldens](#atualização-de-goldens)
- [Saída esperada por caso](#saída-esperada-por-caso)

---

## O que precisa estar no golden

Para cada caso de teste (input), o golden tem quatro blocos:

1. **Resposta HTTP**: status, headers relevantes (incluindo `Content-Type`, `Set-Cookie` se houver), corpo.
2. **Estado do banco** antes e depois do request, restrito às tabelas que `side-effects-mapping` listou como tocadas.
3. **Estado do cache**: chaves tocadas (lidas, escritas, invalidadas), valor (em bytes), TTL e, quando aplicável, **formato de serialização**.
4. **Chamadas externas** disparadas pelo request: método, URL, headers significativos, payload, e a ordem entre elas e entre elas e os efeitos de banco/cache.

Faltar um bloco é deixar uma janela de drift. Resposta certa com cache errado é o caso clássico que só aparece em produção.

## Como gravar a resposta HTTP

Use o ambiente legado em modo controlado (estado conhecido de banco/cache, relógio fixado). Para cada caso:

- Faça o request com `curl -i` ou um cliente HTTP que grave headers + body. Salve o resultado bruto.
- Normalize **antes de salvar** apenas o que `02-diff-strategy.md` permitir (ex.: ordem de chaves JSON). Nunca normalize valor de negócio na hora da captura — você perde o original.
- Salve o request também (método, path, query, headers de entrada, body) para que o teste seja reproduzível.

Estrutura sugerida:

```
testdata/parity/<rota>/<caso>/
├── request.http        # request bruto (método, headers, body)
├── response.http       # response bruto (status, headers, body)
├── db.before.sql       # estado relevante do banco antes
├── db.after.sql        # estado relevante do banco depois
├── cache.before.json   # chaves tocadas + valor + TTL antes
├── cache.after.json    # chaves tocadas + valor + TTL depois
└── external.calls.json # sequência de chamadas externas (ordenada)
```

## Snapshot do estado do banco

- Restrinja o snapshot às tabelas listadas em `side-effects-mapping/01-db-writes.md`. Snapshot do banco inteiro polui e mascara diferenças relevantes.
- Para cada tabela, salve as linhas tocadas com **todas** as colunas. Não selecione `*` mentalmente; explicite as colunas para fixar o contrato (tipos vêm de `data-contracts-extraction/05-type-mapping.md`).
- Capture campos voláteis (IDs autoincrement, `created_at`/`updated_at`) **com seu valor original**. A normalização é tarefa do diff, não da captura.
- Para inserts, marque o que é novo vs o que já existia. Para updates, capture antes/depois.

## Dump das chaves de cache tocadas

- Liste as chaves a partir de `data-contracts-extraction/02-cache-keys.md` (com o **prefixo efetivo** do store real) e `side-effects-mapping/02-cache-operations.md` (quando são tocadas, em que ordem).
- Para cada chave: existência (hit/miss/none), **bytes do valor** (não a versão "humana" desserializada), TTL restante.
- Em Redis, prefira capturar com `DUMP <key>` (binário) ou `GET <key>` com saída crua em base64. Em Memcached, capture o valor em hex. O objetivo é preservar a serialização original (ver `data-contracts-extraction/03-serialization-formats.md`).
- Marque o **formato detectado**: `php serialize`, `igbinary`, `json`, `msgpack`, raw. Em coexistência com o legado, o Go precisa reproduzir esse formato byte a byte — então o golden tem que dizer qual é.

## Registro das chamadas à API externa

A rota toca uma API que **já contém parte das respostas do usuário**. Errar a ordem ou duplicar pode contaminar dados reais. Capture:

- Para cada chamada: método, URL (com query), headers significativos (auth removido/sanitizado), body.
- Ordem absoluta entre chamadas externas **e** ordem relativa a banco/cache (use `side-effects-mapping/05-ordering-and-transactions.md`).
- Política de idempotência observada: a rota fez `GET` antes do `POST`? Reaproveita resposta existente? Envia chave de idempotência?
- Em ambiente de captura, use um proxy de gravação (mitmproxy, vcr-like) ou um servidor de mock que grave as requisições. **Nunca capture em produção** sem permissão explícita e sanitização.

Estrutura sugerida do `external.calls.json`:

```json
[
  {
    "order": 1,
    "after_db_op": "INSERT onboarding",
    "method": "POST",
    "url": "https://api.parceiro/answers",
    "headers": { "Content-Type": "application/json", "X-Idempotency-Key": "<sanitizado>" },
    "body_b64": "..."
  }
]
```

## Versionar e manter determinístico

Um golden flaky não prova paridade — apenas adiciona ruído. Antes de aceitar um golden no repositório, garanta:

- **Relógio fixado** durante a captura (a maioria dos legados aceita injeção via clock service, env var ou flag de debug). Se não há injeção, anote o instante exato e use-o no replay.
- **RNG controlado**: se a rota usa `rand`/`uuid` no PHP, identifique a semente e fixe; se não há controle, marque os campos afetados como **normalizáveis** explicitamente em `02-diff-strategy.md`.
- **Ordem de chaves JSON estabilizada**: PHP frequentemente preserva ordem de inserção em arrays associativos; o Go com `encoding/json` ordena alfabeticamente em maps. Decida no diff (ver 02), mas capture o original sem reordenar.
- **Versione os arquivos** no repositório do Go, em `testdata/parity/...`. O golden é parte do código do teste, não dado externo.
- **Rotule cada golden** com (rota, caso, versão do schema do banco, versão do contrato da API). Mudou o schema → talvez precise regravar.

## Atualização de goldens

Goldens **não** são "tudo bem regravar quando o teste vermelhar". Regra:

1. Diff falhou → primeiro investigue se é drift do Go. Maioria das vezes é.
2. Se a fonte mudou (legado teve fix legítimo, schema mudou, contrato da API mudou), regrave o golden explicitamente, documentando o motivo no commit/PR.
3. Regravação por conveniência ("o teste estava chato") é um cheiro forte; bloqueie por revisão de PR.
4. Goldens podem ser regrabados em lote por uma flag (`-update-goldens`), mas o diff resultante **precisa entrar na PR** para revisão humana.

## Saída esperada por caso

Para cada caso de teste, um diretório com a estrutura listada acima e um `README.md` curto descrevendo:

- Cenário (input, pré-condições, intenção).
- Quirks/bugs herdados que esse golden trava intencionalmente (com link para `php-quirks-capture` quando aplicável).
- Normalizações esperadas no diff (com link para `02-diff-strategy.md`).
- Última recaptura: data, motivo, autor.

Esses metadados evitam que daqui a seis meses alguém regrabe o golden achando que "estava errado".
