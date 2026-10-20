Após toda a jornada, jun tamos tudo que deu certo e errado, e deixamos como dicas para a migração os seguintes passos:

- Iniciar por um bom discovery: Antes de mais nada, deve haver um processo não só de engenharia reversa no nível técnico, mas descobrir a importância do serviço a nível de produto. Descobrir suas principais dores. Descobrir seus mantenedores. Aqui, quanto mais conversas, alinhamentos e documentações sobre tudo que tange ao serviço a ser migrado, melhor.

- Ter uma proposta consolidada de Agile, com uma metodologia que deixe todos os envolvidos nas entregas cientes do que está acontecendo. Não deixe nenhuma ponta "no escuro", sem receber notificações do status da migração. Um exemplo de metodologia que pode ser usada é a RACE (Responsável/Aprovador/Consultado/Informado)

- Mapeamento de arquitetura atual: Mapear toda a estrutura do serviço, se perguntando sobre:
    - quem são os downstreams
    - quem são os upstreams
    - quais são os eventos envolvidos
    - quais são as filas envolvidas
    - quais são os processos necessariamente assíncronos
    - quais são os processos necessariamente síncronos
    - como funciona a comunicação com dados: CQRS, dual write, cache aside, poolings, migrations
    - quais serviços externos não são idempotentes

- Mapear side-effects: Mapeie se o serviço legado gerava algum side-effect por conta de sua linguagem. Mapeie também se nenhum serviço upstream tinha side-effects que influenciavam no serviço antigo, como limpeza de cache, opreção de CRUD no mesmo banco, etc.

- ter um serviço que medirá a consistência de forma automática: nós usamos o reverse-proxy em golang, mas independente da sua escolha de ferramentas, o ponto é que o serviço deve, no mínimo:
    - controlar distribuição de batidas entre antigo e novo
    - informar quando houver inconsistência
    - confiabilidade quando um serviço fica indisponível
    - não ser complexo demais, pois começaria a enfrentar problemas do teorema CAP

- Ter uma boa ferramenta de observabilidade, com métricas, eventos, traces, saúde dos pods e alertas.

- Desenvolver no workflow:
    - desenvolver handoff de uma rota em markdown
    - desenvolver BDD da rota em markdown
    - usar um bom harness que leias as docs e comece o planejamento em Spec Driven
    - Passar o spec driven para os reviewers analisarem antes do código
    - gerar código totalmente fiel ao spec driven
    - ter uma boa frente de testes locais:
        - testes unitários
        - testes manuais
        - testes de integração
        - testes e2e
    - transformar todos os erros em documentações, seja em skills, em guidelines, em anchoring ou em novos testes.
    - ter o máximo possível de testes de regressão e que, se possível, ele esteja na esteira de CICD ou como hook pré-push
    - reviewers analisarem o código
    - QA analisar a rota em hml
    - proxy reverso gerar informações sobre a consistência
    - fazer rollout da rota até ela estar 100%, no splitio, batendo no novo serviço
    - analisar se a rota parou de ser acionada no serviço antigo

- Faça testes de stresses pelo menos uma vez antes de cada push produtivo. Isso identificará gargalos ou códigos Statefull que não deveria travar os pods ou o banco.

- explore o máximo de I.A. que você poder, mas com uma boa eficicácia/token. Estude frameworks, harness, skills, MCPs e LLMs boas e que atendam da melhor maneira aquilo que se precisa na tarefa atual. Evite sempre tentar usar uma LLM muito poderosa para resolver problemas simples, pois, além de ela consumir muito token para realizar as tarefas, ela pode tentar ser proativa e adicionar coisas que você não pediu, ou entrar em processo de thinking e demorar muito mais para fazer algo que deveria ser em segundos.
Ao usar I.A., também, se preocupe sempre com janela de contexto. Quanto mais estiver sendo usada no momento, maiores as chances de alucinações e consumo de token. Uma boa prática para controlar tokens é:
- o próximo assunto no chat tem a ver com o anterior?
    - Sim: use comandos como /compact ou /summarize para compactar todo o contexto sem perder o assunto
    - Não: use comandos como /clear ou /exit (ou simplesmente abrir um novo chat) para iniciar uma nova conversa, sem consumir tokens do assunto anterior