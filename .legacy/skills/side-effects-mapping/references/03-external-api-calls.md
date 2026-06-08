# 03 — Chamadas à API externa

> A rota de onboarding grava respostas também numa API externa (que já contém parte das respostas). Cada chamada é um efeito observável fora do seu sistema; reproduzir condição, ordem, retry e idempotência é essencial para não duplicar ou perder dados durante a migração.

## Sumário

- [O que inventariar por chamada](#o-que-inventariar-por-chamada)
- [Bloqueante vs fire-and-forget](#bloqueante-vs-fire-and-forget)
- [Retry, timeout e backoff](#retry-timeout-e-backoff)
- [Idempotência e duplicação](#idempotência-e-duplicação)
- [Tratamento de falha e efeito no fluxo](#tratamento-de-falha-e-efeito-no-fluxo)
- [Ordem vs banco e cache](#ordem-vs-banco-e-cache)
- [Saída esperada](#saída-esperada)

> Para o **contrato** da API (shape de request/response, auth, códigos de erro), veja `data-contracts-extraction/04-external-api-contract.md`. Aqui o foco é o **efeito**: quando chama, em que ordem, e o que acontece em falha.

---

## O que inventariar por chamada

Para cada chamada HTTP no call graph (`curl_*`, Guzzle, `Http::`, `file_get_contents("http...")`):

- Endpoint e método.
- Condição/branch que dispara.
- Se modifica estado externo (POST/PUT/PATCH/DELETE) ou só lê (GET).
- Posição na sequência de efeitos (antes/depois de gravar o banco).

## Bloqueante vs fire-and-forget

- **Bloqueante**: a rota espera a resposta e o resultado afeta o fluxo (ex.: só grava no banco se a API confirmou).
- **Fire-and-forget**: dispara e ignora o resultado (às vezes via fila, às vezes via request pós-resposta — ver `00-route-tracing` sobre efeitos pós-resposta).

A diferença muda o desenho em Go (chamada síncrona vs goroutine/fila). Capture qual é, porque um fire-and-forget tornado síncrono pode introduzir latência e novos modos de falha.

## Retry, timeout e backoff

- Anote timeout configurado, número de tentativas, política de backoff.
- Retry sobre operação **não idempotente** pode duplicar respostas do usuário na API externa — risco direto no seu caso.
- Verifique se o retry é do código, do client HTTP, ou de um wrapper.

## Idempotência e duplicação

Como a API já contém respostas do usuário:

- A rota faz GET antes de gravar para evitar duplicar? Sob qual chave/identificador?
- A API aceita chave de idempotência? O legado a envia?
- Reenvio (retry, reprocessamento) cria duplicata ou sobrescreve? Esse comportamento é AS-IS e precisa ser idêntico.

## Tratamento de falha e efeito no fluxo

- Falha da API aborta a rota, é ignorada, ou cai num fallback?
- Erro da API vira qual status/resposta ao cliente? (Ver também mapeamento de erros, fora do escopo desta skill.)
- Falha parcial (banco gravado, API não) deixa o sistema inconsistente? Como o legado lida — reconcilia depois, ignora, ou reverte? (Ver reference 05.)

## Ordem vs banco e cache

Registre a ordem exata: ex. "grava banco → chama API → em sucesso invalida cache". Reordenar muda o estado observável em caso de falha no meio. Preserve a sequência do legado.

## Saída esperada

```markdown
### Chamada externa N — <endpoint> (<método>)
- Onde: <arquivo::método>
- Condição: <branch>
- Modo: <bloqueante | fire-and-forget | via fila>
- Retry/timeout: <política>
- Idempotência: <chave? GET prévio? risco de duplicar?>
- Em falha: <aborta | ignora | fallback> → efeito no cliente
- Ordem: <posição relativa a banco/cache>
```
