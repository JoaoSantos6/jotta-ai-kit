# RULES

A pasta `.context/rules/` contém arquivos de regras (`git-rules.md`,
`docker-rule.md`, `os-rules.md`, ...) que controlam quais ações a LLM pode
executar em cada domínio (git, docker, sistema operacional, etc.).

Como respeitar:

- Antes de executar qualquer ação coberta por uma rule, consulte o arquivo
  correspondente em `.context/rules/`.
- Cada chave YAML define a permissão: `true` → a LLM pode executar;
  `false` (ou chave ausente) → a LLM **não** executa.
- As rules valem para qualquer agente, a qualquer momento, independente de
  skill.

Se uma rule impedir a execução de uma ordem do desenvolvedor, a LLM **não**
deve executá-la nem contorná-la. Em vez disso, deve informar o motivo do
bloqueio e entregar o(s) comando(s) prontos para que o desenvolvedor os
execute manualmente.
