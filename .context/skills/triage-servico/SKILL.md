---
name: triage-servico
description: >
  Diagnóstico rápido, somente-leitura, de UM microserviço no Datadog via pup CLI: taxa de erro,
  latência p50/p95/p99 e throughput atuais vs. 1h e 24h antes, top 5 padrões de erro em logs
  (por agregação), monitores em alert/warn, versão atual e há quanto tempo mudou, e um veredito
  (saudável / degradado / incidente) com hipótese e próximo passo. Use SEMPRE que alguém de
  on-call pedir para "triar um serviço", "ver se o serviço X está saudável", "o que está
  acontecendo com o X", "diagnóstico do X no Datadog", "o X está com erro/lento?", "checar o X
  em prod", ou variações durante um incidente. Não use para criar, alterar, silenciar ou deletar
  monitores, dashboards ou downtimes, nem para investigação longa (> 24h) sem pedido explícito.
---

# Triage de Serviço

Skill para o on-call obter, em até ~20 linhas, o estado de saúde de um microserviço no
Datadog — usando o `pup` CLI em modo somente-leitura e um script Python local de nome fixo
que executa as consultas e devolve um JSON resumido. A LLM só interpreta esse JSON.

## Quando usar

- Incidente ou alerta em andamento e alguém precisa de uma foto rápida de um serviço.
- Confirmar se um serviço está saudável depois de um deploy (pipeline do GitLab).
- Decidir se um sintoma merece escalar (incidente) ou só acompanhar (degradado).

## Regras obrigatórias

- **Somente leitura.** Todo comando pup roda com `--read-only`. A skill nunca cria, altera,
  silencia nem deleta nada — nem se o usuário pedir no meio da triage (entregue o comando pronto).
- **Sempre agregar.** Volume médio ~600 req/s por serviço: nunca listar logs/traces brutos para
  contar. Se precisar de uma amostra, `--limit` ≤ 20 e filtro `service` + `env` + `status`.
- **Janela curta.** Padrão `15m`. Nunca consultar mais que 24h sem pedido explícito.
- **Sem JSON cru no contexto.** A saída do pup é parseada pelo script; a LLM lê só o resumo.
- **Falha parcial não para a triage.** Consulta que falhar (rate limit, permissão, tag
  inexistente) é reportada pelo nome e as demais seguem.
- **Tags ausentes são ditas explicitamente** (`service`, `env`, `version`).

## Fluxo de execução

Siga os passos em ordem. Não pule etapas.

### 1. Ler a configuração

Leia `references/config.md` **antes de qualquer ação**. Dele vêm os limiares do veredito,
o nome do script, a política de exclusão, o timeout e os parâmetros de logs/eventos.

### 2. Identificar os parâmetros

- **service** (obrigatório) — valor exato da tag `service`.
- **env** (opcional) — padrão `prod`.
- **janela** (opcional) — padrão `15m`. Formatos aceitos: `Nm` ou `Nh`. Acima de `24h` só
  com pedido explícito do usuário.
- **operação APM** (opcional) — span name (ex.: `http.request`, `grpc.server`). Se omitida,
  o script descobre a operação primária.

**Regra obrigatória:** se o nome do serviço não estiver claro, **pergunte**. Não chute.

### 3. Verificar pré-requisitos

```bash
pup --version && pup auth status
python --version 2>/dev/null || python3 --version 2>/dev/null
```

- `pup` ausente → pare e informe como instalar (ver `references/consultas-pup.md`). Instalar
  software depende de `.context/rules/os-rules.md` (`install_software`); se `false`, entregue
  o comando ao desenvolvedor.
- Não autenticado → peça `pup auth login` (ou `DD_API_KEY`/`DD_APP_KEY`/`DD_SITE`). Não retente.

Se houver dúvida sobre alguma flag na versão instalada, confirme com
`pup agent schema --compact` ou `pup <grupo> --help` antes de rodar.

### 4. Gerar o script

Escreva o arquivo **NOME_SCRIPT** (config) na raiz do repositório com o conteúdo de
`references/script-python.md`. Se já existir, sobrescreva — é sempre descartável.
O que cada consulta faz e por quê está em `references/consultas-pup.md`.

### 5. Executar

```bash
python triage_runner.py --service <service> --env <env> --window <janela> \
  --erro-max <ERRO_MAX_PCT> --erro-incidente <ERRO_INCIDENTE_PCT> \
  --p99-fator <P99_FATOR> --queda-rps <QUEDA_THROUGHPUT_PCT> \
  --min-req <MIN_REQUISICOES> --deploy-recente <DEPLOY_RECENTE_MIN> \
  --log-facets "<LOG_FACETS>" --eventos-query "<EVENTOS_DEPLOY_QUERY>" \
  --timeout <TIMEOUT_SEGUNDOS>
```

Valores entre `<>` vêm de `references/config.md`. O stdout é **um** JSON compacto; exit code
`0` = triage feita (mesmo com falhas parciais), `1` = parâmetro inválido.

### 6. Limpeza (obrigatória)

Conforme **EXCLUIR_APOS_EXECUCAO**:

- `true`  → `rm -f triage_runner.py` depois de ler o stdout.
- `false` → mantenha, garantindo `triage_runner.py` no `.gitignore`.

Nunca, em nenhuma hipótese, o script deve ser commitado.

### 7. Interpretar e reportar

O script já calcula `sinais` e `veredito_sugerido` com os limiares da config. A LLM:

1. Mantém o veredito sugerido, salvo evidência clara no JSON (explique se mudar).
   `indeterminado` = sem dados de APM; diga o porquê e o que falta.
2. Escreve **uma** hipótese mais provável, cruzando os sinais:
   - erro/latência subiu + `versao.mudou_ha_min` ≤ DEPLOY_RECENTE_MIN → regressão do deploy.
   - 5xx alto + top erros de conexão/timeout/circuit breaker sem deploy → dependência a jusante.
   - throughput caiu sem aumento de erro → problema a montante (LB, roteamento, cliente, fila).
   - só p99 subiu → saturação (CPU, pool, GC) ou dependência lenta.
   - números semelhantes a 24h antes → padrão sazonal, não regressão.
3. Sugere **um** próximo passo acionável (ex.: rollback no GitLab, abrir incidente, drill-down
   com `pup traces search ... --limit 20`), sem executá-lo se for escrita.

Formato de saída (≤ 20 linhas; exemplos completos em `references/examples.md`):

```
<service> (<env>) — janela <janela> — <VEREDITO>
Erro:        <atual>% | 1h antes <x>% | 24h antes <y>%   (5xx <z>%)
Latência:    p50 <a>ms | p95 <b>ms | p99 <c>ms  (baseline p99 <d>ms, <n>x)
Throughput:  <rps> req/s | <±x>% vs 1h | <±y>% vs 24h
Top erros (<facet>, <total> logs de erro):
  1. <padrão> — <count>
  ...
Monitores:   <n> alert, <n> warn (<nomes curtos>)
Versão:      <atual> (desde há <n> min; anterior <v>) | <deploy GitLab, se houver>
Tags:        <ok | o que falta>
Falhas:      <consultas que falharam e motivo | nenhuma>
Hipótese:    <uma frase>
Próximo passo: <uma ação>
```

## Estrutura desta skill

```
triage-servico/
├── SKILL.md                (este arquivo)
└── references/
    ├── config.md           (limiares editáveis, nome do script, timeout, logs/eventos)
    ├── consultas-pup.md    (comandos pup validados, métricas usadas, instalação/auth)
    ├── script-python.md    (template do script triage_runner.py)
    └── examples.md         (casos: serviço saudável e pico de 5xx)
```

Carregue os arquivos de `references/` sob demanda, conforme apontado no fluxo acima.
