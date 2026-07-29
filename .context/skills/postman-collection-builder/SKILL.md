---
name: postman-collection-builder
description: Monta uma collection do Postman (arquivo .json, formato v2.1) sobre o repositório em que está trabalhando, salvando o arquivo dentro do próprio repositório. Cria a estrutura pasta do serviço → pastas local/hml/prd → requests, replicando cada request nos três ambientes com endpoints/tokens via variáveis. Use SEMPRE que o desenvolvedor pedir para criar, gerar, montar ou atualizar uma collection do Postman, "collection das rotas", "postman do projeto", exportar endpoints para o Postman ou documentar as rotas da API em formato Postman. Se o desenvolvedor especificar rotas, cria só para elas; senão, planeja a collection do repositório inteiro. Não use para executar/testar requests (para isso, use run-request).
---

# postman-collection-builder

Gera um arquivo `.json` de collection do Postman (schema **v2.1**) dentro do próprio
repositório, mapeando os endpoints do projeto.

## Escopo: rotas específicas x repositório inteiro

- **O desenvolvedor especificou rota(s)** → crie a collection (ou incremente a
  existente) **apenas** para as rotas pedidas.
- **Nenhuma rota especificada** → planeje a collection do **repositório inteiro**:
  varra o código em busca de todas as rotas (controllers, routers, decorators,
  arquivos de rota) antes de montar qualquer request.
- **Repositório grande** (mais de ~15 endpoints, ou a critério do desenvolvedor) →
  trabalhe **em partes**, controlando o progresso com o arquivo `ENDPOINTS-TASKS.md`.
  Regras em `references/endpoints-tasks.md`.

## Estrutura da collection (resumo)

```
Collection
└── pasta [nome do serviço]
    ├── pasta [local]  → requests [nome da rota]
    ├── pasta [hml]    → requests [nome da rota]
    └── pasta [prd]    → requests [nome da rota]
```

Cada request existe **nos três ambientes** (local, hml e prd), mudando apenas
endpoint/token — sempre via variáveis, nunca hardcoded. A estrutura completa e o
esqueleto JSON estão em `references/folders.md`; a regra de variáveis está em
`references/variables.md`.

## Fluxo de execução

1. Leia `references/folders.md` e `references/variables.md`.
2. **Descoberta**: identifique o nome do serviço e liste as rotas do escopo
   (as pedidas, ou todas as do repositório). Verifique se já existe uma collection
   `.json` no repositório — se existir, **incremente-a** em vez de criar outra.
3. **Repositório grande?** Leia `references/endpoints-tasks.md`, crie/atualize o
   `ENDPOINTS-TASKS.md` e trabalhe por lotes.
4. Para cada rota, leia o código que a implementa e documente sua finalidade no
   campo `description` do request, seguindo `references/documentacao-endpoints.md`.
5. Monte os requests nos três ambientes conforme `folders.md` + `variables.md`.
6. **Exemplos salvos (opcional)**: pergunte ao desenvolvedor se ele quer casos de
   exemplo (sucesso e falha) por request. Se sim, leia `references/examples.md`
   e gere-os no padrão de saved examples do Postman.
7. Valide que o `.json` é um JSON válido e importável (schema v2.1), atualize o
   `ENDPOINTS-TASKS.md` (se em uso) e entregue um resumo: caminho do arquivo,
   rotas cobertas e variáveis que o desenvolvedor precisa preencher.

## Onde salvar o `.json`

Salve na raiz do repositório ou em pasta de documentação existente (`docs/`,
`postman/`). Nome sugerido: `<nome-do-servico>.postman_collection.json`. Se já
houver convenção no repositório, siga-a.

## Índice de `references/`

Carregue cada arquivo apenas quando indicado, para economizar tokens.

| Arquivo                      | Carregar quando…                                                        |
|------------------------------|-------------------------------------------------------------------------|
| `folders.md`                 | SEMPRE. Estrutura de pastas da collection + esqueleto JSON v2.1.         |
| `variables.md`               | SEMPRE. Regra de variáveis entre local, hml e prd (endpoints e tokens).  |
| `documentacao-endpoints.md`  | SEMPRE que for documentar um request. Como descrever a finalidade do endpoint. |
| `endpoints-tasks.md`         | O repositório é **grande**. Regra do `ENDPOINTS-TASKS.md` (to-do list de endpoints). |
| `examples.md`                | O desenvolvedor **optou** por casos de exemplo. Padrão de saved examples (sucesso/falha). |

## Lembretes finais

- Nunca invente rota, payload ou header: tudo sai do código do repositório. Em caso
  de ambiguidade (ex.: autenticação não clara), pergunte ao desenvolvedor.
- Nenhum token ou URL real de hml/prd vai hardcoded no `.json` — apenas variáveis
  (ver `variables.md`).
- Uma rota só é marcada como concluída no `ENDPOINTS-TASKS.md` quando existe nos
  **três** ambientes e está documentada.
