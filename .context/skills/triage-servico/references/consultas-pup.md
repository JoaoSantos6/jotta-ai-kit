# Consultas pup

Comandos usados pelo script e o motivo de cada um. Flags conferidas no código-fonte do pup
(`datadog-labs/pup`, v1.23.4, `src/main.rs`) e em `docs/LLM_GUIDE.md`. Se a versão instalada
for diferente, confirme com `pup agent schema --compact` ou `pup <grupo> --help`.

## Instalação e autenticação

```bash
# instalação (Homebrew)
brew tap datadog-labs/pack && brew install datadog-labs/pack/pup

# autenticação: OAuth2 (preferido) ou API keys
export DD_SITE="datadoghq.com"
pup auth login          # ou: DD_API_KEY + DD_APP_KEY
pup auth status
```

## Flags globais usadas em todo comando

| Flag              | Por quê                                                                  |
|-------------------|--------------------------------------------------------------------------|
| `--read-only`     | Bloqueia qualquer operação de escrita no próprio pup (garantia extra).    |
| `--no-agent`      | Desliga o modo agente: payload cru, sem envelope `{status,data,metadata}`. Mesma saída rodando pela LLM ou pelo on-call no terminal. |
| `--output json`   | Saída parseável (já é o padrão, fica explícito).                          |

Tempo: `--from`/`--to` aceitam unix timestamp em segundos (≤ 10 dígitos), relativo (`15m`,
`1h`, sempre "atrás de agora") ou RFC3339. O script usa timestamps absolutos para montar as
janelas de baseline com precisão.

## Comandos

| # | Comando | Dá o quê |
|---|---------|----------|
| 1 | `pup apm services operations --service S --env E --from T-1h --to T --primary-only` | Span name primário do serviço (ex.: `http.request`). Sem resultado = service/env sem APM. |
| 2 | `pup metrics query --query "<6 queries separadas por vírgula>" --from --to` | Hits, erros, hits 5xx, p50, p95, p99 numa só chamada. Roda 3x: janela atual, 1h antes, 24h antes. |
| 3 | `pup metrics query --query "sum:trace.OP.hits{service:S} by {env}.as_count()"` | Só se não houver tráfego com o `env` pedido: lista os envs existentes (diagnóstico de tag). |
| 4 | `pup metrics query --query "sum:trace.OP.hits{service:S,env:E} by {version}.as_count()" --from T-24h` | Versão atual, anterior e quando a atual apareceu. Sem tag → `sem_tag_version`. |
| 5 | `pup logs aggregate --query "service:S env:E status:error" --compute count` | Total de logs de erro na janela. |
| 6 | `pup logs aggregate ... --group-by <facet> --limit 5 --sort count` | Top 5 padrões de erro. Tenta os facets de `LOG_FACETS` em ordem. |
| 7 | `pup monitors list --tags service:S --limit 100` | Monitores do serviço; o script filtra `overall_state` Alert/Warn/No Data e descarta os com `env:` diferente. |
| 8 | `pup events search --query "<EVENTOS_DEPLOY_QUERY>" --from T-24h --limit 5` | Eventos de deploy do GitLab (se o CI os envia). Opcional. |

Total: 9 a 11 chamadas por triage — seguro para rate limit mesmo em incidente.

## Métricas APM (trace metrics)

Com `OP` = span name e escopo `{service:S,env:E}`:

| Query | Uso |
|-------|-----|
| `sum:trace.OP.hits{...}.as_count()` | Requisições na janela → req/s = soma / segundos. |
| `sum:trace.OP.errors{...}.as_count()` | Erros → taxa = erros / hits. |
| `sum:trace.OP.hits.by_http_status{...,http.status_class:5xx}.as_count()` | Parcela 5xx. |
| `p50:` / `p95:` / `p99:trace.OP{...}` | Percentis (métrica distribution, em **segundos**; o script converte para ms). |

Os percentis na janela são a média dos pontos retornados — aproximação suficiente para
comparar atual vs. baseline. APM em traces brutos usa **nanossegundos** (`@duration`), não
confundir.

## Drill-down permitido (manual, se o on-call pedir)

Sempre com filtro completo e `--limit` ≤ 20:

```bash
pup --read-only logs search --query="service:S env:E status:error @error.kind:X" --from=15m --limit=20
pup --read-only traces search --query="service:S env:E status:error" --from=15m --limit=20
```

## Proibido nesta skill

- Qualquer `create`, `update`, `delete`, `post`, `submit`, `mute`, downtime — o `--read-only`
  já bloqueia, mas não tente.
- `logs search`/`logs list`/`traces search` sem filtro `service`+`env`+`status` ou com
  `--limit` > 20.
- `--from` além de 24h sem pedido explícito.
- `monitors list` sem `--tags` (organizações grandes têm milhares de monitores).
