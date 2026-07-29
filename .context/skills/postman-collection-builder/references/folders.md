# Estrutura de pastas da collection

> Leia este arquivo SEMPRE. Ele define a hierarquia obrigatória da collection e o
> esqueleto JSON (schema v2.1) que o arquivo final deve seguir.

## Hierarquia obrigatória

```
Collection: <nome do serviço>
└── pasta: <nome do serviço>
    ├── pasta: local
    │   ├── request: <nome da rota 1>
    │   ├── request: <nome da rota 2>
    │   └── ...
    ├── pasta: hml
    │   ├── request: <nome da rota 1>
    │   ├── request: <nome da rota 2>
    │   └── ...
    └── pasta: prd
        ├── request: <nome da rota 1>
        ├── request: <nome da rota 2>
        └── ...
```

Regras:

1. **Um serviço = uma pasta raiz** com o nome do serviço (nome do repositório ou o
   nome pelo qual o time chama a API). Se o repositório contiver mais de um serviço
   (monorepo), crie uma pasta raiz por serviço, cada uma com seus `local/hml/prd`.
2. **Sempre as três pastas de ambiente**: `local`, `hml` e `prd` — nesta ordem —
   mesmo que o desenvolvedor só use um ambiente hoje.
3. **Cada rota aparece nas três pastas**, com o **mesmo nome de request** nos três
   ambientes. O que muda entre ambientes é só endpoint/token, via variáveis
   (ver `variables.md`). O corpo, headers funcionais e a descrição são idênticos.
4. **Nome do request** = método + rota em linguagem clara. Padrão:
   `GET /users/{id} - Buscar usuário por id`. Curto, descritivo, sem jargão interno.
5. Se uma rota existir só em um ambiente (ex.: rota de debug local), crie-a apenas
   onde existe e registre isso na descrição do request e no resumo final.

## Esqueleto JSON (Postman Collection v2.1)

O arquivo final deve seguir exatamente esta forma. Pastas são `item` com array
`item` interno; requests são `item` com objeto `request`.

```json
{
  "info": {
    "name": "<nome do serviço>",
    "description": "Collection do serviço <nome>. Gerada a partir do código do repositório.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "<nome do serviço>",
      "item": [
        {
          "name": "local",
          "item": [
            {
              "name": "GET /users/{id} - Buscar usuário por id",
              "request": {
                "method": "GET",
                "header": [
                  { "key": "Authorization", "value": "Bearer {{token_local}}" }
                ],
                "url": {
                  "raw": "{{base_url_local}}/users/:id",
                  "host": ["{{base_url_local}}"],
                  "path": ["users", ":id"],
                  "variable": [
                    { "key": "id", "value": "", "description": "Id do usuário" }
                  ]
                },
                "description": "<finalidade do endpoint — ver documentacao-endpoints.md>"
              },
              "response": []
            }
          ]
        },
        { "name": "hml", "item": [] },
        { "name": "prd", "item": [] }
      ]
    }
  ],
  "variable": []
}
```

Observações sobre o JSON:

- `info.schema` deve ser **exatamente** a URL v2.1.0 acima — é ela que torna o
  arquivo importável no Postman.
- Requests com body usam `"body": { "mode": "raw", "raw": "<json>", "options": { "raw": { "language": "json" } } }`
  e o header `Content-Type: application/json`.
- Query params vão em `url.query`: `[{ "key": "page", "value": "1", "description": "..." }]`.
- Path params usam `:param` no `path` e são declarados em `url.variable` com
  `description` explicando de onde vem o valor.
- O array `variable` no nível da collection declara todas as variáveis usadas
  (ver `variables.md`).
- `response` fica `[]` a menos que o desenvolvedor tenha optado por exemplos
  salvos (ver `examples.md`).

## Incrementando uma collection existente

Se já houver um `.json` de collection no repositório:

- **Não** crie um segundo arquivo: adicione os novos requests dentro das pastas
  `local/hml/prd` existentes, preservando o que já está lá.
- Se a collection existente não seguir esta hierarquia, avise o desenvolvedor e
  proponha reorganizá-la antes de adicionar rotas novas.
- Mantenha ordenação estável: novos requests entram ao final da pasta, na mesma
  posição relativa nos três ambientes.
