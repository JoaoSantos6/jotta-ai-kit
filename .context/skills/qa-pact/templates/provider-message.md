# Template: provedor de mensagem / Kinesis (agnóstico)

Traduza para a linguagem e a biblioteca Pact do repositório (ver `references/pact-kinesis.md`).

```
verifier = MessageVerifier(
  provider        = "<provedor>-kinesis",
  providerVersion = env("GIT_SHA"),
  providerBranch  = env("GIT_BRANCH"),
  brokerUrl       = env("PACT_BROKER_BASE_URL"),   # ou pactUrls/pactFiles sem broker
  brokerToken     = env("PACT_BROKER_TOKEN"),
  consumerVersionSelectors = [
    { mainBranch: true }, { deployedOrReleased: true }, { matchingBranch: true }
  ],
  publishVerificationResults = env("CI") == "true",

  stateHandlers = {
    "<estado de negócio>": () -> <preparar o objeto de domínio>
  },

  messageHandlers = {
    # A chave é exatamente o texto de expectsToReceive no pact do consumidor.
    "<um evento NOME-DO-EVENTO>": () ->
       dominio = <fixture do estado>
       return Message(
         content  = <montarEvento>(dominio),   # MESMA função usada antes do PutRecord
         metadata = { <mesmos metadados que a publicação real envia> }
       )
  }
)

test "verifica contratos de mensagem":
  verifier.verify()
```

Checklist antes de entregar:

- [ ] O conteúdo vem da função de produção. Não há nenhum JSON escrito à mão.
- [ ] Se não existir uma função de montagem isolada do `PutRecord`, isso foi reportado como pendência e a separação foi proposta.
- [ ] Há um message handler por mensagem esperada pelos consumidores.
- [ ] Não há token nem URL real no arquivo.
