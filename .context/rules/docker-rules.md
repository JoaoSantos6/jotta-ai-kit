# docker-rule — controle global de ações docker

Este arquivo se aplica a **qualquer agente**, em **qualquer momento** em que
uma ação docker for acionada — independente de skill.

Cada chave abaixo liga (`true`) ou desliga (`false`) uma ação para a LLM:

- `true`  → a LLM pode executar a ação.
- `false` → a LLM **não** executa; só o desenvolvedor pode. A LLM entrega o
  comando pronto, sem rodá-lo.

Chave ausente é tratada como `false`. Comandos somente-leitura (ps, logs,
inspect, images, version, stats) são sempre permitidos e não aparecem aqui.

```yaml
build: true
run: true
start: true
stop: true
restart: true
exec: true
pull: true
push: true
tag: true
rm: true
rmi: true
prune: true
volume_create: true
volume_rm: true
network_create: true
network_rm: true
compose_up: true
compose_down: true
compose_build: true
```
