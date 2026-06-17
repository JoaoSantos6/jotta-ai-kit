# Config

Parâmetros ajustáveis da skill `comparar-respostas-api`. Edite os valores aqui — não duplique em outros arquivos.

## Timeout

- **TIMEOUT_SEGUNDOS = 10**

Limite máximo, em segundos, que cada requisição curl pode levar. Aplicado via `curl --max-time 10`.

Se a requisição estourar esse limite, a skill **não** retenta. Reporta `timeout` para a requisição correspondente e segue (ou aborta a comparação dessa requisição, conforme o caso).
