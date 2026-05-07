---
name: generate-go-route
description: Gera o código Go para uma rota migrada, usando como base a especificação produzida pela análise do PHP e os padrões já existentes no question-core. Use após a análise da rota PHP estar completa.
disable-model-invocation: false
---

# Skill: Geração de Código Go

## Quando Usar

Use esta skill após a skill `analyze-php-route` ter produzido a especificação da rota. Esta skill transforma a especificação em código Go funcional.

## Procedimento

### 1. Estude o Padrão Existente

Antes de escrever qualquer código, leia no `question-core/`:

- Uma rota já migrada como referência (handler, model, repository, registro de rota)
- O arquivo de registro de rotas para entender como rotas são registradas
- As interfaces de repository/service existentes
- Os patterns de error handling e response

### 2. Identifique Arquivos a Criar/Modificar

Com base no padrão existente, liste:

- **Novos arquivos**: Handler, DTO/Request, Repository (se necessário), tests
- **Arquivos a modificar**: SOMENTE o arquivo de registro de rotas (para adicionar a nova rota)
- **Arquivos proibidos**: Qualquer arquivo de rotas já migradas

### 3. Gere o Código

Para cada arquivo novo:

- Siga exatamente a mesma estrutura dos arquivos equivalentes da rota de referência
- Mesmo padrão de nomes (pacote, arquivo, struct, função)
- Mesmo estilo de error handling
- Mesmo formato de response
- Mesmas bibliotecas

### 4. Registre a Rota

- Adicione APENAS a nova rota no arquivo de registro
- Não altere rotas existentes
- Mantenha a mesma convenção de agrupamento/organização

### 5. Gere Testes

- Crie testes unitários seguindo o padrão dos testes existentes
- Cubra: caso de sucesso, validação de input, erros de negócio, erros de infra
- Use as mesmas bibliotecas de teste/mock já presentes no projeto

### 6. Validação Automática

Após gerar todo o código, execute:

```bash
cd question-core && go vet ./...
cd question-core && go build ./...
cd question-core && go test ./... -count=1
```

Se houver erros, corrija-os antes de finalizar.
