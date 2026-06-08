# 04 — Contrato da API externa

> A API externa já contém parte das respostas do usuário e continua sendo fonte de verdade compartilhada. O contrato (endpoints, shapes, auth, erros, idempotência) é AS-IS: o Go precisa falar exatamente a mesma língua que o PHP fala com ela.

## Sumário

- [O que extrair por endpoint](#o-que-extrair-por-endpoint)
- [Autenticação](#autenticação)
- [Shape de request e response](#shape-de-request-e-response)
- [Códigos de erro e semântica](#códigos-de-erro-e-semântica)
- [Idempotência e identificação de registro](#idempotência-e-identificação-de-registro)
- [Paginação e listagem](#paginação-e-listagem)
- [Fonte de verdade: API × banco](#fonte-de-verdade-api--banco)
- [Saída esperada](#saída-esperada)

> Para o **efeito** das chamadas (ordem, retry, fire-and-forget), veja `side-effects-mapping/03-external-api-calls.md`. Aqui o foco é o **contrato de dados**.

---

## O que extrair por endpoint

Para cada endpoint que a rota consome:

- Método + URL (e como a base URL é configurada por ambiente).
- Headers obrigatórios.
- Corpo do request (campos, tipos, obrigatoriedade).
- Corpo da response (campos, tipos).
- Status codes esperados e seu significado.

Extraia do código do client legado **e**, se houver, de documentação/contrato oficial da API. Onde divergirem, o comportamento real do legado vence para o AS-IS.

## Autenticação

- Tipo: API key, Bearer/OAuth, HMAC assinado, basic.
- Onde o segredo vem (env, config, vault) — **não** copie segredos para a documentação.
- Renovação de token (o legado faz refresh? cacheia token?).
- O Go precisa replicar o mesmo esquema e, se houver token cacheado, possivelmente a mesma chave de cache (ver reference 02).

## Shape de request e response

Documente o shape exato. Atenção a:

- Nomes de campo (snake_case vs camelCase) — a API dita, não o seu estilo Go.
- Tipos: a API espera `"123"` (string) ou `123` (número)? Datas em qual formato/fuso?
- Campos opcionais vs obrigatórios; o que acontece se omitir.
- Envelopes (`{ "data": {...} }`) e metadados.

## Códigos de erro e semântica

- Mapeie cada status que a API retorna e o que significa no domínio (404 = não existe? 409 = já respondido?).
- A API retorna 200 com erro no corpo? (comum) — capture o shape do erro.
- Como o legado interpreta cada um (ver tratamento de falha em side-effects 03).

## Idempotência e identificação de registro

Crítico porque a API já tem respostas:

- Qual identificador correlaciona uma resposta local a uma da API (user_id + question_id? um external_id?).
- Reenviar a mesma resposta cria duplicata, sobrescreve, ou é rejeitado?
- A API aceita header de idempotência? O legado o envia?
- Há um GET para checar existência antes de gravar?

## Paginação e listagem

Se a rota lê respostas já existentes da API:

- Estilo de paginação (offset/limit, cursor, page).
- Limite por página e como iterar.
- Ordenação garantida ou não.

## Fonte de verdade: API × banco

Quando o mesmo dado existe nos dois lados, o legado tem uma regra (explícita ou implícita) de qual vence e como reconcilia. Capture-a:

- Na leitura, a rota prefere banco ou API? Faz merge?
- Em conflito (valores diferentes), quem ganha?
- Essa regra é AS-IS e precisa ser idêntica no Go; um "conserto" aqui muda dados do usuário.

## Saída esperada

```markdown
### Endpoint <método> <url>
- Auth: <esquema; origem do segredo (sem expor)>
- Request: <campos, tipos, obrigatoriedade>
- Response (sucesso): <shape>
- Erros: <status → significado → tratamento no legado>
- Idempotência: <identificador de correlação; comportamento em reenvio>
- Paginação (se leitura): <estilo, limite>
- Fonte de verdade vs banco: <regra de precedência/reconciliação>
```
