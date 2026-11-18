---
name: domain-naming
type: rule
description: Nomes de endpoints, DTOs, funções, variáveis, eventos e códigos de erro devem colocar na cabeça do usuário conceitos da ontologia do negócio, nunca detalhes de implementação.
applies_to: [dev-agent, mr-agent, writer-doc-agent, tasker-agent]
severity: blocking
source: "The Product-Minded Engineer (Drew Hoskins), Cap. 2 — The Understanding Scenario / Picking Understandable Names"
---

# Rule: Domain-Driven Naming

## Princípio

Um nome é a sua oportunidade de colocar **um ou dois pensamentos** na cabeça de quem lê. O leitor não quer saber
*o que o sistema é*; quer saber **"como isso me ajuda?"**. Cada slot do nome ocupado por um detalhe de
implementação é um slot a menos para algo que importa.

O maior inimigo é a **Curse of Knowledge**: quem construiu o sistema não consegue enxergar a dificuldade de quem
não o conhece. Antídoto: **shoe-shifting** — vestir os sapatos da persona, aplicar *selective amnesia* sobre o que
você só sabe por ter implementado, e perguntar: "como a persona interpretaria esse nome?".

## 1. Fonte de verdade: o glossário do domínio

- Toda task possui um **glossário ubíquo** (`.agent/tasks/<task-id>/glossary.md`) com: termo, definição na voz do usuário, persona que usa o termo, sinônimos proibidos.
- Termo novo exposto ao cliente só entra no código **depois** de entrar no glossário (Documentation-Driven Development).
- Em produtos multipersona, o glossário registra o termo de cada persona; consistência importa **dentro** da experiência de cada persona.

## 2. Regras por artefato

| Artefato | Regra | ❌ Evitar | ✅ Preferir |
|---|---|---|---|
| Endpoint REST | Recursos são substantivos do domínio; ações são verbos do domínio | `POST /jobs/cron/enqueue` | `POST /subscriptions/{id}/renewals` |
| DTO / schema público | Nome do conceito de negócio + papel (`Request`/`Response` só quando necessário) | `CronJobIntervalDTO` | `SubscriptionPeriod` |
| Campo de DTO | Conceito + unidade quando houver medida | `ttl`, `timeout` | `trial_duration_days`, `payment_timeout_seconds` |
| Função/método de serviço | Verbo que descreve o efeito para o usuário, não o mecanismo | `enqueue_request`, `enqueue_and_wait_for_request` | `start_request` (assíncrono), `execute_request` (síncrono) |
| Booleanos | Forma de pergunta/predicado para não confundir com ação | `persist`, `notify` | `should_persist`, `is_overdue`, `has_active_subscription` |
| Papéis/relações | Explicitar "qual dos dois" | `user_id` em transferência | `sender_account_id`, `recipient_account_id` |
| Evento de domínio | Fato de negócio no passado | `RowUpdatedEvent`, `KafkaMsgProcessed` | `InvoicePaid`, `SubscriptionCanceled` |
| Código de erro | Situação do domínio, acionável | `DB_CONSTRAINT_FAILED` | `INVOICE_ALREADY_PAID` |
| Métrica/telemetria exposta | Valor para o usuário | `queue_lag_ms` (em dashboard de cliente) | `report_delivery_delay_seconds` |

Nomes **internos** (adapters, repositórios, infraestrutura) podem e devem citar a tecnologia
(`KafkaInvoiceEventPublisher`, `PostgresSubscriptionRepository`) — mas esses nomes **nunca** cruzam a borda pública.

## 3. Heurísticas (máximas reescritas com foco no usuário)

1. **Evite ambiguidade** (em vez de "seja autoexplicativo"). Brainstorme outras interpretações do nome. Se "Align" pode significar três coisas, seja específico. Esclareça sempre: papéis, tipos, **unidades** e classe gramatical.
2. **Equilibre consistência e especificidade** (em vez de "seja consistente"). Procure prior art no produto e alinhe-se a ele; mas, se o termo consistente for ambíguo ou anti-idiomático, prefira o específico. Processo: gere o nome mais específico e o mais consistente; se divergirem, registre o trade-off e decida. Na dúvida, seja consistente. Se o nome antigo é legado usado por poucos power users e o recurso novo tem ambição ampla, vale quebrar a consistência.
3. **Use acrônimos só se forem ubíquos para a persona-alvo** (em vez de "evite acrônimos"). `HTTP` para devs, sim; `SLO` para um usuário financeiro, não.
4. **Transmita só o que o usuário precisa saber** (em vez de "seja conciso"). Remova detalhes de implementação (`queue`, `cron`, `cache`, `shard`, `lambda`) e use o espaço liberado para o que é relevante (ex.: o fato de ser assíncrono).
5. **Código é mais lido do que escrito.** Não abrevie nomes em código versionado; autocomplete resolve a digitação, revisões e debugging dependem da leitura.

## 4. Teste de vazamento de abstração

Um nome vaza abstração se responder "sim" a qualquer pergunta:

- Ele mudaria se trocássemos a tecnologia (Postgres → Dynamo, cron → scheduler gerenciado, REST → gRPC) sem mudar o comportamento para o usuário?
- A persona precisaria ler o código para entender o que ele significa?
- Ele contém palavras que não estão no glossário do domínio nem na linguagem natural da persona?
- Ele descreve *como* o sistema faz em vez de *o que* o usuário obtém?

## 5. Exemplos de reescrita

| Antes (implementação) | Depois (domínio) | Racional |
|---|---|---|
| `CronJobInterval` | `SubscriptionPeriod` | O usuário pensa em ciclo de cobrança, não em agendador |
| `GET /cache/user-balance` | `GET /accounts/{id}/balance` | Cache é detalhe; o recurso é o saldo |
| `retryCount` (em DTO público) | `delivery_attempts` | Fala do que aconteceu com a entrega |
| `processBatch()` | `settle_daily_payouts()` | Diz qual efeito de negócio ocorre |
| `flag_v2` | `is_eligible_for_installments` | Predicado claro, sem versão interna |
| `S3_UPLOAD_ERROR` | `INVOICE_ATTACHMENT_UPLOAD_FAILED` | Erro na ontologia do usuário (ver `actionable-errors`) |

## 6. Checklist de verificação (usado por dev-agent e mr-agent)

- [ ] Todo nome exposto na borda (endpoint, DTO, campo, evento, código de erro) existe no glossário do domínio.
- [ ] Nenhum nome público contém termos de infraestrutura/implementação.
- [ ] Medidas trazem unidade no nome; booleanos usam forma predicativa; relações explicitam o papel.
- [ ] Acrônimos usados são ubíquos para a persona-alvo.
- [ ] Divergências entre consistência e especificidade foram registradas e justificadas.
- [ ] Renomear um nome público foi tratado como breaking change (versionamento/depreciação).
