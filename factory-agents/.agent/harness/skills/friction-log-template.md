---
name: friction-log
type: skill
description: Conduz o dogfooding de um recurso no papel de uma persona e registra, passo a passo, cada ponto de fricção, ambiguidade e impacto na experiência, com sugestões de simplificação.
used_by: [qa-agent, tasker-agent]
source: "The Product-Minded Engineer (Drew Hoskins), Cap. 4 — Experiencing Your Own Product / Friction Logging"
---

# Skill: Friction Log

## Quando usar

- Na fase Deliver, após os testes automatizados passarem (qa-agent).
- Ao seguir a documentação (Quickstart/Troubleshooting) como um usuário novo.
- Na revisão de encerramento da task (tasker-agent valida o log).

## Conceito

Um friction log é um **diário de um cenário com ênfase na fricção**. Você usa o produto como a persona usaria e
relata confusões e bloqueios **enquanto acontecem**. O objetivo é relatar a experiência; o time decide o que fazer.

Princípios:

1. **Selective amnesia**: esqueça o que você sabe por ter construído o sistema. Se precisou de conhecimento "proibido" (ler o código, saber o nome interno), isso já é fricção.
2. **Descreva, não prescreva** na coluna de observação. A sugestão de simplificação vai em coluna separada e é uma hipótese, não uma ordem.
3. **Registre também o que funcionou bem**: elogio faz a fricção se destacar e mostra onde o time acertou.
4. **Siga o cenário de ponta a ponta**: Discovery → Understanding → Usage, incluindo erros provocados de propósito.
5. **Sem burocracia**: o log é o entregável; não exige abrir tickets.

## Níveis de fricção

| Nível | Critério | Exemplo |
|---|---|---|
| **Baixo** | Incômodo pontual; a persona segue sem ajuda e sem perda relevante de tempo (< 2 min) | Nome de campo pouco idiomático, mas o exemplo esclarece |
| **Médio** | Exige tentativa e erro, busca fora do fluxo ou releitura; risco de uso incorreto não destrutivo | Erro sem ação clara obriga a procurar na documentação |
| **Alto** | Bloqueia o cenário, exige conhecimento interno/suporte, causa perda de dados/dinheiro ou levaria a persona a desistir | Endpoint retorna 500 genérico; recurso não é encontrável por nenhuma rota de discovery |

Regra de encerramento: **fricção Alta aberta bloqueia o encerramento da task** (ver `tasker-agent`), salvo aceite explícito e registrado.

## Instruções de execução

1. Carregue a persona e a motivação da skill `user-scenario` da task.
2. Declare seus *priors* (o que a persona já conhece de produtos similares).
3. Parta do ponto de Discovery real (busca na doc, mensagem de erro, portal), não da URL que você já sabe.
4. Execute cada passo e preencha uma linha da tabela por passo relevante.
5. Provoque ao menos um erro por categoria plausível (entrada inválida, pré-condição, falha transitória simulada) e avalie a mensagem pela fórmula da rule `actionable-errors`.
6. Avalie nomes vistos pela rule `domain-naming`.
7. Feche com a síntese e o veredito.

## Template

```markdown
# Friction Log — <recurso> — <data AAAA-MM-DD>

## Cabeçalho
- **Autor:** qa-agent
- **Persona representada:** <nome/arquétipo do user-scenario>
- **Priors:** <experiência prévia que pode influenciar a percepção>
- **Intenção:** <o que a persona quer realizar, na voz dela>
- **Ambiente/versão:** <ambiente, build/commit, versão da API, dados de teste>
- **Ponto de partida (Discovery):** <onde a persona começa>

## Jornada
| # | Fase | Ação da persona | Esperado | Observado | Fricção | Ponto cego / ambiguidade | Impacto na experiência | Sugestão de simplificação |
|---|---|---|---|---|---|---|---|---|
| 1 | Discovery | <ação> | <expectativa> | <o que aconteceu> | Baixo/Médio/Alto | <o que não estava claro> | <tempo perdido, risco, abandono> | <hipótese de melhoria> |

## O que funcionou bem
- <ponto positivo concreto>

## Síntese
- **Top fricções (ordenadas por impacto):**
  1. <fricção> — <nível> — <passo #>
- **Cenários atendidos:** Discovery <sim/parcial/não> · Understanding <sim/parcial/não> · Usage <sim/parcial/não>
- **Erros avaliados:** <code> → <atende/não atende a fórmula de 3 elementos>
- **Veredito:** <SEM_BLOQUEIO | BLOQUEIO_POR_FRICCAO_ALTA>
```

## Exemplo resumido

| # | Fase | Ação da persona | Esperado | Observado | Fricção | Ponto cego / ambiguidade | Impacto na experiência | Sugestão de simplificação |
|---|---|---|---|---|---|---|---|---|
| 1 | Discovery | Busca "cobrança recorrente" no portal | Chegar ao guia de Assinaturas | Primeiro resultado é "Scheduled Jobs API" | Médio | O termo interno aparece antes do termo do domínio | 5 min perdidos; quase usa a API errada | Indexar o guia por sinônimos do glossário |
| 2 | Usage | Cria assinatura com data `2026-13-01` | Erro dizendo o campo e o formato | `SUBSCRIPTION_PERIOD_INVALID` com campo, valor e formato | Baixo | Nenhum | Corrigiu em 1 tentativa | Manter; usar como referência |
| 3 | Usage | Consulta a assinatura logo após criar | Ver a assinatura criada | 404 por ~2 s | Alto | Leitura de réplica não garante read-your-writes | Persona acha que a criação falhou e reenvia | Rever trade-off de consistência na ADR |

**O que funcionou bem:** a mensagem do passo 2 é exemplar.
**Veredito:** BLOQUEIO_POR_FRICCAO_ALTA (passo 3).

## Critérios de qualidade da skill

- [ ] Persona, priors e intenção declarados antes da jornada.
- [ ] As três fases da jornada foram percorridas.
- [ ] Cada linha tem nível de fricção justificado pelos critérios.
- [ ] Observações descrevem; sugestões ficam na própria coluna.
- [ ] Há pelo menos um registro do que funcionou bem.
- [ ] Erros provocados foram avaliados contra `actionable-errors`.
- [ ] Veredito explícito.
