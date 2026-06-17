# Necessidade

Preciso de uma skill que compare a resposta de duas requisições API e diga se as respostas foram iguais ou não.
A própria skill fará a requisição, preferencialmente com comando curl
Caso não seja, a skill deve falar quais são as diferenças entre cada requisição.

## Validação
- O response tem que ser igual. 
    - Em caso de jsons/objetos/dicts, a ordem das chaves não importa
    - Em caso de array, a ordem das chaves importa
- o status tem que ser igual

## Regras (precisam ser seguidas sempre, sem exceção)
- A skill sempre precisará saber em quais rotas ela deverá bater. Se o contexto não avisar, ela deve perguntar ao desenvolvedor
- A execução dos curl só pode acontecer automaticamente em métodos GET
    - Os outros tipos de métodos sempre precisam da permissão do desenvolvedor para seguir
- a requisição não pode ficar travada por mais de 10 segundos. Esse timeout deve ficar isolado dentro de references/config.md que você criará

## Estrutura
A estrutura deve ser:
<nome_da_skill>/
    - SKILL.md (no máximo com 500 linhas. Concentre coisas específicas no references)
    - references
        - config.md
        - <coisa_especifica_1>.md
        - <coisa_especifica_2>.md


