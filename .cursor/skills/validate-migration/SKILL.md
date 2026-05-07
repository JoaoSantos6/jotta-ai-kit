---
name: validate-migration
description: Valida que a migração de uma rota não quebrou nada no question-core. Verifica integridade de rotas existentes, compilação, testes e aderência aos padrões. Use como etapa final após gerar o código Go.
disable-model-invocation: false
---

# Skill: Validação da Migração

## Quando Usar

Use esta skill como última etapa, após o código Go ter sido gerado pela skill `generate-go-route`.

## Procedimento

### 1. Verificação de Integridade

Confirme que NENHUM arquivo de rota já migrada foi alterado:

```bash
cd question-core && git diff --name-only
```

Revise a lista de arquivos modificados. Se qualquer arquivo que não seja da nova rota ou do registro de rotas aparecer, **REVERTE** a alteração imediatamente.

### 2. Compilação

```bash
cd question-core && go build ./...
```

Deve compilar sem erros.

### 3. Análise Estática

```bash
cd question-core && go vet ./...
```

Deve passar sem warnings.

### 4. Testes

```bash
cd question-core && go test ./... -count=1 -v
```

- Todos os testes existentes devem continuar passando
- Os novos testes devem passar

### 5. Checklist de Conformidade

- [ ] A nova rota segue a mesma estrutura de diretórios?
- [ ] Os nomes de arquivos seguem a convenção do projeto?
- [ ] O handler segue o mesmo padrão dos existentes?
- [ ] O registro da rota está no local correto?
- [ ] Nenhum arquivo pré-existente (além do registro de rotas) foi modificado?
- [ ] Os testes cobrem sucesso, erro de validação e erro de infra?
- [ ] As mesmas bibliotecas/dependências estão sendo usadas?

### 6. Relatório

Ao final, produza um resumo:

```
## Relatório de Migração: [NOME_DA_ROTA]

- Rota: [METHOD] [PATH]
- Arquivos criados: [lista]
- Arquivos modificados: [lista]
- Testes: [X passando / Y falhando]
- Compilação: OK/FALHA
- Vet: OK/FALHA
- Rotas existentes afetadas: NENHUMA
```
