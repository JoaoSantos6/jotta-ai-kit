# Config

Parâmetros ajustáveis da skill `triage-servico`. Edite os valores aqui — não duplique
em outros arquivos. Cada valor é passado ao script como argumento (ver SKILL.md, passo 5).

## Limiares do veredito

- **ERRO_MAX_PCT = 1.0**

Taxa de erro (spans com erro / hits APM) acima deste percentual na janela atual é um sinal.

- **ERRO_INCIDENTE_PCT = 5.0**

Taxa de erro a partir da qual o veredito é `incidente` direto, sem precisar de outro sinal.

- **P99_FATOR = 2.0**

p99 atual maior que `P99_FATOR` × p99 baseline é um sinal. Baseline = mesma janela 1h antes
(se ausente, 24h antes).

- **QUEDA_THROUGHPUT_PCT = 30**

Queda de req/s maior que este percentual em relação a **ambos** os baselines disponíveis
(1h e 24h) é um sinal. Exigir os dois evita falso positivo por sazonalidade (ex.: madrugada).

- **MIN_REQUISICOES = 100**

Abaixo disso na janela atual, os percentuais são estatisticamente fracos: o script marca
"baixa confiança".

- **DEPLOY_RECENTE_MIN = 60**

Versão que mudou há até este número de minutos é marcada como "deploy recente".

## Regra do veredito

Aplicada pelo script (`avaliar()`), com "sinal" = erro, p99, throughput ou throughput zerado:

| Veredito      | Condição                                                                  |
|---------------|---------------------------------------------------------------------------|
| `incidente`   | erro ≥ ERRO_INCIDENTE_PCT, **ou** ≥ 2 sinais, **ou** throughput zerado, **ou** 1 sinal + monitor em Alert |
| `degradado`   | 1 sinal, **ou** algum monitor em Alert/Warn                                |
| `saudável`    | nenhum dos anteriores                                                      |
| `indeterminado` | sem dados de APM para service+env (tag ausente, serviço sem APM, sem tráfego ou falha) |

"Baixo volume" e "deploy recente" são contexto, não contam como sinal.

## Logs e eventos

- **LOG_FACETS = @error.kind,@error.message,@http.status_code**

Facets tentados em ordem para o top 5 de erros (agregação `count`). O primeiro que retornar
valores é usado. Ajuste ao padrão de logs da empresa.

- **EVENTOS_DEPLOY_QUERY = service:{service} env:{env} source:gitlab**

Query de `events search` para achar eventos de deploy do GitLab nas últimas 24h. `{service}` e
`{env}` são substituídos pelo script. Se o CI não envia eventos ao Datadog, a versão
continua sendo detectada pela tag `version` nas métricas APM.

## Script Python

- **NOME_SCRIPT = triage_runner.py**

Nome fixo do script. Sempre na raiz do repositório (diretório de trabalho atual).

- **EXCLUIR_APOS_EXECUCAO = true**

- `true`  → excluir `triage_runner.py` após ler o resultado.
- `false` → manter, **obrigatoriamente** listado no `.gitignore`.

## Timeout

- **TIMEOUT_SEGUNDOS = 30**

Limite por comando pup. Se estourar, **não** retente: a consulta entra em `falhas` e a triage
segue com as demais.
