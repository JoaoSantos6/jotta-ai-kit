# ENDPOINTS-TASKS.md — trabalho em partes para repositórios grandes

> Leia este arquivo quando o repositório for grande (mais de ~15 endpoints, ou
> quando o desenvolvedor pedir para fazer em partes). Ele define como planejar e
> acompanhar a documentação da collection por lotes.

## Por que

Em repositórios grandes, montar a collection inteira de uma vez estoura contexto e
dificulta retomar o trabalho. A solução é um arquivo de controle, o
`ENDPOINTS-TASKS.md`, que lista **todos** os endpoints do projeto como to-do list:
o que já foi documentado fica visível para a skill (e para o desenvolvedor) em
qualquer sessão futura.

## Onde salvar

No mesmo diretório do `.json` da collection. O arquivo é temporário por natureza:
quando todos os itens estiverem concluídos, pergunte ao desenvolvedor se quer
mantê-lo (como inventário de rotas) ou removê-lo.

## Formato

```markdown
# ENDPOINTS-TASKS — <nome do serviço>

> Controle de documentação da collection Postman.
> Gerado em: 2026-07-29 · Collection: `<caminho do .json>`

## Users
- [x] `GET /users` — Listar usuários
- [x] `GET /users/{id}` — Buscar usuário por id
- [ ] `POST /users` — Criar usuário
- [ ] `DELETE /users/{id}` — Remover usuário

## Orders
- [ ] `GET /orders` — Listar pedidos
- [ ] `POST /orders` — Criar pedido
```

Regras do formato:

1. **Um item por endpoint**, no padrão `- [ ] \`MÉTODO /rota\` — <resumo curto>`.
2. **Agrupe por domínio/recurso** (mesmo agrupamento dos controllers/routers do
   código), com um `##` por grupo.
3. O cabeçalho registra a **data de geração** e o **caminho da collection**, para
   que qualquer sessão futura saiba qual arquivo incrementar.

## Fluxo de trabalho por lotes

1. **Planejamento (uma vez)**: varra o repositório inteiro e liste TODOS os
   endpoints no `ENDPOINTS-TASKS.md`, todos desmarcados. Esta varredura completa é
   obrigatória antes de documentar o primeiro request — é ela que garante que nada
   ficará de fora.
2. **Lote**: escolha (ou pergunte ao desenvolvedor) um grupo de itens — em geral um
   `##` de domínio por vez, ou ~5 a 10 endpoints.
3. Documente o lote na collection (três ambientes + descrição, conforme
   `folders.md`, `variables.md` e `documentacao-endpoints.md`).
4. **Marque `[x]` imediatamente** após concluir cada endpoint — nunca em bloco no
   fim da sessão. Um endpoint só é marcado quando existe nas pastas `local`, `hml`
   e `prd` e está com a descrição preenchida.
5. Ao fim de cada lote, entregue um resumo parcial: itens concluídos, itens
   restantes, próximo lote sugerido.

## Retomando o trabalho

Ao ser acionada num repositório que já tem `ENDPOINTS-TASKS.md`:

1. Leia o arquivo **antes** de varrer o código: os itens desmarcados são a fila.
2. Confira rapidamente se surgiram rotas novas no código desde a geração
   (compare com os routers/controllers); se sim, adicione-as desmarcadas ao grupo
   correto antes de continuar.
3. Continue do primeiro item desmarcado, incrementando a collection existente.
