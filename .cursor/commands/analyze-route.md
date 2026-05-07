---
description: "Analisa uma rota PHP do question-ms e produz a especificação técnica sem gerar código. Útil para revisão antes de migrar."
---

# Analisar Rota: {{route_name}}

Delegue ao subagent `php-analyst` a análise completa da rota `{{route_name}}` no `question-ms/`.

## O que fazer

1. Localize a rota `{{route_name}}` nos arquivos de rota do PHP
2. Trace todo o fluxo: rota → middleware → controller → service → repository → model
3. Produza a especificação técnica completa

## Output Esperado

Um documento Markdown com:
- Método HTTP + path
- Parâmetros (path, query, body) com tipos
- Validações de input
- Lógica de negócio passo a passo
- Queries SQL
- Chamadas externas (APIs, filas, cache)
- Responses (status codes + payloads)
- Tratamento de erros

## Importante

- **NÃO gere código Go** — esta é apenas a fase de análise.
- Se algo estiver ambíguo ou complexo, destaque no documento.
