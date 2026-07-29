# Casos de exemplo (saved examples do Postman)

> Leia este arquivo APENAS se o desenvolvedor optou por criar casos de exemplo.
> A skill deve sempre **perguntar** antes: "Quer que eu gere exemplos de sucesso e
> falha para cada request?" — nunca gere por conta própria (dobra o tamanho do
> arquivo).

## O que gerar

Para **cada request** da collection, no mínimo dois exemplos salvos:

1. **Sucesso** — o caminho feliz do endpoint (2xx), com body de resposta realista.
2. **Falha** — o erro mais representativo do endpoint, extraído do código
   (validação 400, não encontrado 404, sem autorização 401/403, regra de negócio
   422...). Se o código tratar mais de um erro relevante, pode haver mais de um
   exemplo de falha.

Os exemplos devem sair do **código real** (DTOs, serializers, handlers de erro,
exceções lançadas): status, formato do body de erro e campos da resposta precisam
bater com o que o serviço de fato retorna. Não invente formato de erro genérico.

## Onde os exemplos entram no JSON

No padrão do Postman, exemplos salvos são objetos dentro do array `response` do
próprio request. Cada exemplo carrega o `originalRequest` (o request que o gerou)
e a resposta:

```json
"response": [
  {
    "name": "200 - Usuário encontrado",
    "originalRequest": {
      "method": "GET",
      "header": [
        { "key": "Authorization", "value": "Bearer {{token_local}}" }
      ],
      "url": {
        "raw": "{{base_url_local}}/users/:id",
        "host": ["{{base_url_local}}"],
        "path": ["users", ":id"],
        "variable": [{ "key": "id", "value": "123" }]
      }
    },
    "status": "OK",
    "code": 200,
    "_postman_previewlanguage": "json",
    "header": [
      { "key": "Content-Type", "value": "application/json" }
    ],
    "cookie": [],
    "body": "{\n  \"id\": 123,\n  \"name\": \"Maria Silva\",\n  \"email\": \"maria@exemplo.com\"\n}"
  },
  {
    "name": "404 - Usuário não encontrado",
    "originalRequest": {
      "method": "GET",
      "header": [
        { "key": "Authorization", "value": "Bearer {{token_local}}" }
      ],
      "url": {
        "raw": "{{base_url_local}}/users/:id",
        "host": ["{{base_url_local}}"],
        "path": ["users", ":id"],
        "variable": [{ "key": "id", "value": "999999" }]
      }
    },
    "status": "Not Found",
    "code": 404,
    "_postman_previewlanguage": "json",
    "header": [
      { "key": "Content-Type", "value": "application/json" }
    ],
    "cookie": [],
    "body": "{\n  \"error\": \"USER_NOT_FOUND\",\n  \"message\": \"Usuário 999999 não encontrado\"\n}"
  }
]
```

## Regras

1. **Nome do exemplo** = `<código HTTP> - <o que aconteceu>`. Ex.:
   `200 - Usuário encontrado`, `400 - Email inválido`, `401 - Token ausente`.
2. **`originalRequest` coerente com a falha**: o request do exemplo de erro deve
   mostrar *o que causa* o erro (id inexistente, body sem campo obrigatório,
   header de auth ausente). Exemplo de 401 não leva header `Authorization`.
3. **Variáveis também nos exemplos**: `originalRequest` usa as mesmas variáveis
   `{{...}}` do ambiente da pasta (ver `variables.md`). Nada hardcoded.
4. **`body` é string JSON escapada** (formato do Postman), com dados realistas mas
   fictícios — nunca dados reais de usuário/produção.
5. **Não replique exemplos nos três ambientes se ficar pesado**: por padrão, gere
   exemplos completos na pasta `local` e replique em `hml`/`prd` apenas se o
   desenvolvedor pedir. Registre a escolha no resumo final.
6. Inclua `Content-Type` correto no `header` do exemplo e
   `_postman_previewlanguage` compatível (`json`, `html`, `text`).
7. Todo exemplo salvo deve ter o campo `"cookie": []` (o Postman o inclui no
   export; ausente, o exemplo ainda importa, mas fica fora do padrão do exporter).
