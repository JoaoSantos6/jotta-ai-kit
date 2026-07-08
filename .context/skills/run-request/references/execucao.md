# Execução — política de método, erros e limpeza

Regras detalhadas de execução da skill `run-request`.

## Política por método HTTP

- **GET** → executa automaticamente, sem perguntar.
- **POST, PUT, PATCH, DELETE, HEAD, OPTIONS, qualquer outro** → **exige permissão explícita**
  do desenvolvedor antes de rodar.

Para métodos não-GET, mostre o que o script vai fazer (URL, método, headers mascarados,
body) e pergunte algo como:

> Vou executar essa requisição `<METODO>` em `<URL>`. Posso seguir?

Aguarde confirmação. Se o método for destrutivo (DELETE, ou POST que cria/altera recurso),
reforce o aviso de efeito colateral.

Varreduras locais (BDD, testes de integração) são somente-leitura → executam
automaticamente, sem perguntar.

## Interpretação de um curl recebido

Quando o desenvolvedor colar um `curl`, extraia:

| Flag do curl        | Vai para                          |
|---------------------|-----------------------------------|
| URL posicional      | `url`                             |
| `-X` / `--request`  | `method`                          |
| `-H` / `--header`   | dicionário `headers`              |
| `-d` / `--data*`    | `data` (bytes)                    |
| `-u` / `--user`     | header `Authorization` (Basic)    |

Flags de exibição (`-s`, `-v`, `-o`, `-w`) são ignoradas — o script controla a saída.

## Segredos em headers

Se algum header contém token/segredo (`Authorization: Bearer ...`, cookies, api-keys), ao
**exibir** para o desenvolvedor mascare como `Bearer ***`. No script real, use o valor cheio —
mas lembre que se `EXCLUIR_APOS_EXECUCAO = false` o arquivo fica em disco: prefira avisar o
desenvolvedor quando o script contiver segredos e a exclusão estiver desligada.

## Tratamento de erro / timeout

- Timeout (config: TIMEOUT_SEGUNDOS) → **não** retente. Reporte que a requisição excedeu
  o limite.
- Status HTTP 4xx/5xx **não** é erro de execução — o script roda OK e o status entra no
  relatório normal.
- Erro de rede/DNS → reporte a mensagem e pare. Não retente automaticamente.
- Script com erro de sintaxe/import → corrija o script e rode novamente (até 2 tentativas);
  depois disso, reporte ao desenvolvedor.

## Limpeza pós-execução

Comportamento controlado por `EXCLUIR_APOS_EXECUCAO` em `config.md`:

**Se `true` (excluir):**

```bash
rm -f llm_runner.py
```

Execute a exclusão **somente depois** de ter lido e usado o stdout do script.

**Se `false` (manter):**

O script permanece, mas deve estar no `.gitignore`:

```bash
grep -q "llm_runner.py" .gitignore 2>/dev/null || echo "llm_runner.py" >> .gitignore
```

Se não houver `.gitignore`, crie-o com essa linha. Nunca commite o script.
