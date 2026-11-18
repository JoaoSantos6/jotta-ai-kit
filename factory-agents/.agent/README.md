# factory-agents — contrato de portabilidade

O factory-agents é portável: pode ser copiado para qualquer repositório e funcionar sozinho.

## Regras
- Os markdowns do factory-agents só referenciam arquivos e conceitos definidos dentro do próprio factory-agents.
- Nenhuma dependência de memória externa, MCP, ferramentas ou convenções específicas de outro repositório.
- Os agentes trabalham normalmente no repositório que os hospeda (código, testes, configuração); apenas os documentos de processo de cada task seguem a estrutura abaixo.

## Estrutura
```
factory-agents/
└── .agent/
    ├── README.md            ← este contrato
    ├── harness/
    │   ├── rules/           ← actionable-errors, domain-naming
    │   └── skills/          ← user-scenario, friction-log, product-architecture
    ├── agents/              ← tasker, writer-doc, dev, mr, qa
    └── tasks/
        └── <task-id>/       ← todos os artefatos de uma task
```

## Artefatos de uma task (`.agent/tasks/<task-id>/`)
| Artefato | Produzido por |
|---|---|
| `task-brief.md`, `cenarios.md`, `close-report.md` | tasker-agent |
| `glossary.md`, `prd.md`, `spike-<tema>.md`, `guia-conceitual.md`, `adr-<nnn>-<tema>.md`, `quickstart.md`, `troubleshooting.md` | writer-doc-agent |
| `catalogo-erros.md`, `mr-<id>.md` (descrição do MR) | dev-agent |
| `review-mr-<id>.md` | mr-agent |
| `relatorio-qa.md`, `friction-log.md` | qa-agent |

Quando um agente cita um artefato pelo nome, o caminho é sempre `.agent/tasks/<task-id>/<artefato>`.

## Fluxo
tasker-agent (abertura) → writer-doc-agent → dev-agent → mr-agent → qa-agent → writer-doc-agent (Quickstart/Troubleshooting) → tasker-agent (encerramento)
