---
name: analyze-php-route
description: Analisa uma rota PHP no question-ms e produz um documento de especificação completo para migração. Use quando precisar entender o que uma rota faz antes de migrá-la.
disable-model-invocation: false
---

# Skill: Análise de Rota PHP

## Quando Usar

Use esta skill quando precisar analisar uma rota do `question-ms` antes de migrá-la para Go.

## Procedimento

### 1. Localize a Rota

- Busque no arquivo de rotas do PHP (geralmente `routes.php`, `web.php` ou equivalente) a rota alvo.
- Identifique o controller e o método associado.

### 2. Mapeie o Controller

Leia o controller e extraia:

- **Método HTTP**: GET, POST, PUT, DELETE, PATCH
- **Path**: URI completa incluindo parâmetros dinâmicos
- **Middlewares**: Autenticação, autorização, rate limiting, etc.
- **Request**: Parâmetros de query string, body (JSON/form), path params
- **Validações**: Rules de validação do Laravel/framework usado
- **Lógica de negócio**: Passo a passo do que o método faz
- **Queries SQL**: Todas as queries executadas (diretas ou via ORM)
- **Chamadas externas**: APIs, filas, cache, eventos
- **Response**: Status codes possíveis e formato do payload de resposta
- **Tratamento de erros**: Exceções capturadas e respostas de erro

### 3. Mapeie Dependências

- Services/Repositories injetados no controller
- Models/Entities utilizados
- Helpers ou utils chamados
- Configurações/variáveis de ambiente consultadas

### 4. Gere o Documento de Especificação

Produza um resumo estruturado em Markdown com todas as informações acima. Este documento será usado como input para a skill de geração de código Go.

Salve o documento como comentário no chat — NÃO crie arquivos de especificação no repositório.

### 5. Checklist de Revisão

Antes de finalizar, confirme:

- [ ] Todos os status codes de resposta foram mapeados?
- [ ] Todas as queries SQL foram identificadas?
- [ ] As validações de input estão completas?
- [ ] Chamadas a serviços externos foram listadas?
- [ ] O tratamento de erros está documentado?
