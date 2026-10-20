A jornada foi feita então da seguinte maneira:

## 1. Desenvolvimento da rota
A ideia inicial era mapear ambos os serviços em um único workspace e a LLM ir lendo um repositório e replicando a rota no outro. Isso funcionou no início, mas conforme o novo serviço ia crescendo, a janela de contexto da LLM ia crescendo junto e o número de alucinações + gastos de token ia aumentando. Precisávamos então de uma nova maneira de desenvolver as rotas.

Foi ai que encontramos a primeira solução: criação de skills de handoff.

A criação da nova rota passaria primeiramente por uma escrita handoff de rota a rota no serviço legado fora do workspace, ou seja, sem ter compartilhamento de informações entre cada repositório. O handoff era agnóstico da existência do serviço novo e seria uma documentação markdown de tudo sobre aquela rota: arquitetura, funcionalidade, regras, código (funções, classes, variáveis) inteiramente no markdown. Isso gerava markdowns de aproximadamente 3000 linhas. Para ajudar a LLM que pegaria o handoff e desenvolveria a nova rota a buscar o que ela queria de forma mais efitiva e econômica, o handoff foi feito criando índices e definindo um sumário em seu início. A LLM leria no sumário onde estava a informação que ela precisava para a ação atual e economizaria mais contexto.

Depois, no mercado, surgiu um termo chamado Harness Engineering e com ele, frameworks de I.A. A equipe de crédito desenvolveu um framework chamado spec-kit. Nele, o funcionamento era:
- o spec-kit possuia um conjunto de skills que se colaboravam entre si.
- era focado em spec driven. Logo, a primeira coisa gerada eram documentações de PRD, documentação técnica geral e documentação de tasks (to-dos).
- possui skills auxiliares, como a /grill-me (entrevistava o desenvolvedor), a /execute (que executava as tasks), a /judge (juiz que lia tudo que foi desenvolvido na janela de trabalho e fazia análise crítica).

Esse framework foi incorporado na jornada da migração e o passo-a-passo virou:

- gerar handoff da rota no serviço legado
- colar o handoff no serviço novo
- pedir ao /spec-kit para ler o handoff e planejar as SPECs
- o /judge analisava as docs
- a equipe de review analisava as docs
- o /execute executava tudo que estivesse na doc de tasks
- subia-se a MR para review dentro da esteira CICD
- aguardava-se o QA validar em HML
- liberaria-se a porcentagem inicial do rollout em PRD
- rollout 100% = rota legada recebendo 0% no Datadog.

## 2. Proxy Reverso
Um ponto que tínhamos decidido era o plano de rollout no splitio. Mas onde ficaria essa regra? Em qual serviço?
Pensamos inicialmente em criar a regra no próprio serviço novo, porém, nos preocupamos com o fato de fazer isso impactaria em ter que fazer toda a limpeza do serviço depois da migração, podendo afetar até mesmo em regressões

Logo, pensamos na criação de um serviço golang chamado reverse-proxy. Nele, a regra de ler o split e distribuir entre os serviços facilitaria no controle de limpeza do novo serviço. O reverse-proxy foi essencial para a migração, pois nele, concentrou-se a seguinte jornada:
- os serviços upstreams agora olhava para o reverse-proxy
- o reverse-proxy recebia o endpoint com o mesmo contrato que o legado receberia.
- validava qual era a regra deste endpoint no split
- baseado na regra do split, o reverse-proxy fazia a distribuição:
    - 0% serviço novo: ele fazia o proxy com o legado
    - 100% serviço novo: ele fazia o proxy com o novo
    - 0% < x% < 100% serviço novo: ele batia nos dois serviços em paralelo, validava se ambos se comportavam iguais e devolvia x% do response final do serviço novo aos upstreams.

A etapa de consistência se dava nesta terceira distribuição listada. O próprio reverse-proxy, tanto de forma síncrona quanto assíncrona, fazia a validação de responses + side-effects e dizia ao Datadog quais rotas estavam enfrentando problemas de consistência em HML e PRD.
Ele deixou de ser apenas um serviço de rollout e virou o controle de consistência.

Depois de alguns dias, o reverse-proxy já estava sendo usado para outras migrações diferentes dentro da equipe de crédito.

## 3. QA
A qualidade era primordial para este tipo de migração. Logo, a análise de QA foi feita da seguinte maneira:
- BDD first: O BDD de cada rota era a primeira coisa a ser feita (inclusive antes mesmo do handoff). A equipe de dev e QA se reuniam e validavam tantos os cenários relacionados a contratos (testes de API) quanto cenários orgânicos (testes E2E na web e app).
- Validação do BDD após o código ir para hml.
- Validação de dashboards e métricas do Datadog.
- Validação de regressivo com análises trazidas pelo reverse-proxy.