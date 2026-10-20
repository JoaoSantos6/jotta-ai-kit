# Como migramos um serviço crítico de PHP 7.4 para Go sem derrubar 1.000 req/s (e sem ninguém notar)

### A história de uma migração que começou como "conserta essa vulnerabilidade" e terminou redesenhando como uma squad de crédito faz engenharia com IA

---

Existe um tipo de problema que todo engenheiro sênior já viu pelo menos uma vez na carreira: aquele serviço que ninguém quer tocar.

Ele funciona. Ele é importante — na verdade, é *crítico*. Mas ele está preso no tempo: uma versão de linguagem que não pode subir, uma lib vulnerável que não pode ser trocada, uma pipeline que só aceita uma única imagem de build. Três desenvolvedores diferentes já tentaram atualizar e nenhum conseguiu.

Esse era o nosso serviço de perguntas (vou chamar de Question-MS daqui em diante) da equipe de crédito da Serasa.

Não é um serviço glamouroso. Ele guarda perguntas e respostas do processo de onboarding do usuário — mas não apenas o dado final ("nome: João Vitor"), e sim a pergunta em si, com um `question_id`, o que o torna peça central para o marketplace de crédito: quando falta alguma informação para completar a integração de um cliente, é esse serviço que sabe qual pergunta reexibir e onde salvar a resposta.

Rodando em PHP 7.4, travado, sem suporte, e carregando vulnerabilidades de segurança que ninguém conseguia corrigir sem quebrar tudo.

Este artigo é a jornada completa dessa migração: do discovery até produção, passando por decisões arquiteturais difíceis, um framework de IA construído do zero, um proxy reverso que se tornou peça-chave de consistência de dados, e todos os tropeços que vieram no meio do caminho. Se você está pensando em migrar um sistema legado — especialmente numa época em que todo mundo quer saber "como usar IA nisso" — essa história tem lição pra te poupar tempo.

---

## O problema: quando "só atualizar uma lib" não é mais possível

Tudo começou pela falta de suporte do serviço legado. Ele acumulava vulnerabilidades em suas dependências e, ao tentar corrigi-las, batíamos em outra parede: a pipeline de build só aceitava **uma única imagem possível**, construída sobre PHP 7.4. Nenhuma versão anterior funcionava. Nenhuma posterior também — nem mesmo o PHP 8.

Mais de três desenvolvedores diferentes tentaram destravar essa atualização em momentos distintos. Nenhum teve sucesso.

E o PHP travado não era o único problema. A lista de dores incluía:

- Dependência de um serviço externo de *pooling* para acessar o banco de dados
- Alto consumo de memória nos pods
- Número excessivo de réplicas (pods) no Kubernetes para sustentar a carga
- Falta de cache eficaz para respostas internas

Era, em resumo, um serviço que funcionava, mas que vivia no limite da sua própria infraestrutura — e que tinha uma bomba-relógio de segurança que ninguém conseguia desarmar.

A decisão estava tomada: a migração teria que acontecer. A pergunta era **como**.

---

## Discovery: antes de migrar, entenda o porquê

A primeira coisa que fizemos — e isso talvez seja o conselho mais importante deste artigo inteiro — **não foi escrever uma linha de código**. Foi conversar.

Marcamos reuniões de aproximadamente uma hora com PMs, gerentes, desenvolvedores de diferentes níveis e SREs. O objetivo não era técnico puro: era entender dores, processos, documentações existentes (ou a falta delas) e tudo que tangenciava aquele serviço dentro da Serasa.

Nessas conversas, uma lista grande de perguntas foi sendo destrinchada:

- Saímos do PHP para qual arquitetura?
- Qual a melhor arquitetura distribuída para o novo serviço?
- Com o avanço das LLMs, a migração seria totalmente manual, híbrida, ou "vibe coding" puro?
- Quantas pessoas tocariam o projeto?
- Entre as dores listadas, qual era a **principal**? Essa resposta guiaria todas as outras decisões.
- Como os usuários finais seriam impactados?
- Como funcionariam rollout e rollback? Canary Deploy? Feature flags?
- Como mapear todos os serviços upstream e downstream?
- Como o mercado já resolveu esse tipo de problema antes?

### A dor que decidiu tudo

De todas as dores listadas — dependência de pooling externo, alto consumo de memória, excesso de pods, vulnerabilidades críticas — a equipe de crédito elegeu uma como prioridade absoluta: **as vulnerabilidades**.

Não foi uma escolha aleatória. A empresa já havia sofrido um ataque de segurança poucos anos antes, e manter vulnerabilidades críticas abertas em um sistema que lida com dados de praticamente toda a população do Brasil era um risco inaceitável. Essa decisão — "resolver vulnerabilidade é mais urgente que resolver performance ou custo" — moldou cada escolha arquitetural que vem a seguir.

---

## A decisão mais difícil: arquitetura vs. linguagem vs. tempo

Com a dor principal definida, veio o debate mais espinhoso do processo: **qual caminho arquitetural seguir?** Três opções foram colocadas na mesa.

### Opção 1 — Microsserviços "nascidos corretos"

A primeira ideia, e também a primeira ADR formalizada, foi quebrar o serviço legado em quatro novos microsserviços, cada um com sua própria stack e infraestrutura. Tecnicamente, era a opção mais "correta": permitia desenhar CQRS, HPAs e manutenibilidade desde o dia zero.

O problema era humano, não técnico: a equipe era enxuta, e dedicar poucos desenvolvedores à criação simultânea de quatro microsserviços de topo de funil — mesmo com ajuda de IA — levaria tempo demais. E tempo era exatamente o recurso mais escasso, já que a prioridade número um era eliminar vulnerabilidades críticas o quanto antes.

### Opção 2 — Monolito modular

A segunda proposta tentava resolver o problema do tempo: concentrar os quatro domínios identificados em um único repositório, deixando a quebra em microsserviços para um momento futuro, sem a pressa de "nascerem" todos divididos.

Essa foi, por muitos dias, considerada a ideia ideal. Até surgir um obstáculo inesperado: a composição do time. A squad tinha muitos desenvolvedores Python e praticamente um único desenvolvedor de Go. E, nas discussões sobre qual linguagem usar, ficou claro que um serviço de topo de funil — que impacta diretamente a experiência do usuário tanto na web quanto no app — pedia uma linguagem de baixa latência, poucas vulnerabilidades históricas e baixo consumo de recursos. Ou seja: Go.

### Opção 3 — AS IS (a escolha final)

E se o problema era ter poucos devs Go, por que não usar a própria migração como veículo de capacitação? Essa foi a lógica por trás da decisão final: fazer uma migração de arquitetura **completamente idêntica** à original, mudando apenas a linguagem.

Na prática, isso significava:

- **Banco de dados**: usar o mesmo banco, com as mesmas queries do PHP.
- **Downstreams**: chamar as mesmas APIs externas, mantendo exatamente os mesmos contratos.
- **Organização de pastas**: replicar o Layer Architecture já existente no serviço PHP.

A única preocupação real era traduzir fielmente as funções do PHP para Go, adaptando apenas a sintaxe da linguagem.

### E as outras duas ideias? Descartadas?

Não. Apenas adiadas. A escolha do AS IS não enterrou a visão de microsserviços ou monolito modular — ela só definiu uma ordem de prioridade: **primeiro matar o problema das vulnerabilidades, depois evoluir a arquitetura**. Migrar rápido hoje, para ter liberdade de redesenhar com calma depois.

### E a IA, onde entra?

No fim de 2025, a confiança em LLMs potentes já era alta. A squad decidiu migrar no estilo *vibe coding*, mas sem abrir mão de processos de review e QA totalmente humanizados — ou seja, sem IA validando o próprio trabalho da IA. As ferramentas de escolha foram Cursor, com GPT e Claude.

---

## Rollout e rollback: como trocar o motor do avião em pleno voo

Com arquitetura e linguagem decididas, faltava responder a pergunta mais assustadora de qualquer migração: **como trocar de serviço sem que o usuário final sinta qualquer diferença?**

A resposta foi rollout gradual, rota por rota: cada rota migrada passava pelo processo de qualidade e era liberada no Split.io, distribuindo progressivamente a porcentagem de tráfego entre o serviço antigo e o novo, até chegar a 100% no novo.

**"Por que não usar Canary Deploy?"** — essa pergunta surgiu nas reuniões de discovery, e a resposta expõe uma limitação pouco discutida do Canary clássico: ele faz sentido dentro de um único repositório. Como aqui estávamos falando de dois repositórios distintos, o controle de canary impactaria diretamente o contrato Kubernetes dos pods de cada serviço — cada serviço só podia ter um host intracluster, e chamadas internas via intracluster tornavam o canary deploy fisicamente inviável.

O **rollback**, por sua vez, era uma simples extensão da mesma lógica: bastava zerar a porcentagem da rota no serviço novo via feature flag. Rollback não era um processo separado — era só mais um ponto na mesma escala de 0% a 100%.

### Escolhendo por onde começar

O serviço legado tinha cerca de 70 rotas registradas. Mas três meses de observabilidade revelaram uma informação valiosa: só **10 rotas** eram efetivamente chamadas. A decisão foi óbvia — migrar apenas essas 10, chamadas de "rotas principais", e deixar o resto para depois.

A ordem de migração entre essas dez seguiu uma métrica simples: número de requisições por segundo. A rota mais usada era migrada primeiro — afinal, é nela que o risco (e o aprendizado) é maior.

### Olhando para o mercado

Nenhuma decisão de arquitetura nasce no vácuo. A equipe se inspirou em um case público de migração do Reddit, que apostou em um plano de forte consistência: criar um "Sister Storage" e validar continuamente se as informações batiam 100% com o "Main Storage" (o sistema legado). Essa ideia — validar consistência entre o antigo e o novo em tempo real — se tornaria central, como você verá na seção do proxy reverso.

*(Para quem quiser se aprofundar: [How Reddit Migrated Comments Functionality](https://blog.bytebytego.com/p/how-reddit-migrated-comments-functionality))*

---

## O épico no Jira: colocando números no plano

Com o discovery fechado, veio a hora de transformar decisão em plano de execução. A equipe quebrou o trabalho em grandes grupos de tarefas:

- Criação do repositório do novo serviço + boilerplate
- SPIKE de mapeamento de downstreams
- SPIKE de mapeamento de upstreams
- Redirecionamento de cada upstream para o novo serviço
- Desenvolvimento de cada rota
- Configuração do Split.io

No total, cerca de **80 tarefas** foram abertas (incluindo bugs levantados pelo próprio QA durante o processo). A squad responsável por tocar tudo isso era pequena: 3 desenvolvedores, 1 QA, 1 coordenador e 1 PM. O prazo estipulado foi de aproximadamente **4 meses** — alinhado ao soft date da equipe responsável pelo controle de vulnerabilidades da empresa.

As ferramentas que sustentaram essa engrenagem foram Datadog (observabilidade), Confluence (documentação), Jira (gestão), LLMs potentes (desenvolvimento), um serviço de proxy reverso (rollout e consistência) e Split.io (feature flags).

---

## A jornada de desenvolvimento: quando o contexto da IA se torna o seu maior inimigo

Aqui começa a parte que mais interessa a quem está pensando em usar IA em migrações reais — e é também onde as coisas mais mudaram de rumo.

### Tentativa 1: workspace único, e por que ela falhou

A ideia inicial era simples na teoria: mapear os dois serviços (legado e novo) num único workspace e deixar a LLM ler um repositório enquanto escrevia o outro.

Funcionou bem... no começo. Mas conforme o novo serviço crescia, a janela de contexto da LLM crescia junto — e, com ela, cresciam também as alucinações e o consumo de tokens. Era insustentável escalar assim.

### A solução: handoffs isolados

A virada veio com a criação de **skills de handoff**. Em vez de deixar a LLM ler os dois repositórios ao mesmo tempo, o processo passou a ser dividido em duas etapas desacopladas:

1. Primeiro, uma LLM gerava um **handoff** da rota no serviço legado — totalmente fora do novo workspace, sem nenhum compartilhamento de contexto entre os dois repositórios. Esse handoff era um markdown completo e agnóstico à existência do serviço novo, documentando arquitetura, funcionalidade, regras de negócio e até código (funções, classes, variáveis) daquela rota específica.
2. Esses documentos chegavam a ter **cerca de 3.000 linhas**. Para evitar que a LLM precisasse "ler tudo" a cada consulta — o que destruiria o próprio propósito do handoff — o documento era estruturado com índice e sumário no início, permitindo que a LLM navegasse direto ao trecho relevante, economizando contexto e tokens.

### Spec-Kit: nascimento de um framework próprio

Enquanto isso, o mercado começava a falar de **Harness Engineering** e frameworks de IA mais estruturados. A equipe de crédito aproveitou o momento para desenvolver o próprio framework interno: o **spec-kit**.

Seu funcionamento central:

- Um conjunto de skills que colaboravam entre si.
- Foco em **spec-driven development**: a primeira coisa gerada era documentação — PRD, documentação técnica geral e documentação de tasks.
- Skills auxiliares como `/grill-me` (que "entrevistava" o desenvolvedor para extrair requisitos), `/execute` (que executava as tarefas planejadas) e `/judge` (um "juiz" que lia tudo que havia sido produzido na janela de trabalho e fazia uma análise crítica antes de seguir adiante).

Com o spec-kit incorporado, o fluxo de desenvolvimento de cada rota ficou assim:

1. Gerar o handoff da rota no serviço legado.
2. Colar o handoff no serviço novo.
3. Pedir ao spec-kit para ler o handoff e planejar as specs.
4. O `/judge` analisava as documentações geradas.
5. A equipe de review humana analisava as mesmas documentações.
6. O `/execute` rodava tudo que estava descrito na doc de tasks.
7. Subia-se a MR para review dentro da esteira CI/CD.
8. Aguardava-se a validação do QA em homologação (HML).
9. Liberava-se a porcentagem inicial do rollout em produção.
10. Rollout considerado completo = rota legada recebendo **0%** de tráfego no Datadog.

É um fluxo onde a IA participa pesadamente da execução, mas nunca sozinha — há revisão humana em pelo menos três pontos distintos antes do código ir para produção.

---

## O proxy reverso: a peça que resolveu um problema que ninguém tinha previsto

Um ponto que já havia sido decidido no discovery era o rollout via Split.io. Mas faltava responder uma pergunta prática: **onde, fisicamente, vive essa regra de decisão?**

A primeira ideia foi colocar a lógica dentro do próprio serviço novo. Mas isso trazia um custo escondido: depois da migração, seria necessário fazer uma limpeza completa dessa lógica temporária — com risco real de regressão ao remover código que, a essa altura, já estaria entranhado no resto do sistema.

A solução foi criar um serviço independente, em Go, batizado de **reverse-proxy**. Ele concentrava a regra de ler o Split.io e distribuir o tráfego, deixando o serviço novo livre de qualquer lógica temporária de migração — e, consequentemente, muito mais fácil de limpar depois.

O fluxo passou a ser:

- Os serviços upstream passaram a apontar para o reverse-proxy, em vez de apontar direto para o legado ou para o novo serviço.
- O reverse-proxy recebia a chamada no **mesmo contrato** que o serviço legado sempre recebeu — nenhum upstream precisava saber que havia uma migração em andamento.
- Ele consultava a regra daquele endpoint no Split.io.
- E então decidia o roteamento:
  - **0% no novo serviço** → proxy puro para o legado.
  - **100% no novo serviço** → proxy puro para o novo.
  - **Entre 0% e 100%** → aqui está o pulo do gato: o reverse-proxy batia **nos dois serviços em paralelo**, comparava se os comportamentos eram idênticos, e devolvia ao upstream a resposta da fração (x%) definida para o serviço novo.

### De rollout a guardião de consistência

É exatamente nessa terceira situação — tráfego dividido entre 0% e 100% — que nasceu o verdadeiro valor do reverse-proxy. De forma síncrona e assíncrona, ele validava respostas e efeitos colaterais (*side-effects*) entre os dois serviços, e reportava ao Datadog quais rotas apresentavam inconsistências tanto em homologação quanto em produção.

O reverse-proxy deixou de ser apenas uma ferramenta de rollout e se tornou, na prática, um **sistema de controle de consistência** — a mesma ideia do "Sister Storage" do case do Reddit, só que aplicada em tempo real, no meio do tráfego de produção.

E o impacto não ficou restrito a essa migração: dias depois, o reverse-proxy já estava sendo reaproveitado em **outras migrações** dentro da equipe de crédito.

---

## QA: qualidade não é uma etapa, é uma espinha dorsal

Numa migração desse tipo, onde qualquer inconsistência pode significar um erro silencioso de crédito para um usuário real, qualidade não podia ser tratada como checkpoint final. O processo de QA foi desenhado assim:

- **BDD first**: o BDD de cada rota era escrito **antes até do handoff**. Dev e QA se sentavam juntos e validavam tanto cenários de contrato (testes de API) quanto cenários orgânicos (testes end-to-end na web e no app).
- Validação do BDD após o código subir para HML.
- Validação cruzada com dashboards e métricas do Datadog.
- Validação de regressão com as análises geradas pelo próprio reverse-proxy.

Esse último ponto é o que amarra tudo: o reverse-proxy não era só uma ferramenta de infraestrutura, era também insumo direto do processo de qualidade.

---

## Onde a teoria bateu de frente com a realidade

Nenhuma migração sobrevive intacta ao contato com produção. Aqui estão os principais tropeços — e eles valem ouro para quem for encarar um projeto parecido.

**O plano AS IS nunca é 100% AS IS.** Ferramentas de qualidade de código como o SonarQube simplesmente bloqueavam a replicação de código ruim que existia no legado. A régua de qualidade da empresa havia subido desde que aquele PHP foi escrito, e não dava para trazer tudo "como estava" sem reescrever boa parte.

**Classes não existem em Go — e isso confundiu a IA.** Tentar trazer AS IS uma arquitetura baseada em classes para uma linguagem que trabalha com structs foi um erro de planejamento. A LLM frequentemente se confundia tentando forçar um paradigma que a sintaxe da linguagem simplesmente não suporta. A lição aqui é clara: **respeite a sintaxe idiomática da linguagem de destino desde o primeiro dia**, mesmo numa migração "fiel".

**Perda de pessoas custa mais do que parece.** A saída de colaboradores numa equipe já pequena não apenas reduziu a capacidade de execução — também gerou custo invisível de onboarding, já que cada novo integrante precisava ser ensinado do zero sobre uma migração em andamento.

**Review e QA como gargalo de pessoas únicas.** Quando a pessoa responsável pelo review estava, em paralelo, desenvolvendo algo, entregar a ela um merge request com mais de 100 mudanças virava um gargalo sério. O mesmo valia para o QA: se ele estivesse ocupado com outra frente, e só ele conhecesse os detalhes da migração, era preciso esperar a agenda dele liberar.

**Observabilidade "quase completa" ainda é um risco.** O Datadog mostrava a maioria dos upstreams e downstreams, e a equipe confiou que eram todos. Com o tempo, descobriu-se que havia serviços batendo no legado **sem gerar traces ou spans** — ou seja, invisíveis no monitoramento. Se o legado fosse desligado sem mapeá-los, esses serviços sofreriam erros silenciosos e drásticos. Foi necessário um novo ciclo de discovery só para encontrá-los e cadastrá-los corretamente no Datadog.

**Idempotência (ou a falta dela) em downstreams externos.** Um dos serviços externos usado num fluxo de CRUD não era idempotente. Na etapa de validação de consistência — onde dois serviços (legado e novo) batiam na mesma operação — o segundo chamador sempre recebia erro. A solução foi consistir esse downstream apenas via análise de contrato, sem de fato acioná-lo duas vezes.

**Upstreams são mais complexos do que parecem no papel.** A equipe subestimou o tempo necessário para testar e acompanhar a mudança de URL em cada serviço upstream. O aprendizado: mapear com clareza a importância de cada upstream dentro da regra de negócio, antecipando riscos como erros de CORS, chamadas internas quebradas e regras de negócio aplicadas incorretamente.

**Side-effects escondidos fora do legado.** Existiam serviços fora do sistema legado que agiam *sobre* ele — como um serviço de onboarding que limpava o cache do legado sob regras específicas. Sem mapear esses efeitos colaterais, a análise de inconsistência de dados ficou extremamente difícil de diagnosticar, até a causa raiz ser finalmente descoberta.

---

## Os números: o que realmente mudou

Depois de quatro meses de discovery, decisões difíceis, um framework de IA construído do zero e vários incêndios apagados no meio do caminho, os resultados falaram por si:

- **4x menos custo** de operação do serviço, mesmo usando a mesma infraestrutura.
- **P95 caiu de 200ms para 80ms.**
- **P50 caiu de 50ms para 25ms.**
- **Zero usuários impactados**, mesmo sob picos de 1.000 requisições por segundo.
- Melhora significativa no controle e gestão de vulnerabilidades — a dor que motivou tudo isso desde o início.
- Avanço real na plataformização do fluxo de perguntas da empresa.
- Um serviço final **simples de manter e fácil de evoluir** — exatamente o oposto do que era o legado.

---

## O que levamos dessa migração (e o que você deveria levar também)

Se você está encarando — ou vai encarar — uma migração parecida, aqui está o resumo prático de tudo que aprendemos:

**Comece com um discovery de verdade.** Não é só engenharia reversa técnica — é descobrir a importância do serviço a nível de produto, suas dores reais, seus mantenedores. Quanto mais conversa, alinhamento e documentação antes de escrever código, melhor.

**Tenha uma proposta de Agile que deixe todo mundo informado.** Nenhuma ponta do processo deve ficar "no escuro" sobre o status da migração. Metodologias como RACE (Responsável / Aprovador / Consultado / Informado) ajudam a manter todos cientes.

**Mapeie a arquitetura atual de forma exaustiva**, respondendo perguntas como:
- Quem são os downstreams e upstreams?
- Quais eventos e filas estão envolvidos?
- O que precisa ser síncrono e o que pode ser assíncrono?
- Como funciona a comunicação com dados (CQRS, dual write, cache aside, pooling, migrations)?
- Quais serviços externos **não são idempotentes**?

**Mapeie side-effects nas duas direções**: o que o legado gera para fora, e o que serviços externos fazem *sobre* o legado (cache, CRUD direto no mesmo banco, etc).

**Tenha um serviço de consistência automática.** Independente da ferramenta escolhida — no nosso caso, um reverse-proxy em Go — ele precisa, no mínimo: controlar a distribuição de tráfego entre antigo e novo, informar inconsistências, manter confiabilidade quando um dos serviços cai, e não ser complexo a ponto de você mesmo tropeçar no Teorema CAP.

**Invista pesado em observabilidade** — métricas, eventos, traces, saúde de pods e alertas. "Quase completo" não é completo.

**No desenvolvimento, siga um workflow disciplinado**: handoff da rota em markdown → BDD da rota em markdown → harness que leia as docs e planeje em spec-driven → revisores analisando o spec antes do código → código fiel ao spec → testes locais (unitários, manuais, integração, e2e) → documentação de todo erro cometido, seja como skill, guideline ou novo teste → testes de regressão idealmente na esteira de CI/CD → review humano → QA em HML → consistência validada pelo proxy reverso → rollout gradual até 100% → confirmação de que a rota parou de ser acionada no serviço antigo.

**Faça testes de estresse antes de cada push produtivo.** Eles revelam gargalos e código *stateful* que não deveria travar pods ou banco de dados.

**Use IA com eficiência, não com força bruta.** Explore frameworks, harness, skills, MCPs e LLMs que realmente atendam à tarefa em questão. Evite usar uma LLM extremamente poderosa para resolver problemas simples — além do custo em tokens, ela pode se tornar proativa demais, adicionando o que não foi pedido, ou entrar em processos de raciocínio longos para tarefas que deveriam levar segundos. E cuide sempre da janela de contexto: quanto mais ela cresce, maior a chance de alucinação e maior o consumo de tokens. Uma regra simples que adotamos: se o próximo assunto tem relação com o anterior, compacte o contexto (`/compact`, `/summarize`); se não tem, comece do zero (`/clear`, nova conversa).

---

## Fechando

Migrar um serviço crítico nunca é só sobre trocar uma linguagem por outra. É sobre entender por que o sistema existe, que dor realmente precisa ser resolvida primeiro, e construir — às vezes do zero, como fizemos com o spec-kit e o reverse-proxy — as ferramentas que vão te permitir migrar com confiança, sem acordar o time às 3 da manhã por causa de um erro silencioso em produção.

A IA acelerou boa parte do caminho, mas não substituiu nenhuma das decisões difíceis: qual dor priorizar, qual arquitetura escolher, onde colocar a régua de qualidade. Isso ainda é trabalho de engenharia — e, cada vez mais, de bom discovery.

Se este artigo te ajudou a pensar na sua própria migração, ou se você já passou por algo parecido e quer comparar cicatrizes, deixa um comentário. Essas histórias só melhoram quando compartilhadas.
