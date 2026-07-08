# os-rules — controle global de ações no sistema operacional

Este arquivo se aplica a **qualquer agente**, em **qualquer momento** em que
um comando de terminal com impacto no sistema operacional for acionado —
independente de skill.

Cada chave abaixo liga (`true`) ou desliga (`false`) uma ação para a LLM:

- `true`  → a LLM pode executar a ação.
- `false` → a LLM **não** executa; só o desenvolvedor pode. A LLM entrega o
  comando pronto, sem rodá-lo.

Chave ausente é tratada como `false`. Comandos somente-leitura (listar
processos, consultar variáveis de ambiente, ver status de serviços, checar
portas em uso) são sempre permitidos e não aparecem aqui.

```yaml
kill_process: false
modify_path: false
set_env_user: false
set_env_system: false
edit_registry: false
service_start: false
service_stop: false
service_install: false
install_software: false
uninstall_software: false
scheduled_task: false
firewall_rules: false
edit_hosts_file: false
change_permissions: false
user_management: false
delete_system_files: false
shutdown_restart: false
```
