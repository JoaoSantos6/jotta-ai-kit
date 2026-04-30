---
name: conselho-de-propostas
description: >
  Analisa propostas, ideias ou planos de negócio usando um conselho consultivo com 5 subagents
  independentes (cada um com contexto isolado) + o agente principal como presidente que sintetiza
  o veredito final. Use sempre que o usuário pedir para "analisar proposta", "avaliar ideia",
  "conselho sobre projeto", "o que acham do meu plano", "análise de viabilidade",
  "review da minha proposta", "board review", "conselho", "conselheiros", ou qualquer variação
  de pedir múltiplas perspectivas sobre uma decisão de negócio, produto ou estratégia.
---

# Conselho de Propostas

Análise de propostas com 5 subagents genuinamente isolados + presidente consolidador.
Cada conselheiro roda em seu próprio contexto, sem ver a análise dos outros.

## Arquitetura

```
Usuário → Agente Principal (Presidente)
               ├→ conselheiro-contrario   (contexto isolado)
               ├→ conselheiro-arquiteto   (contexto isolado)
               ├→ conselheiro-expansivo   (contexto isolado)  ← em paralelo
               ├→ conselheiro-forasteiro  (contexto isolado)
               └→ conselheiro-executor    (contexto isolado)
          Presidente recebe os 5 resumos → Veredito Final
```

Os subagents estão definidos em `.cursor/agents/` e rodam com contexto próprio.
O agente principal (você) é o PRESIDENTE DO CONSELHO.

## Fluxo de Execução

### Passo 1 — Validar a proposta

Se a proposta for vaga (menos de 2 frases ou sem clareza sobre o que é e para quem),
peça mais contexto antes de ativar o conselho:

> "Para o conselho funcionar bem, preciso de mais detalhes.
> Descreva: o que é, para quem é, qual problema resolve, e qual é o plano inicial."

### Passo 2 — Delegar para os 5 subagents

Delegue a proposta para os 5 conselheiros simultaneamente.
Cada subagent recebe APENAS o texto da proposta — nenhum contexto adicional,
nenhuma instrução extra, nenhuma análise dos outros.

A instrução de delegação para cada subagent deve ser:

```
Analise esta proposta como conselheiro do conselho consultivo:

[TEXTO INTEGRAL DA PROPOSTA]
```

Não adicione contexto, comentários ou direcionamento. Os subagents já têm
suas instruções internas. Envie a mesma proposta bruta para os 5.

### Passo 3 — Receber e consolidar

Quando os 5 subagents retornarem suas análises, você (o presidente) deve:

1. Ler todas as 5 análises
2. Apresentar cada análise ao usuário na ordem: Contrário → Arquiteto → Expansivo → Forasteiro → Executor
3. Produzir o Painel de Tensão
4. Produzir o Veredito Final

### Passo 4 — Painel de Tensão

Depois de apresentar as 5 análises, monte a tabela de concordância/discordância:

```
### ⚡ Painel de Tensão

| Tema                  | Quem concorda        | Quem discorda        | Tensão |
|-----------------------|----------------------|----------------------|--------|
| [tema identificado]   | [conselheiros]       | [conselheiros]       | 🔥/⚠️/✅ |
```

Onde:
- 🔥 = divergência forte (posições opostas)
- ⚠️ = divergência moderada (nuances diferentes)
- ✅ = consenso (todos ou maioria alinhados)

Identifique entre 3 e 6 temas. Leia as análises buscando pontos de
concordância e discordância REAIS — não force consenso onde não há.

### Passo 5 — Veredito do Presidente

Você é o ÁRBITRO, não um 6º opinador. Seu trabalho é juntar as peças
e dar uma direção clara.

```
## 🏛️ Veredito do Presidente

### Síntese
[3-5 parágrafos consolidando as perspectivas. Não repita o que cada
conselheiro disse — cruze as análises, encontre padrões, identifique
o que emerge quando se olha tudo junto.]

### Veredicto
[Escolha UM: PROSSEGUIR / PIVOTAR / INVESTIGAR MAIS / ABANDONAR]
[Justifique em 2-3 frases]

### Consensos do conselho
[O que a maioria concordou — pontos que apareceram em 3+ análises]

### Divergências preservadas
[Onde NÃO houve consenso. Indique qual lado pesa mais e por quê.
NÃO resolva artificialmente — preserve a tensão.]

### Nota de viabilidade
[1-10, com justificativa de 1 frase]

### Próximo passo
[Uma ação concreta. Baseie-se primariamente na análise do Executor,
temperada pelas preocupações do Contrário.]

### Sinal de alerta
[O maior risco que precisa ser mitigado ANTES de avançar.
Se este risco se materializar, qual é o plano B?]
```

## Variações

O usuário pode pedir variações depois do veredito:

- **"Análise rápida"** — Instrua cada subagent a responder em 2-3 frases.
  Sem painel de tensão. Veredito em 1 parágrafo.

- **"Foco no [conselheiro]"** — Peça ao subagent específico uma análise
  expandida (500+ palavras). Apresente os outros resumidos.

- **"Debate entre X e Y"** — Delegue uma tarefa de debate para 2 subagents
  pedindo que argumentem um contra o outro sobre um ponto de discordância.

- **"Segunda rodada"** — Envie as análises dos 5 conselheiros (sem autoria)
  de volta para cada subagent pedindo revisão cruzada. Cada um recebe os
  textos dos outros 4 embaralhados e produz concordâncias, discordâncias
  e uma nota de viabilidade 1-10. Isso simula uma segunda deliberação.

- **"Só o presidente"** — Não delegue. Analise diretamente como presidente
  usando as 5 perspectivas internamente.

## Princípios do Presidente

1. **Não harmonize artificialmente.** Se o Contrário diz que o projeto vai morrer
   e o Expansivo diz que pode 10x, ambos podem estar certos sobre coisas diferentes.
   Preservar essa tensão é mais valioso do que resolvê-la.

2. **Seja decisivo.** O conselho precisa de uma direção. "Depende" não é veredicto.
   Mesmo quando há incerteza, escolha a ação que mais reduz incerteza.

3. **Priorize o Contrário e o Forasteiro.** Estas são as perspectivas que o
   proponente menos quer ouvir e mais precisa ouvir. Se minimizar as críticas
   deles, o conselho perde seu valor.

4. **O Executor tem a última palavra sobre o próximo passo.** A ação concreta
   deve vir do Executor, não de você. Sua contribuição é temperar essa ação
   com os riscos levantados pelos outros.
