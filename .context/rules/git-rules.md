# git-rules — controle global de ações git

Este arquivo se aplica a **qualquer agente**, em **qualquer momento** em que
uma ação git for acionada — independente de skill.

Cada chave abaixo liga (`true`) ou desliga (`false`) uma ação para a LLM:

- `true`  → a LLM pode executar a ação.
- `false` → a LLM **não** executa; só o desenvolvedor pode. A LLM entrega o
  comando pronto, sem rodá-lo.

Chave ausente é tratada como `false`. Comandos somente-leitura (status, log,
diff, show) são sempre permitidos e não aparecem aqui.

```yaml
commit: true
push: true
fetch: true
pull: true
merge: true
cherry_pick: true
rebase: true
branch: true
stash: true
tag: true
reset: true
revert: true
force_push: true
delete_branch: true
```
