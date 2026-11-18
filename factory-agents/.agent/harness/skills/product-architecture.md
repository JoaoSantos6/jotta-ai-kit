---
name: product-architecture
type: skill
description: Avalia decisões técnicas e requisitos não funcionais (latência, consistência, disponibilidade, throughput, segurança, custo) pela percepção de valor da persona, produzindo trade-offs justificados para ADRs.
used_by: [writer-doc-agent, dev-agent, mr-agent]
source: "The Product-Minded Engineer (Drew Hoskins), Cap. 9 — Product Architecture"
---

# Skill: Product Architecture

## Quando usar

- Ao redigir a seção de decisão/trade-offs de uma ADR (writer-doc-agent).
- Antes de introduzir otimização, cache, réplica, fila, processamento assíncrono ou hardening (dev-agent).
- Ao revisar se o MR respeita os trade-offs registrados (mr-agent).

## Conceito

> "Arquitetura não é construir o sistema perfeito; é fazer trade-offs." — Martin Fowler

Requisitos não funcionais (NFRs) são muitos, caros e **competem entre si** (replicação robusta aumenta latência;
barreiras de segurança reduzem disponibilidade). Por isso a arquitetura de produto exige uma postura editorial:
**o que o usuário realmente valoriza?** Abstrações internas também são produtos: os mesmos princípios de cenário valem.

## 1. As 4 técnicas (aplicar antes de qualquer otimização)

1. **Zoom out.** Compare o problema com o contexto inteiro do fluxo. Um problema *é ofuscado* por outro do mesmo tipo uma ordem de grandeza maior: microssegundos não importam atrás de um round trip de rede; o round trip não importa num fluxo que leva dias.
2. **Evite o streetlight effect.** Não procure as chaves só onde há luz (a parte do código que você conhece). Antes de priorizar um hardening (ex.: race condition), simule quão provável é o cenário na prática e **escreva a justificativa em termos de impacto no usuário**.
3. **Comunique em "user-ese".** Traduza métricas de sistema em experiência: não "1M req/s", mas "suporta 5 milhões de clientes simultâneos (1 requisição a cada 5 s por cliente ativo)"; não "O(log n)", mas "a página carrega 25% mais rápido".
4. **Feche o system-product gap.** Use observabilidade (tracing ponta a ponta, profiling) para saber se a latência de um componente está no caminho crítico do fluxo do usuário; e compense limitações fundamentais na camada certa (retries + guardrails, CDN, filas com idempotência).

Fallback legítimo: quando obter contexto de produto for caro, **aplique a boa prática padrão** (ex.: transação fortemente consistente "por segurança" em baixa escala) e registre o gatilho de reavaliação. Saber quando coletar contexto e quando usar o padrão é a habilidade central.

## 2. Garantias de consistência centradas no usuário

Garantias são **propriedades da feature**, não do banco. O banco não sabe quem lê; quem escolhe a semântica é a aplicação.

| Garantia | Significado | Quem se beneficia |
|---|---|---|
| **WyW** — Write your Writes | Toda escrita futura é informada pelas escritas anteriores do próprio usuário | O próprio usuário |
| **RyW** — Read your Writes | Ao ler, o usuário vê todas as escritas que ele já fez | O próprio usuário |
| **WsW** — Write after system Writes | Atualizações de automações/agentes têm efeito imediato nas próximas escritas | Sistema → usuário |
| **WoW** — Write after others' Writes | Outros usuários não fazem escritas desinformadas das suas, e vice-versa | Colaboradores |
| **RoW** — Read others' Writes | Você vê imediatamente as escritas confirmadas de outros | Colaboradores |
| **RsW** — Read after system Writes | Edições de automações/agentes propagam assim que confirmadas | Sistema → usuário |

Casos de referência (Stripe):
- **Onboarding de merchant** (formulário em etapas + revisão final): RyW e WyW → *primary reads*; volume baixo comporta leituras caras.
- **Saldo do cliente pagador:** não pode ficar negativo com dois pagamentos seguidos → WyW com *primary read*.
- **Saldo do merchant recebedor:** não precisa ver o dinheiro instantaneamente → *secondary reads*, sem RoW.
- **Bloqueio de merchant fraudulento:** se o bloqueio é manual, segundos de propagação são irrelevantes; se é automático contra ataque coordenado, exige solução dedicada de propagação prioritária.
- **Lição de incidente:** gravar a taxa da plataforma de forma síncrona no shard líder dava RyW, mas quando o shard caiu, **todos** os pagamentos dos merchants daquela plataforma falharam. Tornar a escrita assíncrona trocou uma consistência de que ninguém precisava por disponibilidade de que todos precisavam.

## 3. Matriz de trade-offs

| Tensão | Pergunta à persona/cenário | Sinal para priorizar o lado A | Sinal para priorizar o lado B | Mitigações comuns |
|---|---|---|---|---|
| **Latência × Consistência** (ex.: réplica/cache vs. leitura no líder) | A persona lê logo após escrever? Uma leitura desatualizada a faria agir errado? | Consistência: fluxo de revisão/confirmação, saldo, estoque, decisões financeiras | Latência: leitura de alto volume, informação de contexto, dashboards tolerantes a segundos | RyW por sessão (ler do líder só após escrita do próprio usuário), retornar o recurso no response da escrita, versão/ETag |
| **Disponibilidade × Consistência** | O que é pior para a persona: "indisponível agora" ou "dado alguns segundos atrasado"? | Consistência: dinheiro, permissões, segurança | Disponibilidade: caminho crítico de receita, leituras informativas | Escrita assíncrona com outbox, degradação graciosa, filas idempotentes |
| **Throughput × Segurança** | Quanto custa um falso negativo de segurança vs. um usuário legítimo bloqueado? | Segurança: dados sensíveis, ações irreversíveis, abuso coordenado | Throughput: operações reversíveis, baixo risco, picos legítimos de demanda | Rate limit por tenant (isolamento), verificação em camadas, checagem assíncrona com reversão |
| **Síncrono × Assíncrono** | A persona precisa do resultado para o próximo passo? | Síncrono: resultado decide o próximo passo da jornada | Assíncrono: efeitos secundários, tarefas longas | `start_*` + polling/webhook, status explícito no recurso |
| **Custo × Durabilidade/Redundância** | Qual a perda tolerável de dados/tempo de recuperação para a persona? | Durabilidade: registros financeiros, contratuais, auditoria | Custo: dados deriváveis/recalculáveis, caches | Replicação seletiva por classe de dado, backups com RPO/RTO explícitos |
| **Flexibilidade × Opinião (API)** | A persona quer controle fino ou um caminho seguro e rápido? | Opinião: maioria casual, risco de uso incorreto | Flexibilidade: power users com incentivo a dominar | Defaults seguros + interface avançada revelada gradualmente |

## 4. Procedimento de avaliação

1. **Liste os cenários afetados** (da skill `user-scenario`) e a persona de cada um.
2. **Zoom out:** posicione o custo do problema no fluxo inteiro; descarte otimizações ofuscadas.
3. **Para cada tensão da matriz**, responda à pergunta da persona com evidência (métrica, trace, simulação) ou declare a suposição.
4. **Escolha a garantia de consistência por operação** (tabela da seção 2), não por banco.
5. **Traduza o impacto em user-ese** para cada opção.
6. **Defina o gatilho de reavaliação** (ex.: "quando a leitura no líder passar de 40% da capacidade do shard").
7. **Registre na ADR** usando o template da seção 6.

## 5. Escala e NFRs comunicados ao cliente

- **Scale simulations:** derive a carga dos cenários (quantos usuários, com que frequência, quais recursos contendidos) e teste disputa por recurso, mudanças bruscas de demanda e operação acima do limite para medir **quão graciosamente** o sistema degrada. Diferencie *gargalos* (choke points) de *problemas de elasticidade* (escala reativa lenta).
- **Isolamento:** um tenant não pode degradar a experiência de outro.
- **SLA × SLO:** o SLA é o piso contratual (ex.: 99,9% das chamadas bem-sucedidas); o SLO interno é mais alto. A confiança vem de transparência: status page honesta, RCAs publicadas, atualização durante incidentes, remediações listadas, postmortems blameless.

## 6. Template de trade-off para ADR

```markdown
## Trade-offs (product-architecture)

### Cenários e personas afetados
- <cenário> — <persona> — <fase da jornada>

### Contexto em user-ese
<o problema descrito pelo impacto percebido pelo usuário, com números traduzidos>

### Garantias de consistência por operação
| Operação | Garantia escolhida | Implementação | Justificativa de valor |
|---|---|---|---|
| <operação> | <WyW/RyW/RoW/eventual> | <primary read, cache, outbox> | <impacto na persona> |

### Tensões avaliadas
| Tensão | Decisão | Evidência ou suposição | O que a persona ganha | O que a persona perde |
|---|---|---|---|---|
| <tensão> | <lado escolhido> | <dado/trace/simulação ou suposição declarada> | <ganho> | <perda aceitável> |

### Otimizações rejeitadas (zoom out / streetlight)
- <otimização> — <por que é ofuscada ou prematura>

### Gatilhos de reavaliação
- <métrica e limiar>

### NFRs e comunicação
- SLO interno: <valor> · SLA externo: <valor ou n/a> · Plano de degradação: <descrição>
```

## Critérios de qualidade da skill

- [ ] Toda decisão está ligada a pelo menos um cenário e persona.
- [ ] Impacto descrito em user-ese, não só em métricas de sistema.
- [ ] Consistência escolhida por operação, não por banco.
- [ ] Otimizações prematuras foram explicitamente rejeitadas ou justificadas.
- [ ] Existe gatilho de reavaliação mensurável.
