---
name: user-scenario
type: skill
description: Mapeia persona, motivação e a jornada completa (Discovery, Understanding, Usage) de um recurso em forma de cenários simulados, servindo de base para requisitos, nomes, erros, documentação e testes de cenário.
used_by: [tasker-agent, writer-doc-agent, qa-agent]
source: "The Product-Minded Engineer (Drew Hoskins), Cap. 1 — Foundations of Product Thinking; Cap. 2 — Scenarios in the User Journey"
---

# Skill: User Scenario

## Quando usar

- Na abertura de toda task (tasker-agent), antes de qualquer documento ou código.
- Para derivar a estrutura de documentação por cenário (writer-doc-agent).
- Para derivar testes de cenário e o roteiro de dogfooding (qa-agent).

## Conceito

**Cenário = Personagem (Persona + Motivação) + Simulação.**

- A **motivação** carrega a história: sem ela não dá para julgar se o usuário realmente tomaria aquelas ações.
- A **persona** diz se o cenário importa para a estratégia do produto e para quem o recurso **não** é.
- A **simulação** é o enredo: cada passo segue logicamente do anterior, como uma prova matemática. Ela **desafia** o design em vez de bajulá-lo.

Toda feature é responsável pelas três fases da jornada:

| Fase | Situação do usuário | Pergunta-chave |
|---|---|---|
| **Discovery** | Tem um problema, mas não sabe que o recurso existe/resolve | Por quais caminhos ele chega até o recurso? |
| **Understanding** | Encontrou o recurso e quer saber o que faz e como funciona | Que conceitos ele precisa absorver e como os absorve sem ler o código? |
| **Usage** | Quer usar para o propósito real, de forma segura e recorrente | Como ele executa sem se machucar, e como se recupera quando erra? |

Se uma fase falta, o recurso não gera o impacto esperado.

## Instruções de execução

1. **Identifique a persona dentro do público-alvo** acordado pelo time. Se não houver público-alvo definido, registre como pergunta aberta e não invente.
2. **Faça a root cause analysis da motivação.** Pergunte "para quê?" até chegar ao objetivo real. "Quer chamar o endpoint X" é um *meio*, não um fim.
3. **Rejeite straw man users**: personagens que fazem exatamente o que o design precisa, sem motivo plausível.
4. **Aplique shoe-shifting e selective amnesia**: sempre que usar conhecimento que só quem implementou teria, refaça o passo como se não o tivesse.
5. **Considere os means universais** da persona: não entende a implementação, evita ler documentação, não explora todo o produto, é multitarefa e se distrai, toma o caminho mais curto, evita risco, esquece coisas ao voltar meses depois.
6. **Escreva a simulação completa**, empurrando em três direções: o que aconteceu antes (como chegou ali?), o que acontece depois, e quais passos merecem mais detalhe.
7. **Cace plot holes**: passos pulados, edge cases (que viram cenários próprios) e ausência de mecanismo de discovery.
8. **Converta cada cenário em critérios observáveis e testes de cenário.**
9. Se travar ou estiver inventando, registre a lacuna como pergunta para produto/usuários/métricas. Concluir que a feature não deve ser construída é um resultado válido.

## Template

```markdown
# Cenários de Usuário — <nome do recurso>

## 1. Persona
- **Nome/arquétipo:** <ex.: "Marina, engenheira de integração de um e-commerce de médio porte">
- **Papel e contexto:** <função, empresa, ambiente técnico, frequência de contato com o produto>
- **Facetas:**
  - Posição no funil: <prospect | novo usuário | recorrente | power user>
  - Casual vs power user: <qual e por quê>
  - Lado do marketplace / tipo de cliente: <ex.: plataforma, merchant, cliente final>
  - Stack/linguagem: <ex.: Java 21 + Spring, Python 3.12>
- **Means (habilidades, conhecimento, restrições):** <o que sabe, o que não sabe, tempo disponível, tolerância a risco>
- **Ontologia que já domina:** <termos que usa no dia a dia; base para `domain-naming`>
- **Nonpersonas (para quem isto NÃO é):** <persona e motivo>

## 2. Motivação
- **Motivação imediata:** <o que ela quer fazer agora>
- **Causa raiz (RCA):** <por que isso importa para ela/para o negócio dela>
- **Gatilho:** <evento que a leva a procurar uma solução>
- **Custo de não resolver:** <tempo, dinheiro, risco, retrabalho>

## 3. Cenário de Discovery
- **Ponto de partida:** <o que ela sabe e não sabe sobre a existência do recurso>
- **Rotas de descoberta:** <busca na doc, portal do desenvolvedor, mensagem de erro que aponta o recurso, changelog, assistente de IA, SDK/autocomplete, suporte>
- **Simulação:**
  1. <passo>
  2. <passo>
  3. <passo>
- **Unknown unknowns a transformar em known unknowns:** <o que ela não sabe que não sabe e qual "trilha de migalhas" deixaremos>
- **Critério observável:** <ex.: a partir do erro X, a persona chega ao guia Y em até 2 cliques>

## 4. Cenário de Understanding
- **Conceitos que precisa absorver:** <lista, cada um com o termo do glossário>
- **Sinalizadores:** <nomes, exemplos, Guia Conceitual, payloads de exemplo, respostas da API que se explicam>
- **Simulação:**
  1. <passo>
  2. <passo>
  3. <passo>
- **Ambiguidades possíveis:** <interpretações erradas plausíveis de nomes/conceitos>
- **Critério observável:** <ex.: sem ler a referência completa, explica a diferença entre A e B>

## 5. Cenário de Usage
- **Caminho feliz recorrente:**
  1. <passo>
  2. <passo>
  3. <passo>
- **Uso seguro:** <proteções: validações na borda, idempotência, dry-run, confirmação, defaults seguros>
- **Caminhos de erro e recuperação:** <para cada erro provável: categoria, mensagem esperada, ação de recuperação>
- **Uso em escala/recorrência:** <volume, frequência, concorrência, retorno após meses>
- **Critério observável:** <ex.: integra em < 30 min seguindo o Quickstart; 0 chamadas ao suporte no fluxo feliz>

## 6. Plot holes e edge cases
| Tipo | Descrição | Tratamento (novo cenário, requisito ou fora de escopo) |
|---|---|---|
| Passo pulado | <descrição> | <tratamento> |
| Edge case | <descrição> | <tratamento> |

## 7. Saídas derivadas
- **Requisitos:** <lista rastreável ao cenário>
- **Termos para o glossário:** <termo → definição>
- **Testes de cenário:** <nome do teste → fase → passos combinados>
- **Perguntas abertas:** <o que precisa de dado real/usuário/PM>
```

## Exemplo resumido (backend)

- **Persona:** Marina, engenheira de integração de um e-commerce de médio porte, usuária recorrente da API de pagamentos, não especialista em cobrança recorrente.
- **Motivação:** lançar plano de assinatura mensal; causa raiz: reduzir churn de clientes que esquecem de recomprar.
- **Discovery:** busca "cobrança recorrente" no portal; o resultado aponta para "Assinaturas" (não para "Scheduled Jobs").
- **Understanding:** o Guia Conceitual explica `Subscription`, `SubscriptionPeriod` e `Renewal` com um diagrama de ciclo de vida; ela entende que a renovação é assíncrona.
- **Usage:** cria a assinatura com `Idempotency-Key`; ao enviar `billing_period_start` inválido recebe `SUBSCRIPTION_PERIOD_INVALID` com ação clara; consulta a assinatura logo após criar e a vê (read-your-writes).
- **Plot hole:** o que acontece quando o cartão expira entre renovações? Vira cenário próprio de Usage.

## Critérios de qualidade da skill

- [ ] Persona pertence ao público-alvo e tem nonpersonas declaradas.
- [ ] Motivação passou por RCA e não é straw man.
- [ ] As três fases têm simulação passo a passo e critério observável.
- [ ] Caminhos de erro do Usage estão classificados conforme `actionable-errors`.
- [ ] Plot holes foram listados e tratados.
- [ ] Cada cenário gera ao menos um teste de cenário.
