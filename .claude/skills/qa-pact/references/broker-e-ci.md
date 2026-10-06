# Broker e CI

## Estado atual

**Não existe Pact Broker hoje.** Tudo que depende dele usa variáveis de ambiente e entra
em "Pendências":

| Variável | Uso | Valor |
|----------|-----|-------|
| `PACT_BROKER_BASE_URL` | URL do broker | `{{PACT_BROKER_URL}}` (pendente) |
| `PACT_BROKER_TOKEN` | Token de leitura/escrita | segredo do CI. **Nunca em arquivo** |
| `GIT_SHA` / `GIT_BRANCH` | Versão e branch do pacticipant | variáveis nativas da CI detectada |

O CLI `pact-broker` lê `PACT_BROKER_BASE_URL` e `PACT_BROKER_TOKEN` do ambiente. Não passe
o token na linha de comando.

## Fluxo completo (com broker)

```
Consumidor (pipeline)                         Provedor (pipeline)
1. testes de contrato → pacts/*.json          1. verifica pacts do broker
2. pact-broker publish                         (mainBranch + deployedOrReleased + matchingBranch)
3. can-i-deploy --to-environment <amb>        2. publica resultado da verificação
4. deploy                                     3. can-i-deploy --to-environment <amb>
5. record-deployment --environment <amb>      4. deploy
                                              5. record-deployment --environment <amb>

Webhook do broker: contract_requiring_verification_published
  → dispara o job de verificação do provedor com a versão do pact alterado
```

Comandos (CLI standalone ou imagem `pactfoundation/pact-cli`; confira o entrypoint da
versão usada):

```sh
# consumidor: publicar
pact-broker publish ./pacts \
  --consumer-app-version "$GIT_SHA" --branch "$GIT_BRANCH"

# qualquer pacticipant: antes do deploy
pact-broker can-i-deploy \
  --pacticipant "<servico>-http" --version "$GIT_SHA" \
  --to-environment "<ambiente>" --retry-while-unknown 6 --retry-interval 10

# depois do deploy bem-sucedido
pact-broker record-deployment \
  --pacticipant "<servico>-http" --version "$GIT_SHA" --environment "<ambiente>"
```

A verificação do provedor é feita pela biblioteca Pact da linguagem (ver `pact-http.md`),
com `publishVerificationResults` ligado só no CI.

Um serviço com HTTP e Kinesis roda `can-i-deploy` e `record-deployment` para **os dois**
pacticipants (`-http` e `-kinesis`).

Nomes de ambiente (`<ambiente>`): use os nomes já usados na CI do repositório. Não invente.
Se não existirem, deixe `{{AMBIENTE}}` e liste como pendência.

## Integração com a CI do repositório

1. Detecte a CI: `.gitlab-ci.yml`, `.github/workflows/*.yml`, `Jenkinsfile`,
   `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `buildspec*.yml`.
2. **Se existir**:
   - adicione um job de contrato no stage de teste existente;
   - adicione `publish` depois do teste (só em pipelines de branch, não em MR de fork);
   - adicione `can-i-deploy` como passo bloqueante **imediatamente antes** de cada job de deploy;
   - adicione `record-deployment` **imediatamente depois** de cada deploy bem-sucedido;
   - reutilize templates, `include`s, imagens e convenções já usados;
   - não altere jobs de deploy de HML ou PRD além de inserir esses passos. Mostre o diff ao dev.
3. **Se não existir**: gere `templates/ci-pact-generico.sh` adaptado ao serviço, em
   `ci/pact.sh` (ou outro caminho combinado com o dev), e explique como plugá-lo em cada
   etapa. Marque como **proposta**.

## Modo sem broker (até o broker existir)

Funciona, mas sem `can-i-deploy` e sem webhook:

1. Consumidor: gera `pacts/*.json` no CI e guarda como **artifact** do pipeline.
2. Provedor: o job de verificação lê os pacts por arquivo ou URL de artifact
   (`PACT_URLS` / `pactFiles` / `--pact-urls` / `pactUrls`, conforme a biblioteca).
3. Bloqueio de deploy: manual. A verificação do provedor precisa estar verde na versão de
   cada consumidor em produção. Registre isso como risco no Relatório de QA.
4. Alternativa local para o dev: verificar o provedor apontando para o `pacts/` gerado no
   repositório do consumidor (caminho relativo, sem credencial).

Subir um broker (self-hosted `pactfoundation/pact-broker` com Postgres, ou PactFlow) é
decisão de infraestrutura. Proponha, não execute.

## Pendências padrão a reportar

- `{{PACT_BROKER_URL}}` e o segredo `PACT_BROKER_TOKEN` na CI.
- Webhook `contract_requiring_verification_published` → job de verificação do provedor.
- Nomes de ambiente para `can-i-deploy` e `record-deployment`.
- Handlers de provider state que o provedor ainda não implementa.
