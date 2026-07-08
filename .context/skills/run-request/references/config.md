# Config

Parâmetros ajustáveis da skill `run-request`. Edite os valores aqui — não duplique
em outros arquivos.

## Script Python

- **NOME_SCRIPT = llm_runner.py**

Nome fixo do script de execução. Sempre na raiz do repositório (diretório de trabalho atual).
O nome é fixo para que o script possa ser encontrado consistentemente em qualquer repositório
onde a skill for usada.

## Exclusão após execução

- **EXCLUIR_APOS_EXECUCAO = true**

Comportamento após a LLM concluir a ação:

- `true`  → o script `llm_runner.py` deve ser **excluído** ao final da execução.
- `false` → o script permanece no repositório, mas **obrigatoriamente** dentro do
  `.gitignore` para nunca subir ao git.

## Timeout

- **TIMEOUT_SEGUNDOS = 10**

Limite máximo, em segundos, para cada requisição HTTP feita pelo script. Se estourar,
**não** retente — reporte o timeout ao desenvolvedor.
