# Pact HTTP

Contrato HTTP = conjunto de interações. Cada interação tem:

- `given` (provider state): estado de negócio necessário no provedor;
- `uponReceiving`: descrição da interação;
- `withRequest`: método, caminho, query, headers e corpo que o **consumidor envia**;
- `willRespondWith`: status, headers e corpo que o consumidor **espera e usa**.

## Bibliotecas oficiais por linguagem

Use a que já estiver no repositório. Se não houver, use a oficial da linguagem e confira a
API da versão instalada no README dela antes de escrever o teste.

| Linguagem | Biblioteca | Observação |
|-----------|------------|------------|
| Go | `github.com/pact-foundation/pact-go/v2` | Pacotes `consumer`, `provider`, `matchers`, `message`. Exige a biblioteca nativa (`pact-go install`) |
| Python | `pact-python` | As versões 2.x e 3.x têm APIs diferentes. Siga a versão instalada |
| PHP | `pact-foundation/pact-php` | Consumer via `InteractionBuilder`. Verificação via `Verifier` |
| JS/TS (BFF e frontend) | `@pact-foundation/pact` | `PactV3`/`PactV4` + `MatchersV3` |
| JVM | `au.com.dius.pact` | JUnit 5 |

Se a linguagem não tiver biblioteca oficial ou a instalação estiver bloqueada pelas rules,
pare e informe o dev.

## Lado consumidor (passo a passo)

1. Localize o cliente HTTP do consumidor (a função ou classe que monta a requisição).
2. Liste os campos da resposta lidos pelo consumidor, com arquivo:linha.
3. Crie o teste de contrato ao lado dos testes existentes, no padrão do repositório
   (ex.: `*_pact_test.go`, `tests/contract/test_*_pact.py`, `tests/Contract/*PactTest.php`).
4. Configure o mock com `consumer=<consumidor>-http` e `provider=<provedor>-http`.
5. Para cada interação: `given` → `uponReceiving` → request → response com matchers.
6. No corpo do teste, aponte o **cliente real** para a URL do mock e chame-o.
7. Faça asserts sobre o objeto devolvido pelo cliente (o mapeamento funcionou).
8. Ao final, o Pact grava `pacts/<consumidor>-http-<provedor>-http.json`.
   Coloque `pacts/` no `.gitignore` se o time publicar só via broker.

Inclua interações para os caminhos de erro **que o consumidor trata de forma diferente**
(404 → "sem oferta", 503 → "parceiro indisponível"). Não inclua caminhos que o consumidor
não diferencia.

## Lado provedor (passo a passo)

1. Suba o provedor **real** em modo de teste (servidor HTTP em porta local), com
   dependências externas stubadas (banco de teste, parceiros mockados).
2. Configure o verificador:
   - `provider=<provedor>-http`;
   - fonte dos pacts: broker (`PACT_BROKER_BASE_URL` + token + `consumerVersionSelectors`)
     ou, sem broker, arquivos locais/artifacts (ver `broker-e-ci.md`);
   - `providerVersion` = SHA do commit; `providerBranch` = branch;
   - `publishVerificationResults` = `true` **só no CI** (variável de ambiente).
3. Implemente um **state handler** por `given` usado nos contratos. O handler prepara os
   dados e devolve, se preciso, valores gerados (ids) para o contrato.
4. Não altere o código de produção para "encaixar" no contrato durante a verificação.
   Se falhar, siga o passo 7 da skill.

Seletores de versão recomendados (sintaxe varia por biblioteca):

```
{ mainBranch: true }          # pacts da branch principal dos consumidores
{ deployedOrReleased: true }  # pacts das versões em HML/PRD
{ matchingBranch: true }      # pacts da mesma branch do provedor (feature em par)
```

## Nomes e organização

- Pacticipant: nome real do serviço + `-http`. Sem espaços, minúsculo, com hífen.
- Descrição da interação: verbo de negócio. Por exemplo "uma requisição de simulação
  para valor e prazo válidos".
- Um arquivo de teste de contrato por par consumidor → provedor.
