#!/usr/bin/env sh
# Template genérico de etapas Pact para qualquer CI. PROPOSTA: adapte antes de usar.
# Uso: ci/pact.sh <etapa> [ambiente]
#   etapas: test-consumer | publish | verify-provider | can-i-deploy | record-deployment
#
# Variáveis esperadas (definidas pela CI, nunca neste arquivo):
#   PACT_BROKER_BASE_URL  {{PACT_BROKER_URL}} — pendente: ainda não existe broker
#   PACT_BROKER_TOKEN     segredo da CI
#   GIT_SHA, GIT_BRANCH   versão e branch (mapeie das variáveis nativas da CI)
#   PACTICIPANTS          lista separada por espaço, ex.: "<servico>-http <servico>-kinesis"
set -eu

ETAPA="${1:?informe a etapa}"
AMBIENTE="${2:-}"

# Preencha com os comandos reais do repositório (detectados pelo agente):
CMD_TESTE_CONTRATO="{{COMANDO_TESTES_DE_CONTRATO}}"  # ex.: go test ./... -run Pact | pytest tests/contract | vendor/bin/phpunit --testsuite contract
CMD_VERIFICA_PROVEDOR="{{COMANDO_VERIFICACAO_PROVEDOR}}"

sem_broker() {
  [ -z "${PACT_BROKER_BASE_URL:-}" ]
}

case "$ETAPA" in
  test-consumer)
    sh -c "$CMD_TESTE_CONTRATO"
    ;;
  publish)
    if sem_broker; then
      echo "Sem broker: guarde ./pacts como artifact do pipeline."; exit 0
    fi
    pact-broker publish ./pacts --consumer-app-version "$GIT_SHA" --branch "$GIT_BRANCH"
    ;;
  verify-provider)
    # Com broker: a biblioteca lê PACT_BROKER_BASE_URL/TOKEN e publica o resultado.
    # Sem broker: a biblioteca lê os arquivos/URLs de artifact configurados no teste.
    sh -c "$CMD_VERIFICA_PROVEDOR"
    ;;
  can-i-deploy)
    : "${AMBIENTE:?informe o ambiente}"
    if sem_broker; then
      echo "Sem broker: can-i-deploy indisponível. Confirme manualmente a verificação do provedor."; exit 1
    fi
    for p in $PACTICIPANTS; do
      pact-broker can-i-deploy --pacticipant "$p" --version "$GIT_SHA" \
        --to-environment "$AMBIENTE" --retry-while-unknown 6 --retry-interval 10
    done
    ;;
  record-deployment)
    : "${AMBIENTE:?informe o ambiente}"
    if sem_broker; then exit 0; fi
    for p in $PACTICIPANTS; do
      pact-broker record-deployment --pacticipant "$p" --version "$GIT_SHA" --environment "$AMBIENTE"
    done
    ;;
  *)
    echo "etapa desconhecida: $ETAPA" >&2; exit 2
    ;;
esac
