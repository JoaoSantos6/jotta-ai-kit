# Regra de variáveis entre local, hml e prd

> Leia este arquivo SEMPRE. Ele define como endpoints e tokens variam entre os três
> ambientes sem duplicar informação nem vazar segredo.

## Princípio

Um mesmo request existe em `local`, `hml` e `prd` e **a única diferença entre as
cópias são as variáveis de ambiente usadas**. Nunca escreva URL de hml/prd ou token
real direto no request: tudo passa por variáveis `{{...}}` declaradas no array
`variable` da collection.

## Convenção de nomes

Sufixo do ambiente sempre ao final, em minúsculas:

| Variável            | local                     | hml                  | prd                  |
|---------------------|---------------------------|----------------------|----------------------|
| Base URL            | `{{base_url_local}}`      | `{{base_url_hml}}`   | `{{base_url_prd}}`   |
| Token/credencial    | `{{token_local}}`         | `{{token_hml}}`      | `{{token_prd}}`      |
| API key (se houver) | `{{api_key_local}}`       | `{{api_key_hml}}`    | `{{api_key_prd}}`    |

- Requests da pasta `local` usam **somente** variáveis `_local`; os de `hml`,
  somente `_hml`; os de `prd`, somente `_prd`. Nunca misture.
- Se o serviço tiver outras diferenças por ambiente (ex.: `client_id`, host de um
  gateway), crie variáveis no mesmo padrão: `<nome>_<ambiente>`.

## Declaração no JSON

Toda variável usada em qualquer request deve ser declarada no array `variable` da
collection, com `description` dizendo **como obter o valor**:

```json
"variable": [
  {
    "key": "base_url_local",
    "value": "http://localhost:3000",
    "description": "URL local. Porta padrão do serviço; confira no docker-compose/env do repositório."
  },
  { "key": "base_url_hml", "value": "", "description": "URL de homologação. Obter com o time / config de deploy." },
  { "key": "base_url_prd", "value": "", "description": "URL de produção. Obter com o time / config de deploy." },
  { "key": "token_local", "value": "", "description": "Token local. Gerar via POST /auth/login com usuário de teste." },
  { "key": "token_hml", "value": "", "description": "Token de hml. Gerar via login no ambiente de homologação." },
  { "key": "token_prd", "value": "", "description": "Token de prd. NUNCA versionar valor real." }
]
```

Regras de preenchimento do `value`:

- **`base_url_local`**: pode vir preenchida — extraia porta/host do próprio
  repositório (`.env.example`, `docker-compose`, config do framework).
- **URLs de hml/prd**: preencha **apenas** se estiverem escritas em arquivo não
  sensível do repositório (config pública, README, pipeline). Caso contrário,
  deixe `""` e explique na `description` onde obter.
- **Tokens e segredos**: `value` **sempre vazio** (`""`), em qualquer ambiente.
  O arquivo `.json` é versionado no repositório — segredo nele é vazamento.
  A `description` deve ensinar como gerar/obter o token (endpoint de login,
  cofre de segredos, pessoa/time responsável).

## Autenticação

- Descubra o esquema real de autenticação lendo o código (middleware, guards,
  decorators). Não presuma Bearer por padrão.
- Aplique o token via header no request (ex.:
  `Authorization: Bearer {{token_local}}`) ou via objeto `auth` do Postman —
  escolha um padrão e use o mesmo nos três ambientes.
- Rotas públicas (sem auth) não levam header de token; registre na descrição do
  request que a rota é pública.

## Checklist rápido

- [ ] Nenhuma URL de hml/prd hardcoded em request.
- [ ] Nenhum token/segredo com valor real no `.json`.
- [ ] Toda variável usada está declarada em `variable` com `description` de origem.
- [ ] Cada pasta de ambiente usa apenas variáveis do seu sufixo.
- [ ] Resumo final ao desenvolvedor lista as variáveis que ele precisa preencher.
