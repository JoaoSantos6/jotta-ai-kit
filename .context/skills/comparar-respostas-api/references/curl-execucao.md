# Execução do curl

Regras para montar e executar os comandos `curl` desta skill.

## Política por método HTTP

- **GET** → executa automaticamente, sem perguntar.
- **POST, PUT, PATCH, DELETE, HEAD, OPTIONS, qualquer outro** → **exige permissão explícita** do
  desenvolvedor antes de rodar.

Para métodos não-GET, mostre os dois comandos curl que você pretende rodar (mascarando
tokens/segredos se houver) e pergunte algo como:

> Vou executar essas duas requisições `<METODO>`. Posso seguir?

Aguarde confirmação. Não execute em paralelo "preventivamente". Se um desses métodos for
destrutivo (DELETE, ou POST que cria/altera recurso), reforce o aviso de efeito colateral.

## Montagem do comando

Template base:

```bash
curl -s -S \
  -o <arquivo_resposta> \
  -w "%{http_code}" \
  --max-time <TIMEOUT_SEGUNDOS> \
  -X <METODO> \
  -H "<Header-1>: <valor>" \
  -H "<Header-N>: <valor>" \
  -d '<body_se_houver>' \
  "<URL>"
```

Flags importantes:

- `-s` silencia barra de progresso.
- `-S` mantém erros visíveis mesmo com `-s`.
- `-o <arquivo>` grava body em arquivo (não polui o stdout junto do status).
- `-w "%{http_code}"` imprime só o status code no stdout — capture isso para a comparação.
- `--max-time <TIMEOUT_SEGUNDOS>` vem do `references/config.md`. **Nunca** omita.
- `-X <METODO>` explícito, mesmo para GET (clareza).

## Arquivos temporários

Use caminhos previsíveis e distintos para as duas respostas:

- Linux/macOS / bash no Windows: `/tmp/cmp_a.body` e `/tmp/cmp_b.body`
- Se `/tmp` não existir, use o diretório de trabalho com nomes únicos.

Após a comparação, é OK deixar os arquivos para inspeção posterior.

## Tratamento de erro / timeout

- `curl` retornando código != 0 (ex: `28` para timeout) → reporte qual requisição falhou e por quê.
  Não retente.
- Status HTTP 5xx **não** é erro de execução — o curl roda OK, o status entra na comparação normal.

## Segredos em headers

Se algum header contém token/segredo (`Authorization: Bearer ...`, cookies, etc.), ao **exibir**
o comando para o desenvolvedor (no caso de pedir permissão), mascare como `Bearer ***`. Na
execução real, use o valor cheio.
