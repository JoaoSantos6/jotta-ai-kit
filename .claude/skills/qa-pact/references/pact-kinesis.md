# Message pact para eventos no Kinesis

O Pact valida o **conteúdo da mensagem** (payload e metadados), não o Kinesis. Não há
stream, shard nem `PutRecord` no teste de contrato.

- **Consumidor** (quem lê do stream): declara a mensagem que espera e prova que o
  **handler real** consegue processá-la.
- **Provedor** (quem publica): prova que a **função real** que monta o payload produz uma
  mensagem compatível.
- Pacticipants separados dos de HTTP: `<servico>-kinesis`.

## Onde fica a fronteira no código

Separe, no código de produção, as duas camadas abaixo. Se elas estiverem misturadas, proponha a separação ao dev antes de escrever o contrato:

```
Provedor:   montarEvento(dominio) -> bytes/dict   ← o contrato verifica isto
            publicar(stream, partitionKey, bytes) ← infraestrutura, fora do Pact

Consumidor: lerRegistro(kinesisRecord) -> bytes   ← infraestrutura (base64, batch), fora do Pact
            tratarEvento(bytes/dict) -> efeito    ← o contrato chama isto
```

Se o consumidor usa metadados do registro (`partitionKey`, `eventType` em atributo,
`content-type`), declare-os como **metadata** da mensagem no contrato.

---

## Exemplo completo: `pedido-criado`

> **EXEMPLO.** Nenhum evento real foi informado. Os nomes de serviço, os campos e os
> valores abaixo são ilustrativos. Substitua-os pelos do evento real e pelos campos que o
> consumidor real lê. Não use este payload como especificação.

Par: `pedidos-kinesis` (provedor) → `notificacoes-kinesis` (consumidor). Nomes de exemplo.

### 1. Campos usados pelo consumidor (levantados no código)

| Campo | Onde o consumidor lê | Matcher |
|-------|---------------------|---------|
| `tipoEvento` | roteamento do handler | exato `"pedido-criado"` |
| `versao` | escolha do parser | exato `1` |
| `pedidoId` | chave de idempotência | `regex` UUID |
| `clienteId` | busca de contato | `regex` UUID |
| `parceiro` | template da notificação | `like("BANCO_X")` |
| `valorSolicitado` | texto da notificação | `decimal(10000.00)` |
| `criadoEm` | ordenação | `regex` ISO-8601 |

Campos que o provedor publica e o consumidor não lê (por exemplo, respostas das perguntas)
**ficam fora** do contrato.

### 2. Teste do consumidor (estrutura agnóstica)

```
pact = MessagePact(consumer="notificacoes-kinesis", provider="pedidos-kinesis")

pact
  .given("pedido criado para cliente com oferta aprovada")
  .expectsToReceive("um evento pedido-criado")
  .withMetadata({ "contentType": "application/json" })
  .withContent({
      "tipoEvento":      "pedido-criado",
      "versao":          1,
      "pedidoId":        regex(UUID, "3f2b6c1e-8a4d-4c2b-9f1a-2d3e4f5a6b7c"),
      "clienteId":       regex(UUID, "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"),
      "parceiro":        like("BANCO_X"),
      "valorSolicitado": decimal(10000.00),
      "criadoEm":        regex(ISO_8601, "2026-01-15T10:30:00Z")
  })
  .verify(mensagem ->
      resultado = tratarEvento(mensagem.content)   # handler REAL do consumidor
      assert resultado.notificacaoAgendada         # o handler processou sem erro
  )
```

Grava `pacts/notificacoes-kinesis-pedidos-kinesis.json`.

### 3. Verificação do provedor (estrutura agnóstica)

```
verifier = MessageVerifier(provider="pedidos-kinesis",
                            providerVersion=$GIT_SHA, providerBranch=$GIT_BRANCH)

stateHandlers = {
  "pedido criado para cliente com oferta aprovada": () -> fixtures.pedidoComOfertaAprovada()
}

messageHandlers = {
  "um evento pedido-criado": () ->
      pedido = fixtures.pedidoComOfertaAprovada()
      return montarEvento(pedido)                  # MESMA função usada antes do PutRecord
             with metadata { "contentType": "application/json" }
}

verifier.verify(pacts=<broker ou arquivos>, stateHandlers, messageHandlers,
                publish=$CI)
```

Proibido: `messageHandlers` devolver um JSON escrito à mão no teste. Se não existir uma
função de montagem isolada, essa é a pendência número 1.

### 4. Bibliotecas

| Linguagem | Suporte a mensagem |
|-----------|--------------------|
| Go (`pact-go/v2`) | pacote `message` (consumidor e verificador de mensagens) |
| Python (`pact-python`) | message pact no consumidor e verificação de mensagens; a API varia entre 2.x e 3.x |
| PHP (`pact-php`) | `MessageBuilder` no consumidor; verificação de mensagens via `Verifier` com proxy de mensagens |
| JS/TS (`@pact-foundation/pact`) | `MessageConsumerPact` / `MessageProviderPact` (ou V4 async message) |

Confira a sintaxe na versão instalada antes de escrever.

## Evolução de evento

- Campo novo no evento: não quebra consumidores (eles não o declaram). Publique sem medo.
- Remoção ou renomeação: siga o passo 7 da skill. Publique primeiro os dois campos, migre
  os consumidores e só então remova o antigo, validando com `can-i-deploy`.
- Mudança de tipo (`valorSolicitado` de número para string) é quebra. Trate como renomeação
  ou crie uma nova `versao` do evento.
