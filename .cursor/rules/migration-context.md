---
title: "Contexto de Migração PHP → Go"
alwaysApply: true
---

# Contexto do Projeto de Migração

Este workspace contém dois repositórios dentro da pasta `migracao/`:

- `question-ms/` — Serviço original em **PHP**
- `question-core/` — Serviço novo em **Go** (migração AS IS)

## Regras Invioláveis

1. **NUNCA altere código de rotas já migradas no question-core.** Rotas existentes são intocáveis.
2. **NUNCA altere código no question-ms.** O serviço PHP é somente leitura — serve apenas como referência.
3. **Respeite a estrutura de pastas do question-core.** Novos arquivos devem seguir exatamente o padrão de organização já existente (pacotes, diretórios, naming conventions).
4. **Migração AS IS.** O comportamento da rota em Go deve ser idêntico ao comportamento em PHP. Sem refatorações, sem melhorias, sem mudanças de contrato.
5. **Mesma infra.** Banco de dados, filas, cache, variáveis de ambiente — tudo permanece igual.

## Antes de Qualquer Alteração

- Leia os arquivos existentes no `question-core/` para entender as convenções adotadas.
- Identifique quais rotas já foram migradas para não sobrepor nada.
- Confirme que a nova rota não conflita com rotas registradas.

## Padrão de Referência

Sempre que houver dúvida sobre como estruturar algo no Go, consulte uma rota já migrada como exemplo canônico. A primeira rota migrada é o padrão-ouro.
