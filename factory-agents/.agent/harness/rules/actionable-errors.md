---
name: actionable-errors
type: rule
description: Todo erro, warning ou diagnóstico exposto por API/serviço deve ser classificado, contextualizado e acionável, e deve ser levantado na borda (interface) onde o cenário do usuário é conhecido.
applies_to: [dev-agent, mr-agent, qa-agent, writer-doc-agent]
severity: blocking
source: "The Product-Minded Engineer (Drew Hoskins), Cap. 3 — Errors and Warnings"
---

# Rule: Actionable Errors

## Princípio

Um erro é uma interface de produto. Ele existe para que **a pessoa certa, no momento certo**, saiba
**o que aconteceu, por que aconteceu e o que fazer agora**. Uma mensagem correta mas sem ação é metade do
trabalho; uma mensagem com ação mas escrita para a persona errada ("PC Load Letter") falha igual.

## 1. Proibições (violação = bloqueio de MR)

| Proibido | Por quê |
|---|---|
| Lançar/retornar exceções genéricas (`Exception`, `RuntimeError`, `ValueError`, `InternalServerError`, `HTTP 500` cru) em cenário de runtime | O cliente não consegue automatizar resposta nem orientar o usuário final |
| Mensagens sem contexto ("invalid input", "user does not exist", "something went wrong") | O usuário não sabe *qual* dado nem *qual* operação falhou |
| Vazar stack trace, nome de tabela, query SQL, nome de classe interna ou fila para o cliente externo | Fala na ontologia da implementação, não do usuário, e pode expor dados sensíveis |
| `catch` que engole o erro (`catch {}`) ou relança sem a causa original | Destrói a informação de diagnóstico |
| Deixar o erro de uma dependência interna atravessar a borda sem reempacotamento | A camada profunda não conhece a intenção do usuário |
| Usar assertions como validação de entrada | Assertions podem ser removidas em produção e não são para o usuário final |

## 2. Classificação obrigatória (as 5 categorias)

Antes de escrever qualquer erro, classifique-o. A categoria define **para quem** você escreve e **quando** ele é corrigido.

| Categoria | Exemplo | Quem remedia | Quando | Remediação típica | HTTP sugerido |
|---|---|---|---|---|---|
| **System** | Processador de pagamento fora, timeout, erro transitório sob carga | Usuário final / cliente | Runtime | Tentar novamente depois (informar quando) | 502, 503, 504 |
| **Invalid User Argument** | Número de cartão inválido, data de fim antes do início | Usuário final | Runtime | Corrigir a entrada e reenviar | 400, 422 |
| **Preconditions Not Met** | Sem permissão, recurso em estado incompatível, assinatura cancelada | Usuário final ou administrador | Runtime | Resolver outra pendência primeiro | 401, 403, 404, 409, 412 |
| **Invalid Developer Argument** | Tipo errado, campo obrigatório ausente no contrato, enum desconhecido | Desenvolvedor integrador | Tempo de desenvolvimento dele | Corrigir o código que chama a API | 400 |
| **Assertion** | Variável que "nunca" seria nula chegou nula | Time dono do código | Tempo de desenvolvimento nosso | Alerta interno; usuário vê erro genérico seguro + `trace_id` | 500 |

Regras derivadas:
- **System, Invalid User Argument e Preconditions Not Met** são erros de runtime: exigem **classe/código específico**, mensagem acionável e metadata estruturada.
- **Invalid Developer Argument e Assertion** podem compartilhar um tipo base comum: ninguém deve automatizar runtime em cima deles.
- Em **Preconditions Not Met**, adapte a mensagem à persona: se o chamador é administrador, dê a instrução direta; se é usuário comum, diga a quem recorrer.

## 3. Fórmula obrigatória da mensagem (3 elementos)

Toda mensagem de erro de runtime deve conter:

1. **O que aconteceu** — a operação que o usuário tentou, nos termos do domínio dele.
   *"Não foi possível agendar a cobrança da assinatura `SUB-8812`."*
2. **Por que aconteceu (contexto)** — razão específica + **eco do dado problemático** (exceto se precisar ser redigido por privacidade/segurança).
   *"O período informado `2026-13-01` não é uma data válida (mês 13)."*
3. **Ação corretiva recomendada** — o próximo passo concreto; se houver mais de uma hipótese, ofereça alternativas ("Você quis dizer…?"). Para casos complexos, link para a documentação daquele erro.
   *"Informe a data no formato AAAA-MM-DD. Veja https://docs.exemplo.com/errors/INVALID_BILLING_DATE."*

Mesmo erros **System** têm ação: *"Tente novamente em 60 segundos"* aumenta a taxa de conclusão do fluxo.

## 4. Contrato de erro (payload padrão da API)

```json
{
  "error": {
    "code": "SUBSCRIPTION_PERIOD_INVALID",
    "category": "INVALID_USER_ARGUMENT",
    "message": "Não foi possível agendar a cobrança da assinatura SUB-8812: o período informado '2026-13-01' não é uma data válida (mês 13).",
    "action": "Informe a data no formato AAAA-MM-DD, com mês entre 01 e 12.",
    "context": {
      "operation": "schedule_subscription_charge",
      "subscription_id": "SUB-8812",
      "field": "billing_period_start",
      "received_value": "2026-13-01"
    },
    "retryable": false,
    "docs_url": "https://docs.exemplo.com/errors/SUBSCRIPTION_PERIOD_INVALID",
    "trace_id": "b6f1c2e0a9d84d1f"
  }
}
```

| Campo | Obrigatório | Regra |
|---|---|---|
| `code` | Sim | Estável, `UPPER_SNAKE_CASE`, nomeado no domínio (ver `domain-naming`). Mudar um `code` é breaking change. |
| `category` | Sim | Uma das 5 categorias da seção 2. |
| `message` | Sim | Elementos 1 e 2 da fórmula, legível por humano. |
| `action` | Sim (runtime) | Elemento 3 da fórmula. |
| `context` | Sim | Dados ecoados e identificadores necessários para diagnóstico, sem segredos/PII. |
| `retryable` | Sim | `true` apenas para System transitório; se `true`, informar `retry_after_seconds` quando conhecido. |
| `docs_url` | Recomendado | Obrigatório quando a correção exige explicar conceitos. |
| `trace_id` | Sim | Correlaciona com logs; é o único detalhe interno permitido para Assertions. |

Validação de múltiplos campos: retorne **todos** os erros de entrada de uma vez em `error.details[]` (cada item com `field`, `code`, `message`, `action`), não um por requisição.

## 5. Onde levantar o erro: na interface

A melhor mensagem combina duas informações: **o que aconteceu no sistema** (conhecido no fundo da pilha) e **o que o usuário tentava fazer** (conhecido na borda). Por isso:

### 5.1 Upfront validations (validações antecipadas na borda)
- Toda entrada externa (HTTP, mensagem de fila, CLI, evento) é validada **na camada de entrada**, antes de qualquer efeito colateral: schema, tipos, formatos, faixas, enums, regras de negócio baratas (ex.: data fim ≥ data início) e pré-condições verificáveis (existência, permissão, estado).
- Validações estáticas (contrato OpenAPI, tipos, schema) vêm primeiro; validações que exigem I/O vêm depois e só se o custo for justificado.
- Para operações destrutivas ou caras, ofereça **dry-run/validate-only** ou confirmação explícita ("diagnose early").

### 5.2 Repackage (reempacotamento com causa)
Quando validar antecipadamente for caro ou duplicaria lógica da dependência, **intercepte o erro específico** da camada inferior na borda e reempacote-o no contexto do cenário, **preservando a causa** (`cause`, `raise … from …`, `initCause`, `%w`).

```python
# ❌ Errado: erro da dependência atravessa a borda sem contexto do cenário
def alert_team(team_id: str, message: str):
    on_call = oncall_repository.get_current_on_call(team_id)
    chat_client.send_message(users=[on_call.handle], message=message)  # levanta UserNotFoundError cru

# ✅ Certo: erro específico, reempacotado na borda, com causa, contexto e ação
class OnCallNotFoundError(PreconditionNotMetError):
    code = "ON_CALL_NOT_FOUND"

def alert_team(team_id: str, message: str):
    on_call = oncall_repository.get_current_on_call(team_id)
    try:
        chat_client.send_message(users=[on_call.handle], message=message)
    except ChatUserNotFoundError as error:
        raise OnCallNotFoundError(
            message=(f"Não foi possível alertar o plantão do time '{team_id}': "
                     f"o plantonista '{on_call.handle}' não existe ou foi desativado."),
            action=f"Atualize a escala de plantão em {ON_CALL_BASE_URL}/{team_id}.",
            context={"team_id": team_id, "on_call_handle": on_call.handle},
        ) from error
```

## 6. Erros programáveis

- **Específicos**: uma classe/código por situação acionável distinta (`OnCallNotFoundError`, não `ValueError`). Mesmo times que não são de plataforma devem fazer isso por hábito: sempre pode surgir um middleware ou UI por cima.
- **Hierárquicos por categoria**: toda classe específica herda da base da sua categoria (`SystemError`, `InvalidUserArgumentError`, `PreconditionNotMetError`, `InvalidDeveloperArgumentError`), permitindo tratamento genérico *ou* específico.
- **Com metadata**: campos estruturados (`context`) para que o integrador construa a própria mensagem/automação sem fazer parse de texto.
- **Aninháveis**: projetados para que outro serviço capture e reempacote no cenário dele.

## 7. Guardar informação para diagnóstico

- Logue na borda: `trace_id`, `code`, `category`, operação, identificadores de negócio, causa encadeada completa.
- Nunca logue segredos, tokens, dados de cartão ou PII sem mascaramento.
- Assertions geram alerta para o time dono; ao usuário, mensagem segura: *"Ocorreu um erro inesperado ao processar o pedido `ORD-123`. Nossa equipe foi notificada. Informe o código `b6f1c2e0a9d84d1f` ao suporte se precisar de ajuda."*

## 8. Warnings

Warnings seguem a mesma fórmula (o que, por que, ação). Emita warning quando a operação teve sucesso mas o resultado pode surpreender o usuário (ex.: campo depreciado, valor truncado, limite próximo). Warnings de depreciação devem informar a data de remoção e a alternativa.

## 9. Checklist de verificação (usado por dev-agent e mr-agent)

- [ ] Cada erro novo foi classificado em uma das 5 categorias.
- [ ] Nenhuma exceção genérica é lançada em cenário de runtime.
- [ ] Toda mensagem de runtime tem os 3 elementos: o que, por quê (com dado ecoado), ação.
- [ ] Mensagens usam a ontologia do usuário (rule `domain-naming`), sem detalhes de implementação.
- [ ] Entradas externas são validadas na borda antes de efeitos colaterais.
- [ ] Erros de dependências são reempacotados na borda preservando a causa.
- [ ] Payload segue o contrato da seção 4 (`code`, `category`, `message`, `action`, `context`, `retryable`, `trace_id`).
- [ ] Códigos de erro novos estão documentados no Troubleshooting (writer-doc-agent).
- [ ] Existem testes para os caminhos de erro, verificando código, categoria e presença de ação (qa-agent).
