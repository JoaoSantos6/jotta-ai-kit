---
description: "Valida o estado atual do question-core. Verifica compilação, testes e integridade das rotas existentes."
---

# Validar question-core

Delegue ao subagent `migration-guard` uma validação completa do estado atual do `question-core/`.

## O que verificar

1. `go build ./...` — compila sem erros
2. `go vet ./...` — sem warnings
3. `go test ./... -count=1` — todos os testes passam
4. `git status` — verificar se há alterações não comitadas

## Output Esperado

Relatório com status de cada verificação e lista de problemas encontrados (se houver).
