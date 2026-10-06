# Template: consumidor HTTP (agnóstico)

Traduza para a linguagem e a biblioteca Pact do repositório (ver `references/pact-http.md`).
Substitua todos os `<...>`. Não deixe campos que o consumidor não lê.

```
# Arquivo: junto dos testes existentes, no padrão do repositório
#          (Go: <cliente>_pact_test.go | Python: tests/contract/test_<provedor>_pact.py |
#           PHP: tests/Contract/<Provedor>PactTest.php | TS: <cliente>.pact.spec.ts)

pact = HttpPact(
  consumer = "<consumidor>-http",
  provider = "<provedor>-http",
  pactDir  = "./pacts"
)

test "<descrição de negócio da interação>":
  pact
    .given("<estado de negócio, ex.: cliente com oferta aprovada>")
    .uponReceiving("<requisição de negócio, ex.: uma consulta de ofertas do cliente>")
    .withRequest(
       method  = "<GET|POST|...>",
       path    = "<caminho, use regex se houver id>",
       query   = { <só os parâmetros que o cliente envia> },
       headers = { "Accept": "application/json" },
       body    = { <só o que o cliente envia, com matchers> }
    )
    .willRespondWith(
       status  = <código exato>,
       headers = { "Content-Type": regex("application/json.*", "application/json") },
       body    = {
         # Um campo por linha, com o local onde o consumidor o lê:
         "<campo>": <matcher>(<exemplo>),   # lido em <arquivo>:<linha>
         "<lista>": eachLike({ ... }, min=1) # lido em <arquivo>:<linha>
       }
    )

  pact.executeTest(mockServer ->
    cliente   = <ClienteReal>(baseUrl = mockServer.url)   # cliente REAL do consumidor
    resultado = cliente.<metodo>(<args>)
    assert resultado.<campo> == <exemplo do contrato>     # o mapeamento funcionou
  )

# Repita para cada caminho de erro que o consumidor trata de forma diferente:
test "<descrição do erro, ex.: cliente sem oferta>":
  .given("<cliente sem oferta disponível>") ... status = 404 ...
  executeTest -> assert cliente.<metodo>() devolve <erro/estado tratado pelo consumidor>
```

Checklist antes de entregar:

- [ ] Cada campo do `body` tem arquivo:linha do consumidor.
- [ ] Matchers em tudo, exceto enums, códigos e constantes de contrato.
- [ ] O teste usa o cliente real, não um cliente HTTP genérico.
- [ ] Os nomes dos pacticipants têm o sufixo `-http` e são nomes reais.
- [ ] Os `given` estão em linguagem de negócio e listados para o provedor implementar.
