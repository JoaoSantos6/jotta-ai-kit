# 05 — Assertions de chamadas à API externa

> A API externa já contém parte das respostas do usuário. Cada chamada é um efeito real no mundo: duplicar é contaminar dados, pular é perder dados, reordenar pode mudar a regra de idempotência. Esta reference cobre como verificar que o Go faz **exatamente** as mesmas chamadas, na mesma ordem, com o mesmo payload.

## Sumário

- [O que comparar em cada chamada](#o-que-comparar-em-cada-chamada)
- [Ordem entre chamadas e ordem com banco/cache](#ordem-entre-chamadas-e-ordem-com-bancocache)
- [Idempotência: não duplicar respostas que a API já contém](#idempotência-não-duplicar-respostas-que-a-api-já-contém)
- [Bloqueante vs fire-and-forget](#bloqueante-vs-fire-and-forget)
- [Mock vs replay](#mock-vs-replay)
- [Servidor de mock que grava as requisições](#servidor-de-mock-que-grava-as-requisições)
- [Saída esperada](#saída-esperada)

---

## O que comparar em cada chamada

Para cada chamada gravada pelo mock/replay no Go, compare contra a entrada correspondente em `external.calls.json` do golden:

- **Método HTTP** e **URL completa** (path + query). Algumas APIs aceitam query em qualquer ordem; outras não. Capture e compare literal — se houver liberdade, justifique como normalizador.
- **Headers de contrato**: `Content-Type`, `Accept`, `X-Idempotency-Key`, headers customizados do parceiro. Auth/trace já sanitizados na captura.
- **Body**: compare em estrutura **e** byte a byte quando o parceiro espera bytes específicos. Em JSON, parse os dois lados em estrutura comparável; mas se a API exigir ordem de campos ou escaping específico, compare bruto.
- **Modo**: síncrono/assíncrono. Se o legado disparou via `register_shutdown_function` e o Go disparou via `go func()`, ambos são "pós-resposta" — mas a Skill C revisa se isso é seguro (ver `go-concurrency-review`).

Veja `side-effects-mapping/03-external-api-calls.md` para o inventário e `data-contracts-extraction/04-external-api-contract.md` para o shape detalhado.

## Ordem entre chamadas e ordem com banco/cache

Ordem é parte do contrato:

- Entre chamadas externas: se o legado faz `POST /A` e depois `POST /B`, o Go precisa fazer na mesma ordem. Inverter pode quebrar regras do parceiro (ex.: `B` só funciona depois de `A`).
- Entre chamadas e banco/cache: `side-effects-mapping/05-ordering-and-transactions.md` mapeia "grava banco → chama API → invalida cache". O Go que chame a API antes do banco entrega resposta sem dado persistido em caso de retry do cliente.

Para verificar, use um interceptor que grave eventos **com timestamp monotônico** abrangendo banco, cache e API. Compare a ordem relativa, não o tempo absoluto.

## Idempotência: não duplicar respostas que a API já contém

Como a API contém respostas, retry e reprocessamento podem **duplicar** dados do usuário. Verificações específicas:

- A rota faz `GET` (ou `HEAD`) antes do `POST` para detectar resposta já existente? Se sim, o teste de paridade precisa cobrir o caso "API já tem", esperando que o Go **não duplique**.
- A rota envia chave de idempotência? Em qual header (`X-Idempotency-Key`, `Idempotency-Key`, `X-Request-Id`)? O valor é o mesmo entre Go e legado para o mesmo input?
- Em retry interno: o Go reusa a mesma chave de idempotência? Senão, retry duplica.

Cenários de teste obrigatórios:

1. **API vazia** (input novo): legado chama `GET` (miss) + `POST`; Go também.
2. **API já contém** (input repetido): legado chama `GET` (hit) e **não** chama `POST`; Go também não. Se chamar, é drift crítico.
3. **API timeout no `POST`**: legado retenta com mesma chave (ou não); Go reproduz. Se o legado **não** retenta e o Go retenta, pode duplicar.

## Bloqueante vs fire-and-forget

Se o legado dispara a chamada como fire-and-forget (resposta ao cliente não depende), o Go pode estar bloqueando — ou vice-versa. Ambas as diferenças importam:

- **Fire-and-forget no legado → síncrono no Go**: aumenta latência da rota e adiciona modos de falha (erro da API agora afeta resposta). Drift.
- **Síncrono no legado → fire-and-forget no Go**: a resposta do cliente sai antes de a API confirmar; falha da API não chega ao cliente. Drift e potencialmente perda de dado.

Esse aspecto é insumo da Skill C; aqui o teste só **observa** o modo. Para observar:

- Meça o tempo entre "request handler retornou" e "chamada externa observada". Se a chamada chega depois da resposta, é pós-resposta.
- Verifique se a chamada acontece dentro do `context` do request ou em outro.

## Mock vs replay

Duas estratégias para responder ao Go sem chamar a API real:

- **Mock**: o servidor de teste devolve respostas pré-definidas por endpoint/condição. Vantagem: simples. Desvantagem: pode mascarar variações que o legado expôs.
- **Replay**: o servidor devolve exatamente o que o golden gravou (gravação real do legado contra a API). Vantagem: comportamento idêntico ao legado. Desvantagem: gravação inicial precisa ser feita com cuidado (sandbox da API, não produção).

Prefira **replay** quando a captura for viável; **mock** quando não. Em ambos os casos, **grave** o que o Go enviou — a verificação é sobre a saída do Go, não sobre como o servidor respondeu.

## Servidor de mock que grava as requisições

Padrões Go:

- `httptest.NewServer` com handler que grava cada request em memória e responde a partir de um mapa pré-definido (ou de `replay.json`).
- Bibliotecas como `gock` (intercepta `http.DefaultTransport`) e `httpmock`, mas estas exigem cuidado quando o client usa `http.Client` próprio.
- Para gRPC, `bufconn` em memória; para clients gerados (`oapi-codegen`), injete o `http.Client` apontando para o `httptest.NewServer`.

A injeção do endpoint precisa ser explícita: o cliente HTTP/gRPC do serviço deve aceitar uma URL/transport via construtor, para que o teste aponte para o servidor de mock. Não dependa de variáveis globais.

## Saída esperada

```markdown
### API externa — caso <id>
Modo do legado: <síncrono | pós-resposta | via fila>
Modo do Go: <idem>  → <igual | divergente>

Sequência de chamadas (em ordem):
| # | Método | URL | Headers de contrato | Body (resumo) | Igual ao golden? |
|---|--------|-----|---------------------|---------------|------------------|
| 1 | GET    | /answers?user_id=42 | - | - | sim |
| 2 | POST   | /answers           | X-Idempotency-Key: <id> | <hash> | sim |

Ordem relativa a banco/cache:
- DB INSERT onboarding → API POST /answers → CACHE DEL onboarding:42  → igual ao legado

Cenário de idempotência testado: <API vazia | API já contém | retry/timeout>

Normalizadores aplicados:
- Auth header: omitido (sanitizado na captura)
- Trace header: omitido
```
