---
name: qa
description: "Use ao criar ou alterar testes, regras de negócio, chamadas HTTP entre serviços, respostas do BFF ou eventos Kinesis, ou se pedirem QA. Decide entre qa-pact e qa-oraculo."
---

# qa (roteador)

Decida quais skills de QA se aplicam à mudança atual, chame-as na ordem certa e
consolide tudo em um único **Relatório de QA**. Esta skill não escreve testes:
quem escreve são `qa-pact` e `qa-oraculo`.

Antes de executar qualquer comando (git, docker, sistema operacional), consulte
`.context/rules/`. Se uma rule bloquear a ação, entregue o comando pronto ao dev.

## 1. Classificar a mudança

Leia o pedido e o diff (`git diff`, `git diff --staged` ou os arquivos citados).
Marque cada critério que valer:

| # | Critério | Skill |
|---|----------|-------|
| A | Muda o **formato** de uma requisição ou resposta HTTP entre serviços: campo novo, removido ou renomeado, tipo, status, rota, header obrigatório | `qa-pact` |
| B | Muda uma resposta do **BFF** consumida pelo frontend ou uma chamada do BFF ao backend | `qa-pact` |
| C | Muda o **payload de um evento** publicado ou consumido no Kinesis | `qa-pact` |
| D | Cria, altera, corrige ou revisa um **teste** (unitário, integração, funcional) | `qa-oraculo` |
| E | Cria ou altera uma **regra de negócio**: cálculo, elegibilidade, limite, validação, fluxo de pedido ou de oferta | `qa-oraculo` |
| F | Pedido explícito de "QA", "revisar testes" ou "validar qualidade" | as duas, conforme o diff |

Não acione nenhuma skill de QA quando a mudança for só:

- texto, estilo ou layout de UI que não muda o formato dos dados;
- documentação, comentário ou README;
- configuração de infra sem efeito em contrato ou comportamento (réplicas, limites de recurso);
- refatoração puramente interna, sem teste novo e sem mudança de formato nas bordas.

Nesses casos, diga em uma linha que nenhuma skill de QA se aplica e por quê.

## 2. Ordenar

- Só A, B ou C → `qa-pact`.
- Só D ou E → `qa-oraculo`.
- Os dois grupos → **primeiro `qa-pact`** (o formato), **depois `qa-oraculo`** (a semântica).
  Os testes funcionais escritos pelo `qa-oraculo` devem usar os nomes de campo já
  acordados no contrato.

Leia o `SKILL.md` de cada skill escolhida e siga-o por inteiro. Não resuma nem pule passos.

## 3. Limites entre as skills

- Pact verifica **formato e tipo**. Não verifica se a taxa, a parcela ou a aprovação estão certas.
- Oráculo verifica **semântica**: o valor ou o comportamento está correto segundo a fonte de autoridade.
- Se o dev pedir que o contrato verifique uma regra de negócio, encaminhe essa parte ao `qa-oraculo`.
- Se um teste funcional quebrar por mudança de formato, verifique se o contrato também
  precisa mudar (`qa-pact`).

## 4. Regras que valem para o grupo inteiro

- Nunca afrouxe um assert nem um contrato só para o teste ou o pipeline passar.
- Nunca invente regra de negócio, nome de serviço, URL de broker nem nome de pipeline.
  Se faltar, pergunte ou deixe um placeholder `{{ }}` listado em "Pendências".
- Não acesse HML nem PRD e não grave credenciais em arquivos. Use variáveis de ambiente.
- Seja agnóstico à linguagem. Detecte a linguagem e o framework de teste do repositório
  (arquivos de build, testes existentes) e siga os padrões já usados nele.

## 5. Saída padrão: Relatório de QA

Toda execução do grupo termina com este bloco, curto, uma vez só (consolidando as skills acionadas):

```
### Relatório de QA
Skills acionadas: <qa-pact | qa-oraculo | ambas | nenhuma> — motivo: <critérios A–F>
Verificado:
- <o que foi checado e como>
Criado/alterado:
- <arquivo> — <o que mudou>
Oráculos: <tabela do qa-oraculo, se acionado>
Contratos: <pares consumidor → provedor e interações, se qa-pact acionado>
Riscos:
- <risco encontrado, ou "nenhum identificado">
Pendências (dependem de humano):
- <regra a confirmar, broker, CI, placeholders {{ }}>
```

## Validação

`evals/evals.json` contém pedidos de exemplo com o acionamento esperado. Use-os ao
alterar qualquer `description` do grupo.
