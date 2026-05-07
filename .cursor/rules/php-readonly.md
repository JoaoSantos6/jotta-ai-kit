---
title: "Leitura do question-ms (PHP)"
globs: ["question-ms/**/*.php"]
---

# Regras para o Serviço PHP

O `question-ms` é **somente leitura**. Ele existe apenas como referência para a migração.

## Ao Ler Código PHP

- Extraia: rota (método HTTP + path), parâmetros (query, body, path), validações, regras de negócio, queries SQL, respostas (status codes + payload).
- Identifique dependências externas (outros serviços, filas, cache).
- Mapeie o tratamento de erros e exceções.
- Note qualquer middleware aplicado à rota.

## NUNCA

- Nunca sugira alterações em arquivos PHP.
- Nunca crie arquivos dentro de `question-ms/`.
