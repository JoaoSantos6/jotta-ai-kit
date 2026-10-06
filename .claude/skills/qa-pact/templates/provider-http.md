# Template: provedor HTTP (agnóstico)

Traduza para a linguagem e a biblioteca Pact do repositório (ver `references/pact-http.md`).

```
# Arquivo: junto dos testes de integração do provedor, no padrão do repositório

setup:
  app = <subir o serviço REAL em modo de teste, porta local>
  stubar dependências externas (parceiros, outros serviços) e usar banco de teste

verifier = HttpVerifier(
  provider        = "<provedor>-http",
  providerBaseUrl = app.url,
  providerVersion = env("GIT_SHA"),
  providerBranch  = env("GIT_BRANCH"),

  # Com broker (pendente: {{PACT_BROKER_URL}}):
  brokerUrl   = env("PACT_BROKER_BASE_URL"),
  brokerToken = env("PACT_BROKER_TOKEN"),
  consumerVersionSelectors = [
    { mainBranch: true }, { deployedOrReleased: true }, { matchingBranch: true }
  ],
  # Sem broker: pactUrls/pactFiles = env("PACT_URLS") ou caminho local de pacts

  publishVerificationResults = env("CI") == "true",

  stateHandlers = {
    "<estado de negócio 1>": () -> <preparar dados: fixture, insert no banco de teste, stub>,
    "<estado de negócio 2>": () -> ...,
    # Um handler para CADA given encontrado nos pacts dos consumidores.
  }
)

test "verifica contratos dos consumidores":
  verifier.verify()   # falha o teste se qualquer interação quebrar

teardown:
  app.stop(); limpar banco de teste
```

Checklist antes de entregar:

- [ ] O serviço real responde à verificação (sem um handler fake para o endpoint).
- [ ] Há um state handler por `given`, e nenhum `given` fica sem handler.
- [ ] Os resultados são publicados só no CI.
- [ ] Não há token nem URL real no arquivo.
- [ ] Se falhar, siga o passo 7 da skill. O contrato não pode ser afrouxado.
