# 04 — Logs, eventos e mensageria

> Efeitos fáceis de esquecer no AS-IS: logs com significado de negócio, eventos/filas, e-mails e webhooks. Eles não retornam nada ao cliente, mas outros sistemas e processos dependem deles. Omiti-los quebra integrações silenciosamente.

## Sumário

- [Logs que são contrato](#logs-que-são-contrato)
- [Eventos e listeners](#eventos-e-listeners)
- [Filas e jobs assíncronos](#filas-e-jobs-assíncronos)
- [E-mails e notificações](#e-mails-e-notificações)
- [Webhooks de saída](#webhooks-de-saída)
- [Saída esperada](#saída-esperada)

---

## Logs que são contrato

Nem todo log é descartável. Procure logs que:

- São consumidos por pipelines (ELK, métricas derivadas de log, alertas baseados em string específica).
- Servem de auditoria/compliance (quem respondeu o quê, quando).
- Têm formato estruturado que outro sistema parseia.

Para esses, o **formato e o conteúdo** são parte do AS-IS. Logs puramente de debug podem ser tratados com mais liberdade — mas marque a distinção em vez de assumir.

## Eventos e listeners

- Frameworks disparam eventos (`event()`, dispatchers, model events) que acionam listeners com seus próprios efeitos (gravar banco, enviar e-mail, chamar API).
- Esses efeitos não estão no handler — venha do `00-route-tracing` com eles mapeados.
- Registre: evento disparado, listeners acionados, efeito de cada um, se síncrono ou enfileirado.

## Filas e jobs assíncronos

- `dispatch(Job)`, `->push()`, publish em broker (RabbitMQ, SQS, Kafka).
- Capture: payload enviado, fila/tópico, se é disparado dentro ou fora de transação (job enfileirado antes do commit pode rodar com dado ainda não persistido — bug clássico).
- O job em si pode estar fora do escopo da rota, mas o **ato de enfileirar** é efeito da rota.

## E-mails e notificações

- Envio de e-mail/SMS/push é efeito externo observável.
- Capture condição de disparo, template, destinatário, e se é síncrono ou via fila.
- Reenvio em retry pode gerar duplicatas — mesma preocupação da API externa.

## Webhooks de saída

- Chamadas HTTP que notificam terceiros sobre o evento de onboarding.
- Trate como a reference 03 (idempotência, retry, ordem), mas registre aqui por serem facilmente esquecidos.

## Saída esperada

```markdown
### Efeito N — <log | evento | fila | email | webhook>
- Onde: <arquivo::método>
- Condição: <branch>
- Conteúdo/payload: <o que carrega>
- É contrato? <sim — consumido por X | não — debug>
- Síncrono/assíncrono: <...>
- Dentro de transação: <sim/não — risco de disparar antes do commit>
```
