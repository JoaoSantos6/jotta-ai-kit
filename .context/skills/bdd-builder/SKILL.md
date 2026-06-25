---
name: bdd-builder
description: Cria, dentro de um repositório, um arquivo BDD (cenários DADO/QUANDO/ENTÃO em português) para uma funcionalidade específica pedida pelo desenvolvedor, baseando-se no contexto do chat, em documentação de handoff ou no próprio código. Use SEMPRE que o desenvolvedor pedir para escrever, gerar, criar ou documentar um BDD, cenários de comportamento, "feature em Gherkin", "DADO QUANDO ENTÃO", BDD de API (com curl) ou BDD humanizado — mesmo que não diga a sigla "BDD" explicitamente, desde que peça para descrever o comportamento de uma funcionalidade em cenários. Não use para TDD, testes unitários ou código de teste.
---

# bdd-builder

Gera um BDD em markdown, dentro do repositório, para uma funcionalidade específica.
Os cenários seguem o padrão, com conectores em **negrito**:

```
**DADO** <pré-condição>
**QUANDO** <ação>
**ENTÃO** <resultado observável>
```

Use **E** para encadear passos quando necessário. O BDD se baseia no contexto do
chat, em documentação de handoff ou no código do repositório.

## Princípio central

O BDD deve sempre se aproximar da **linguagem natural** e **nunca** ser confundido
com TDD (sem nomes de função, mocks, asserts ou detalhes de implementação). Há dois
modos, e cada um tem seu próprio arquivo de regras/template em `references/`:

- **BDD de API** — o caso mais próximo do lado técnico: descreve como acionar a API e
  o que se espera no response/status, e inclui um `curl` ao final de cada cenário.
- **BDD humanizado** — comportamento de negócio/usuário em linguagem natural, sem
  `curl`.

O `SKILL.md` decide qual dos dois carregar para o contexto atual (ver fase de
Planejamento). Carregue apenas os arquivos necessários para economizar tokens.

## Metodologia: PREVC (obrigatória)

Siga as cinco fases na ordem. O passo a passo completo de cada fase está em
`references/metodologia-prevc.md` — **leia esse arquivo no início de toda execução**.
Resumo:

1. **P — Planejamento.** Busca profunda no que foi pedido (chat + handoff + código),
   sem deixar dúvidas sobre o comportamento esperado. Decide o tipo de BDD (API x
   humanizado). Se restar qualquer ambiguidade de regra de negócio, **pergunte ao
   desenvolvedor antes de prosseguir**.
2. **R — Revisão.** Aciona um **subagente apartado, em background**, para revisar o
   pedido contra o plano de cenários, validando o planejamento. Use
   `references/subagente-revisao.md` como prompt/checklist. Sem subagentes no
   ambiente, faça a revisão adotando uma persona separada de revisor.
3. **E — Execução.** Desenvolve o markdown usando o template correto.
4. **V — Validação.** Justifica cada cenário com um **teste de mesa mental** (NÃO
   escreva o teste de mesa no arquivo — ele acontece só no seu raciocínio). Confere
   template e regras, e incorpora o retorno da Revisão.
5. **C — Conclusão.** Finaliza o markdown, confirma o caminho no repositório e entrega
   um resumo ao desenvolvedor (incluindo variáveis que ele precise resolver).

## Fluxo de execução

1. Leia `references/metodologia-prevc.md` e `references/regras-gerais-bdd.md`.
2. Faça o **Planejamento** e decida o tipo de BDD.
3. Carregue **apenas** o template do tipo escolhido:
   - API → `references/template-api.md`
   - humanizado → `references/template-humanizado.md`
4. Faça a **Revisão** com `references/subagente-revisao.md`.
5. **Execute**, **Valide** e **Conclua**.

## Regra de variáveis no BDD de API

Se o `curl` de um cenário depender de uma variável (token, id, código gerado etc.), a
skill deve dizer **o que fazer para obtê-la**. Exemplo: "para o `curl` abaixo, busque
`<USER_ID>` no banco executando `SELECT id FROM users WHERE email = '...';`". Nunca
deixe um placeholder sem explicar sua origem. Detalhes e padrões em
`references/template-api.md`.

## Índice de `references/`

Carregue cada arquivo apenas quando indicado, para economizar tokens.

| Arquivo                              | Carregar quando…                                              |
|--------------------------------------|---------------------------------------------------------------|
| `metodologia-prevc.md`               | SEMPRE, no início. Passo a passo das 5 fases do PREVC.         |
| `regras-gerais-bdd.md`               | SEMPRE. Estrutura DADO/QUANDO/ENTÃO, linguagem natural, BDD≠TDD, checklist. |
| `template-api.md`                    | O BDD é de **API**. Template + `curl` ao final + origem das variáveis. |
| `template-humanizado.md`             | O BDD é **humanizado** (negócio/usuário). Template em linguagem natural. |
| `subagente-revisao.md`               | Fase de **Revisão**. Prompt/checklist do revisor independente. |

## Lembretes finais

- Salve o arquivo em local coerente com o repositório (ex.: `features/`,
  `docs/bdd/`); se não houver convenção, proponha um caminho.
- Não invente regra de negócio: ambiguidade vira pergunta ao desenvolvedor.
- O teste de mesa é mental e nunca entra no arquivo final.
