# Template — BDD de API

> Leia este arquivo SOMENTE quando o BDD for de API (acionar um endpoint e validar
> response/status). Para comportamento de negócio/usuário, use
> `template-humanizado.md`. As regras gerais de `regras-gerais-bdd.md` continuam
> valendo aqui.

## Índice
1. Quando usar este template
2. Anatomia do cenário de API
3. O `curl` ao final do cenário
4. Variáveis: como instruir a busca
5. Exemplo completo

---

## 1. Quando usar este template

Use quando o comportamento sob descrição for o consumo de uma API: há um endpoint,
um método HTTP, um payload e uma resposta (status + corpo) a validar. Mesmo aqui, o
corpo do cenário permanece em linguagem de comportamento — o `curl` é apoio
operacional, não substitui o cenário.

---

## 2. Anatomia do cenário de API

Cada cenário tem duas partes: o cenário em linguagem natural e, ao final, o bloco de
execução com o `curl`.

```
## Cenário: <comportamento descrito>
**DADO** <pré-condição: usuário autenticado, recurso existente...>
**QUANDO** <o cliente chama o endpoint X com tais dados>
**ENTÃO** <a API responde com status N>
**E** <o corpo da resposta contém / o efeito colateral ocorre>

### Execução
\`\`\`bash
curl -X <MÉTODO> "<URL>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "campo": "valor" }'
\`\`\`
```

O **ENTÃO** deve declarar o status HTTP esperado e a parte verificável do response
(campos, mensagem de erro, código de negócio). Encadeie com **E** quando houver mais
de uma asserção (ex.: status + corpo + efeito colateral persistido).

---

## 3. O `curl` ao final do cenário

Regras:
- **Todo** cenário de API termina com um bloco `### Execução` contendo o `curl`.
- O `curl` deve ser executável: método, URL completa, headers necessários
  (auth, content-type) e payload coerentes com o que o **QUANDO** descreve.
- Use placeholders explícitos em `<MAIÚSCULAS>` para qualquer valor que o
  desenvolvedor precise substituir (`<TOKEN>`, `<USER_ID>`, `<BASE_URL>`).
- Cada placeholder DEVE ter sua origem explicada na seção de variáveis (abaixo).

---

## 4. Variáveis: como instruir a busca

Se o `curl` depende de alguma variável (token, id, código gerado, etc.), a skill
deve dizer **o que fazer para obter aquela variável**. Coloque isso logo após o
`curl`, em uma subseção `#### Variáveis`.

Padrões de instrução conforme a origem:
- **Banco de dados:** forneça o `SELECT` exato.
  > Para o `curl` acima, busque `<USER_ID>` executando no banco:
  > `SELECT id FROM users WHERE email = 'cliente@exemplo.com';`
- **Autenticação/token:** descreva a chamada que gera o token (outro `curl` de
  login) ou onde lê-lo (variável de ambiente, header de resposta).
- **Resposta de chamada anterior:** indique de qual cenário/endpoint o valor vem e
  qual campo do JSON copiar.
- **Variável de ambiente / config:** aponte o arquivo (`.env`, config) e a chave.

Nunca deixe um placeholder sem explicação de origem. Se a origem for desconhecida,
isso é uma dúvida de Planejamento — pergunte ao desenvolvedor.

---

## 5. Exemplo completo

```markdown
# Funcionalidade: Criação de pedido

> Permite que um cliente autenticado crie um pedido a partir de itens do carrinho.

## Cenário: Pedido criado com sucesso
**DADO** que o cliente está autenticado
**E** que possui itens válidos no carrinho
**QUANDO** envia a solicitação de criação de pedido
**ENTÃO** a API responde com status 201
**E** o corpo retorna o `order_id` do pedido criado
**E** o pedido fica persistido com status "AGUARDANDO_PAGAMENTO"

### Execução
\`\`\`bash
curl -X POST "<BASE_URL>/v1/orders" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "cart_id": "<CART_ID>" }'
\`\`\`

#### Variáveis
- `<BASE_URL>`: lida da env do ambiente alvo (ex.: `API_BASE_URL` no `.env`).
- `<TOKEN>`: obtido pelo login —
  `curl -X POST "<BASE_URL>/v1/auth/login" -d '{"email":"...","senha":"..."}'`
  e copie o campo `access_token` da resposta.
- `<CART_ID>`: busque no banco com
  `SELECT id FROM carts WHERE user_id = '<USER_ID>' AND status = 'OPEN';`

## Cenário: Pedido recusado por carrinho vazio
**DADO** que o cliente está autenticado
**E** que o carrinho está vazio
**QUANDO** envia a solicitação de criação de pedido
**ENTÃO** a API responde com status 422
**E** o corpo retorna a mensagem de erro "carrinho vazio"

### Execução
\`\`\`bash
curl -X POST "<BASE_URL>/v1/orders" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "cart_id": "<CART_ID_VAZIO>" }'
\`\`\`

#### Variáveis
- `<CART_ID_VAZIO>`: busque um carrinho sem itens com
  `SELECT c.id FROM carts c LEFT JOIN cart_items i ON i.cart_id = c.id
   WHERE i.id IS NULL LIMIT 1;`
```
