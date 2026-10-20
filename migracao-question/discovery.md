O processo de discovery foi o primeiro ato após a decisão da migração.

Nele, eu me encarreguei de levantar conversas dentro das equipes Serasa para entender se possuíamos documentações, dores, processos a serem tomados etc que tangenciassem o serviço.

Conversou-se com PMs, gerentes, desenvolvedores de diferentes níveis e SREs.

O plano inicial era marcar reuniões apresentando a proposta de migração de serviço. Nestas reuniões de aproximadamente 1h, bastantes pontos foram trazidos, como:

- sairíamos da arquitetura de PHP e iríamos para qual?
- qual seria a melhor arquitetura distribuída para o novo serviço?
- com o avanço das LLMs, a migração seria totalmente manual, híbrida ou totalmente "vibe coding"?
- quantas pessoas tocariam a migração?
- qual, dentre as principais dores, era a principal dor? Isso guiaria a tomada de decisão em todas as outras escolhas.
- como os usuários finais seriam impactados? em baixo risco? nenhum seria impactado? todos seriam de alguma forma?
- como funcionaria rollouts e rollbacks? Usaria-se Canary Deploy? Usaria-se feature flags?
- como papear todos os serviços upstream x downstream?
- como o mercado tratou uma migração do tipo?

## Principal dor
conforme descrito em "problema.md", tinha-se como dores:
- Dependência de serviço externo de pooling ao banco de dados
- Alto consumo de memória nos pods
- número de pods alto no kubernets
- vulnerabilidades críticas não resolvíveis

A equipe de crédito, então, definiu como principal dor a de vulerabilidades. A empresa já havia sofrido ataque há poucos anos atrás e ter vulnerabilidades críticas dentro de uma empresa que abrange todas as pessoas do Brasil foi considerado algo prioritário a se resolver.

## Arquitetura x Linguagem
Foi-se debatido, quanto a arquitetura, três possibilidades:

### 1. Microsserviços
Quebrar o serviço em quatro novos microsserviços, cada um seguindo uma estrutura diferente, com diferentes linguagens e infraestrutura.
Foi a primeira ADR montada. Ela foi idealizada pelo time de desenvolvimento como o caminho viável para se ter o serviço de onboarding, controlando cenários de CQRS, HPAs, manutenibilidade. O ponto negativo visto foi o de mão-de-obra. A equipe era enxuta até o momento da migração e a dedicação de poucos desenvolvedores cuidado de 4 novo microserviços topo de funil levaria bastante tempo, mesmo com I.A. A corrida contra o tempo foi determinante, uma vez que foi definido que a maior causa da migração era eliminar as vulnerabilidades o mais rápido possível.

### 2. Monolito Modular
A ideia do monolito modular veio para reduzir o tempo da migração do projeto, concentrando os 4 nichos determinados pela equipe em um único repositório e, com o tempo, transformando cada módulo em um microserviço, sem a "pressa" de todos já nascerem como microserviços.
Esta foi por muitos dias a ideia ideal para a migração, porém havia um problema. A equipe tinha muitos desenvolvedores python contra poucos (arrisco a dizer que tinha somente um) de golang. Um dos temas que se debateu nas reuniões foi a escolha da linguagem e foi-se decidido que, para um serviço topo de funil e que afetada diretamente a experiência do usuário tanto na web quanto no app, uma linguagem com baixa latência, poucos problemas de vulnerabilidades e pouco consumo de pods seria o ideal.

### 3. AS IS
Como resolver, então, o problema dos desenvolvedores serem majoritariamente de outra linguagem? Trazendo-os para a linguagem ideal. Viu-se que a melhor maneira de ao mesmo tempo que introduzir os desenvolvedores para golang e correr contra o tempo era fazer uma migração de arquitetura completamente igual, mudando somente a linguagem. Ou seja:
- sem se preocupar com banco: usaria o mesmo banco da arquitetura anterior, chamando-o com as mesmas queries
- sem se preocupar com downstreams: chamaria-se as mesmas APIs externas, mantendo os mesmos contratos.
- sem se preocupar na escolha arquitetural de pastas. Usaria-se o Layer Arch que já existia no PHP.
A única preocupação seria tentar replicar fielmente as funções que existiam no PHP dentro do Golang, se adaptando somente à linguagem Go quanto à sua sintaxe.

### Mas e os outros dois que foram deixados de lado?
A escolha do AS IS não abandonou as outras duas ADRs anteriores. Só postergou. Ou seja, a ideia ainda é repartir o serviço, mas matando primeiramente seu principal problema: as vulnerabilidades do legado.

## LLMs
Como no final de 2025 a confiança em LMMs potentes era grande, o time pensou em migrar de forma vibe-coding, reforçando processos de Review e QA de forma "humanizada" (sem IA). A ideia foi trabalhar com o cursor utilizando GPT e Claude.

## Rollout
O desligamento das rotas se daria por uma migração individual delas. Ou seja. Dentro de x rotas, a equipe migraria uma, faria o processo de qualidade e liberaria no splitio para os upstreams irem consumindo x% da rota no serviço antigo versus y% da rota no serviço novo, até ficarem 100% com a rota do serviço novo. 

"Por que não canary?" O Canary Deploy faria mais sentido se fosse uma migração dentro do próprio repositório php. O controle dele em diferentes repositórios impactaria no contrato k8s dos pods de cada um dos serviços, esbarrando no limite de cada serviço só ter um host intracluster e, caso chamados pelos upstreams via intrakluster, o canary deploy não seria fisicamente possível de ser executado.

## Rollback
O rollback seria controlado também via featureflag. No plano de distirbuimento de porcentagens por rota, deixas a rota 0% ativa no serviço novo seria já um rollback.

## Principais Rotas
O serviço possuia uma espécie de 70 rotas, com um porém: dentro de 3 meses de observabilidade, só 10 eram chamadas. Logo, a ideia foi migrar somente estas rotas, denominando-as como "rotas principais".

### Ordem de migração
A ordem de migração se deu na seguinte métrica: número de req/s. Simples, né? A rota com mais chamadas seria migrada primeiro.

## Mercado
Analisando algumas migrações do mercado, a equipe se espelhou em uma do reddit que focava em um plano de consistência forte, criando Sister Storage e validando se as informações do Main Storage (serviço legado) e Sister Storage (serviço novo) eram 100% consistentes.
link: https://blog.bytebytego.com/p/how-reddit-migrated-comments-functionality