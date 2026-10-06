---
name: qa-pact
description: "Use ao criar ou mudar integrações HTTP entre serviços, respostas do BFF ou eventos no Kinesis (campo novo, renomeado ou removido): cria e verifica contratos Pact."
---

# qa-pact

Crie e mantenha testes de contrato **consumer-driven** com Pact, para HTTP
(BFF ↔ backend, backend ↔ backend, backend ↔ parceiro) e para mensagens (eventos no
AWS Kinesis). O objetivo é garantir que os serviços falam a mesma língua antes do deploy.

**Pact verifica formato, não regra de negócio.** Se a taxa calculada está certa, quem
responde é o teste funcional com oráculo forte (`qa-oraculo`).

Antes de executar comandos (git, docker, instalação de pacote), consulte `.context/rules/`.
Se uma rule bloquear a ação, entregue o comando pronto ao dev.

## Quando ler as referências e os templates

| Situação | Leia |
|----------|------|
| Interação HTTP | `references/pact-http.md` + `templates/consumer-http.md` / `templates/provider-http.md` |
| Evento Kinesis | `references/pact-kinesis.md` + `templates/consumer-message.md` / `templates/provider-message.md` |
| Escolher matcher ou valor exato | `references/matchers.md` |
| Publicar, verificar, `can-i-deploy`, CI | `references/broker-e-ci.md` |

## Pré-passo: detectar a stack

1. Linguagem e framework de teste: `go.mod`, `pyproject.toml`, `requirements*.txt`,
   `composer.json`, `package.json`, `pom.xml`/`build.gradle`, mais os testes existentes.
2. Biblioteca Pact já instalada? Procure `pact` nos arquivos de dependência e nos testes.
   - Se existir, use-a e siga os testes de contrato existentes como padrão.
   - Se não existir, escolha a biblioteca oficial da linguagem
     (tabela em `references/pact-http.md`). Adicionar dependência depende das rules;
     informe o comando ao dev se a rule bloquear.
3. Confira a API **da versão instalada** no README ou nos exemplos da biblioteca antes de
   escrever código. Os templates são agnósticos e mostram a estrutura, não a sintaxe.

## Procedimento

Siga na ordem.

### 1. Identificar o par e o papel

- **Consumidor**: quem chama ou quem lê o evento. **Provedor**: quem responde ou quem publica.
- Protocolo: HTTP ou mensagem (Kinesis).
- Use os **nomes reais dos serviços** (nome do repositório ou do deployment) com sufixo de
  protocolo no pacticipant: `<servico>-http`, `<servico>-kinesis`.
  Exemplo de forma: `bff-app-http` → `ofertas-http`; `pedidos-kinesis` → `notificacoes-kinesis`.
- Contratos HTTP e de mensagem **nunca** compartilham o mesmo pacticipant.
- Se não souber o nome real de um dos lados, pergunte. Não invente.

Se o repositório atual for só o provedor e não houver contrato de consumidor ainda,
diga isso, sugira começar pelo consumidor e só então escreva a verificação do provedor.

### 2. Começar pelo consumidor, com só o que ele usa

1. Encontre no código do consumidor o cliente HTTP ou o handler do evento.
2. Liste **cada campo que o código consumidor lê** e anote onde (arquivo:linha).
   Procure acessos ao campo, desserialização em struct/classe/DTO e mapeamentos.
3. O contrato contém só esses campos. Campo que o consumidor não lê fica fora, mesmo
   que o provedor o devolva: isso preserva a liberdade de evolução do provedor.
4. O teste do consumidor chama o **cliente real** do consumidor contra o mock do Pact,
   e faz asserts sobre o que o cliente devolve. Não chame o mock com um cliente HTTP genérico.

### 3. Matchers por padrão

- Use matchers de tipo e formato (`like`, `integer`, `decimal`, `regex`, `eachLike`).
- Use valor exato só quando o valor é parte do contrato: enums, códigos de status,
  constantes de protocolo.
- Listas variáveis (perguntas por parceiro, perguntas por produto, ofertas) → `eachLike`,
  com `min` quando o consumidor exigir pelo menos N itens.
- Detalhes e armadilhas em `references/matchers.md`.

### 4. Provider states com nome de negócio

- `given` descreve o estado em linguagem de negócio, legível por quem não conhece o código.
  Exemplos de forma: "cliente com oferta aprovada", "parceiro BANCO_X exige 3 perguntas",
  "cliente sem oferta disponível".
- Todo state usado pelo consumidor precisa de um **handler** no provedor, que prepara os
  dados (fixture, banco de teste, stub da dependência). Crie os handlers no passo de provedor.
- Cubra também os caminhos de erro que o consumidor trata (404, 422, parceiro indisponível),
  um state por caminho.

### 5. Eventos do Kinesis (message pact)

- **Consumidor**: o teste passa o payload do contrato para o **handler real** do evento
  (a mesma função usada pelo consumidor do stream), sem montar o processamento à mão.
- **Provedor**: a verificação gera a mensagem pela **mesma função usada em produção** para
  montar o payload antes do `PutRecord`. Nunca um JSON montado à mão no teste.
- O Pact valida o payload (e metadados, se o consumidor os usar, como `partitionKey`
  ou `content-type`). Ele não valida o Kinesis em si.
- Exemplo completo em `references/pact-kinesis.md`.

### 6. Integrar ao CI

1. **Detecte a CI do repositório**: `.gitlab-ci.yml`, `.github/workflows/*.yml`,
   `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `buildspec*.yml`.
   - Se existir, adicione os passos de Pact **no padrão e nos stages já usados**, reutilizando
     templates ou `include`s existentes.
   - Se não existir, gere o pipeline genérico de `references/broker-e-ci.md` como
     **proposta**, sem ativá-lo.
2. Consumidor: rodar os testes de contrato e publicar os pacts no broker.
3. Provedor: verificar os pacts (do broker, no pipeline do provedor e via webhook
   `contract_requiring_verification_published`) e publicar o resultado.
4. Antes de cada deploy: `can-i-deploy` para o ambiente de destino. Depois do deploy:
   `record-deployment`.
5. **Hoje não existe Pact Broker.** Use `PACT_BROKER_BASE_URL` e `PACT_BROKER_TOKEN` como
   variáveis de ambiente, e liste em "Pendências" que o broker, o webhook e o `can-i-deploy`
   dependem de `{{PACT_BROKER_URL}}`. Até lá, siga o modo sem broker de `references/broker-e-ci.md`.
6. Não altere variáveis nem pipelines de HML ou PRD. Não grave tokens em arquivos.

### 7. Quando um contrato quebrar

1. Leia a saída da verificação e identifique: a interação, o campo (caminho JSON), o tipo
   de quebra (ausente, tipo diferente, status diferente) e **qual consumidor** é afetado.
2. Se a mudança for uma renomeação ou remoção no provedor, procure todos os consumidores
   (pacts no broker, `pacts/` locais, busca pelo nome do campo nos repositórios conhecidos)
   e liste-os.
3. Proponha duas saídas:
   - **corrigir o provedor** para voltar a cumprir o contrato; ou
   - **negociar a mudança** com o consumidor, em duas etapas: o provedor adiciona o campo
     novo mantendo o antigo, os consumidores migram e publicam novos pacts, e só então o
     provedor remove o campo antigo (validado por `can-i-deploy`). Outra opção é versionar o endpoint ou o evento.
4. **Nunca** apague uma interação, troque valor exato por matcher, remova um campo do
   contrato ou desligue a verificação só para o pipeline passar. Isso só pode acontecer quando
   o consumidor realmente deixou de usar o campo, comprovado no código do consumidor.

### 8. Delimitar o escopo

Se o dev pedir que o contrato verifique uma regra de negócio (valor da taxa, aprovação,
cálculo de parcela), explique que Pact verifica só formato, mantenha o campo com matcher
de tipo e encaminhe a verificação do valor ao `qa-oraculo`.

## Saída

Contribua para o Relatório de QA (formato na skill `qa`) com:

```
Contratos:
| Consumidor → Provedor | Protocolo | Interação / mensagem | Provider state | Campos no contrato |
Consumidores afetados (se houve quebra): <lista>
CI: <arquivo alterado | proposta gerada em ... | sem CI detectada>
Pendências: broker ({{PACT_BROKER_URL}}), webhook, handlers de state a implementar
```
