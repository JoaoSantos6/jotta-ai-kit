---
title: "Convenções Go do question-core"
globs: ["question-core/**/*.go"]
---

# Convenções de Código Go

Ao gerar ou editar qualquer arquivo `.go` no question-core:

## Estilo

- Siga as convenções já presentes no projeto (nomes de pacotes, structs, interfaces).
- Use os mesmos padrões de error handling encontrados nas rotas já migradas.
- Mantenha as mesmas bibliotecas/frameworks já utilizados (HTTP router, ORM, logger, etc).
- Não introduza dependências novas sem justificativa explícita.

## Estrutura de Arquivos

- Handlers vão no mesmo diretório onde os handlers existentes estão.
- Models/entities seguem o padrão de diretório já estabelecido.
- Rotas são registradas no mesmo arquivo de registro de rotas existente.
- Testes seguem o padrão `*_test.go` no mesmo pacote.

## Validação

- Após gerar código, execute `go vet ./...` e `go build ./...` para validar.
- Se houver testes existentes, rode `go test ./...` para garantir que nada quebrou.

## Proibições

- NÃO altere arquivos de rotas já migradas.
- NÃO mude assinaturas de interfaces ou structs existentes.
- NÃO altere arquivos de configuração globais (main.go, config, etc.) a menos que seja estritamente necessário para registrar a nova rota.
