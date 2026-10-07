# Exemplos

Dois casos com o JSON do `triage_runner.py` (resumido) e o diagnóstico final esperado.
Os números são ilustrativos, mas a estrutura é exatamente a que o script produz.

## Caso 1 — serviço saudável

Pedido: "triagem do pagamentos-api em prod"

```bash
python triage_runner.py --service pagamentos-api --env prod --window 15m ...
```

JSON (trecho):

```json
{"operacao":"http.request",
 "janelas":{"atual":{"hits":549000,"rps":610.0,"erro_pct":0.2,"5xx_pct":0.05,"p50":42.0,"p95":180.0,"p99":350.0},
            "1h_antes":{"rps":610.0,"erro_pct":0.2,"p99":350.0},
            "24h_antes":{"rps":610.0,"erro_pct":0.2,"p99":350.0}},
 "variacao_rps_pct":{"vs_1h":0.0,"vs_24h":0.0},
 "logs":{"facet":"@error.kind","total_erros":180,"top":[{"padrao":"TimeoutException","count":120},{"padrao":"ValidationError","count":60}]},
 "monitores":{"alert":[],"warn":[],"no_data":0,"total":2},
 "versao":{"atual":"2.14.0","anterior":null,"mudou_ha_min":null,"obs":"versão atual está no ar há mais de 24h"},
 "deploys":null,
 "sinais":[],"veredito_sugerido":"saudável",
 "falhas":[{"consulta":"eventos de deploy","erro":"permissão negada: Error: 403 Forbidden: missing events_read scope"}]}
```

Diagnóstico:

```
pagamentos-api (prod) — janela 15m — SAUDÁVEL
Erro:        0.2% | 1h antes 0.2% | 24h antes 0.2%   (5xx 0.05%)
Latência:    p50 42ms | p95 180ms | p99 350ms  (baseline p99 350ms, 1.0x)
Throughput:  610 req/s | 0% vs 1h | 0% vs 24h
Top erros (@error.kind, 180 logs de erro):
  1. TimeoutException — 120
  2. ValidationError — 60
Monitores:   0 alert, 0 warn (2 monitores do serviço)
Versão:      2.14.0 (no ar há mais de 24h)
Tags:        service/env/version ok
Falhas:      eventos de deploy — 403 (sem escopo events_read)
Hipótese:    nenhum desvio; erros residuais dentro do normal.
Próximo passo: nada a fazer neste serviço; seguir investigando o alerta em outro ponto da cadeia.
```

## Caso 2 — pico de 5xx após deploy

Pedido: "o pagamentos-api tá dando 500, o que houve?"

JSON (trecho):

```json
{"operacao":"http.request",
 "janelas":{"atual":{"hits":531000,"rps":590.0,"erro_pct":8.7,"5xx_pct":8.1,"p50":51.0,"p95":410.0,"p99":1900.0},
            "1h_antes":{"rps":610.0,"erro_pct":0.2,"5xx_pct":0.05,"p99":350.0},
            "24h_antes":{"rps":610.0,"erro_pct":0.2,"5xx_pct":0.05,"p99":350.0}},
 "variacao_rps_pct":{"vs_1h":-3.3,"vs_24h":-3.3},
 "logs":{"facet":"@error.kind","total_erros":48210,"top":[
   {"padrao":"UpstreamConnectError","count":31200},{"padrao":"PoolTimeoutException","count":11050},
   {"padrao":"CircuitBreakerOpen","count":4100},{"padrao":"TimeoutException","count":1320},
   {"padrao":"ValidationError","count":540}]},
 "monitores":{"alert":[{"id":101,"nome":"[pagamentos-api] error rate"}],"warn":[{"id":102,"nome":"[pagamentos-api] p99 latency"}],"no_data":0,"total":2},
 "versao":{"atual":"2.15.0","anterior":"2.14.0","mudou_ha_min":23,"obs":null},
 "deploys":[{"titulo":"Deploy pagamentos-api 2.15.0 (GitLab pipeline #88412)","quando":"2026-09-28T13:37:00Z"}],
 "sinais":["erro 8.7% > 1.0%","p99 1900.0ms > 2.0x baseline (350.0ms)","deploy recente: 2.14.0 -> 2.15.0 há 23min"],
 "veredito_sugerido":"incidente","falhas":[]}
```

Diagnóstico:

```
pagamentos-api (prod) — janela 15m — INCIDENTE
Erro:        8.7% | 1h antes 0.2% | 24h antes 0.2%   (5xx 8.1%)
Latência:    p50 51ms | p95 410ms | p99 1900ms  (baseline p99 350ms, 5.4x)
Throughput:  590 req/s | -3.3% vs 1h | -3.3% vs 24h
Top erros (@error.kind, 48210 logs de erro):
  1. UpstreamConnectError — 31200
  2. PoolTimeoutException — 11050
  3. CircuitBreakerOpen — 4100
  4. TimeoutException — 1320
  5. ValidationError — 540
Monitores:   1 alert, 1 warn ([pagamentos-api] error rate; p99 latency)
Versão:      2.15.0 (há 23 min; anterior 2.14.0) | GitLab pipeline #88412
Tags:        service/env/version ok
Falhas:      nenhuma
Hipótese:    regressão do deploy 2.15.0: falhas de conexão/pool com dependência a jusante
             começaram junto com a troca de versão, sem mudança de tráfego.
Próximo passo: rollback para 2.14.0 pelo pipeline do GitLab e abrir incidente; se não houver
             rollback, olhar config de pool/host da dependência alterada no diff do release.
```

## Variações a reportar explicitamente

- `tags.obs` com "sem tráfego com env:prod; envs vistos: production" → a tag `env` difere
  do padrão: diga isso e sugira rodar de novo com `--env production`.
- `versao.sem_dados: true` → nenhum tráfego APM em 24h com service+env: verifique as tags.
- `versao.sem_tag_version: true` → "Serviço sem tag `version`: não é possível correlacionar
  com deploy."
- `veredito_sugerido: indeterminado` → não invente veredito; diga qual dado faltou (tag,
  APM ausente ou consulta que falhou em `falhas`).
