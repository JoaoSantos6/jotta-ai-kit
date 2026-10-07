# Template: consumidor de mensagem / Kinesis (agnóstico)

Traduza para a linguagem e a biblioteca Pact do repositório (ver `references/pact-kinesis.md`).

```
pact = MessagePact(
  consumer = "<consumidor>-kinesis",
  provider = "<provedor>-kinesis",
  pactDir  = "./pacts"
)

test "<consumidor> processa <evento>":
  pact
    .given("<estado de negócio que origina o evento>")
    .expectsToReceive("<um evento NOME-DO-EVENTO>")
    .withMetadata({ <só metadados lidos pelo consumidor, ex.: "contentType": "application/json"> })
    .withContent({
       "<tipoEvento>": "<valor exato: é parte do contrato>",
       "<campo>": <matcher>(<exemplo>),   # lido em <arquivo>:<linha>
       ...
    })
    .verify(mensagem ->
       # Chame o handler REAL do evento, depois da camada de leitura do Kinesis
       # (base64/batch), que fica fora do contrato.
       resultado = <tratarEvento>(mensagem.content)
       assert <efeito observável do handler: sem erro, comando gerado, chamada ao repositório mock>
    )
```

Checklist antes de entregar:

- [ ] O handler testado é o mesmo usado pelo consumidor do stream em produção.
- [ ] Só entram campos lidos pelo handler, cada um com arquivo:linha.
- [ ] O pacticipant tem o sufixo `-kinesis`, separado do pacticipant HTTP.
- [ ] O `given` está em linguagem de negócio e foi listado para o provedor implementar.
