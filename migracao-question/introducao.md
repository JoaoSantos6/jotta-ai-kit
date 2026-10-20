O serviço de perguntas da equipe de crédito da Serasa é um serviço baseado em armazenar perguntas e respostas de onboarding do usuário.
Ao invés de ser só um serviço que traz dados pontuais como "João Vitor" no campo "name", ele também é um serviço que guarda a pergunta "qual é o seu nome", com um question_id por exemplo. Ele é primordial para a área de marketplace de crédito, pois com a análise de informações pendentes para bater nas integrações dos clientes, puxa-se a pergunta para aquela pendência no processo de onboarding e salva a resposta daquela pergunta

O mapeamento da migração do serviço legado para o novo começou por falta de suporte no antigo. Ele acumulava vulnerabilidades de libs e ao tentarmos corrigí-las, pegamos outro problema: sua pipeline só aceitava uma imagem possível, em cima do php 7.4. Nenhuma versão abaixo da 7.4 funcionaria e versões acima (até mesmo a do php 8) também não.
Houveram tentativas de atualização por mais de três desenvolvedores, mas nenhuma com eficácia.

Este não era o único problema do serviço. Ele apresentava alguns outros pontos como:
- Dependência de serviço externo de pooling ao banco de dados
- Alto consumo de memória nos pods
- número de pods alto no kubernets
- falta de cache eficaz para respostas internas
