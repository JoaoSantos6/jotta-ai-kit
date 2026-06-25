# Metodologia PREVC

> Leia este arquivo SEMPRE. Ele é o motor do processo. As cinco fases são
> sequenciais: **P**lanejamento → **R**evisão → **E**xecução → **V**alidação →
> **C**onclusão. Não pule fases e não escreva o markdown final antes da fase de
> Execução.

## Índice
1. Planejamento
2. Revisão (subagente em background)
3. Execução
4. Validação (teste de mesa mental)
5. Conclusão

---

## 1. Planejamento

Objetivo: entender em profundidade o que foi pedido, sem deixar dúvidas sobre o
comportamento esperado no BDD.

Passos:
1. **Levante o contexto.** Use, nesta ordem de prioridade, o que estiver disponível:
   - o contexto dado diretamente no chat pelo desenvolvedor;
   - uma documentação de **handoff** (busque por arquivos como `HANDOFF.md`,
     `handoff/`, `docs/`, specs, tickets, READMEs da feature);
   - código e estruturas relevantes do repositório (rotas, controllers, schemas,
     migrações de banco — úteis principalmente para BDD de API).
2. **Faça uma busca profunda no repositório.** Não confie só no enunciado. Procure a
   funcionalidade alvo, seus fluxos de erro, validações, dependências e dados
   necessários. Para API, identifique endpoint, método HTTP, headers, payload,
   autenticação e de onde vêm as variáveis (ver `template-api.md`).
3. **Decida o tipo de BDD.** Determine se é **API** (`template-api.md`) ou
   **humanizado** (`template-humanizado.md`). Em caso de dúvida, pergunte.
4. **Mapeie os cenários candidatos** (mentalmente ou em rascunho): caminho feliz,
   caminhos de erro, casos de borda.
5. **Resolva dúvidas com o desenvolvedor.** Se restar QUALQUER ambiguidade que
   mude o comportamento (regra de negócio incerta, status esperado desconhecido,
   variável sem origem clara), **pergunte antes de prosseguir**. Não invente regra
   de negócio. Liste as perguntas de forma objetiva e aguarde a resposta.

Saída da fase: um entendimento claro do comportamento + a lista de cenários a cobrir
+ o tipo de BDD escolhido. Nada disso ainda vai para o arquivo final.

---

## 2. Revisão (subagente em background)

Objetivo: validar o planejamento de forma independente, comparando **o que foi
pedido** com **o que se pretende gerar**, antes de gastar esforço escrevendo.

Como acionar:
- **Acione um subagente apartado, em background**, dedicado à revisão. O subagente
  recebe o pedido original + o plano de cenários e devolve uma crítica.
  - Em ambientes com subagentes (ex.: Claude Code via Task tool, agentes de
    background do Cursor): dispare o subagente em background usando as instruções de
    `subagente-revisao.md` como prompt.
  - Se o ambiente **não** oferecer subagentes, faça a revisão adotando explicitamente
    uma persona separada de revisor (um "segundo par de olhos" crítico) seguindo o
    mesmo checklist de `subagente-revisao.md`, antes de avançar.
- Enquanto o subagente roda em background, você pode adiantar a fase de Execução,
  mas **não conclua** (fase C) sem incorporar o retorno da revisão.

Saída da fase: confirmação de que o plano cobre o pedido, ou uma lista de ajustes a
fazer (cenários faltando, escopo errado, tipo de BDD trocado, dúvidas não resolvidas).

---

## 3. Execução

Objetivo: desenvolver o markdown do BDD.

Passos:
1. Carregue o template correto (`template-api.md` **ou** `template-humanizado.md`).
2. Escreva o cabeçalho da funcionalidade e os cenários planejados, seguindo
   `regras-gerais-bdd.md` (DADO/QUANDO/ENTÃO/E, linguagem natural).
3. Para BDD de API: ao final de cada cenário, inclua o `curl` de execução e, quando
   ele depender de variáveis, a instrução de como obtê-las (ex.: o `SELECT` no banco).
4. Salve o arquivo no repositório, em local coerente com a convenção do projeto
   (ex.: `features/`, `docs/bdd/`, ao lado da feature). Se não houver convenção,
   proponha um caminho ao desenvolvedor.

Saída da fase: o markdown escrito (ainda sujeito à Validação).

---

## 4. Validação (teste de mesa mental)

Objetivo: justificar cada cenário e conferir os padrões, **sem escrever o teste de
mesa no arquivo**.

> IMPORTANTE: o teste de mesa acontece **enquanto você pensa**, não no markdown. O
> arquivo final NÃO deve conter a tabela/rascunho do teste de mesa.

Passos:
1. **Teste de mesa de cada cenário.** Percorra mentalmente DADO → QUANDO → ENTÃO
   como se executasse: o estado inicial leva, pela ação, exatamente ao resultado
   afirmado? Se não fechar, o cenário está errado — corrija.
2. **Conferência de template.** Verifique se o markdown segue o template escolhido
   (estrutura de cabeçalho, formatação dos conectores, presença de `curl` nos BDDs de
   API, variáveis explicadas).
3. **Conferência de regras.** Rode o checklist de `regras-gerais-bdd.md` (seção 6).
   Garanta que não há vazamento de TDD.
4. Incorpore o retorno do subagente de Revisão (fase 2), se ainda não foi feito.

Saída da fase: cenários justificados e conformes, ou correções aplicadas e
re-validadas.

---

## 5. Conclusão

Objetivo: finalizar o markdown.

Passos:
1. Releia o arquivo inteiro com olhos novos.
2. Confirme que o arquivo está salvo no caminho correto do repositório.
3. Entregue ao desenvolvedor um resumo curto: o que foi gerado, quais cenários,
   onde está o arquivo e quaisquer pendências/variáveis que ele precise resolver
   (ex.: rodar um `SELECT` para obter um token antes de executar os `curl`).

Saída da fase: BDD concluído e entregue.
