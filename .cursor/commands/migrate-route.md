---
description: "Migra uma rota do question-ms (PHP) para o question-core (Go). Executa o pipeline completo: análise → geração → validação."
---

# Migrar Rota: {{route_name}}

Execute o pipeline completo de migração para a rota `{{route_name}}`.

## Pipeline de Execução

### Fase 1 — Análise (subagent: php-analyst)

Delegue ao subagent `php-analyst` a análise da rota `{{route_name}}` no `question-ms/`.

O php-analyst deve:
1. Localizar a rota nos arquivos de rotas do PHP
2. Ler o controller, service, repository e models envolvidos
3. Produzir uma especificação técnica completa em Markdown

Aguarde a especificação antes de prosseguir.

### Fase 2 — Geração (subagent: go-generator)

Passe a especificação da Fase 1 para o subagent `go-generator`.

O go-generator deve:
1. Estudar uma rota já migrada no `question-core/` como referência
2. Listar os arquivos que serão criados/modificados
3. Implementar a rota em Go seguindo os padrões existentes
4. Executar `go build` e `go vet` para validar

### Fase 3 — Validação (subagent: migration-guard)

Delegue ao subagent `migration-guard` a validação final.

O migration-guard deve:
1. Verificar que nenhum arquivo existente foi alterado indevidamente
2. Confirmar que compila e passa no vet
3. Rodar todos os testes
4. Comparar o padrão do código novo com a referência
5. Produzir o relatório final

## Regras do Pipeline

- Se a Fase 1 encontrar algo ambíguo na rota PHP, **PARE e pergunte** antes de prosseguir.
- Se a Fase 2 falhar no build/vet, o go-generator deve corrigir antes de avançar para a Fase 3.
- Se a Fase 3 detectar violações, **PARE e reporte** — não tente corrigir automaticamente.
- Em caso de dúvida sobre o padrão, sempre consulte a rota de referência já migrada.
