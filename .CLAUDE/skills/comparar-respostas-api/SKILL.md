---
name: comparar-respostas-api
description: >
  Compara as respostas de duas requisições HTTP (status + body) e reporta se são iguais ou
  quais são as diferenças. A própria skill executa as requisições via curl, respeitando regras
  de método (GET automático, demais métodos exigem confirmação) e timeout configurável.
  Use sempre que o usuário pedir para "comparar duas rotas", "comparar APIs", "verificar se
  duas respostas são iguais", "diff de endpoints", "checar paridade entre serviços",
  "comparar legado x novo", ou variações que envolvam confirmar equivalência entre dois
  endpoints HTTP.
---

# Comparar Respostas de API

Skill para comparar a resposta de dois endpoints HTTP e dizer se são equivalentes.

## Quando usar

O usuário quer saber se duas requisições retornam a mesma coisa — tipicamente em cenários
de migração, paridade entre serviços (ex: legado vs novo), regressão de rotas ou validação
de refatorações.

## Fluxo de execução

Siga os passos em ordem. Não pule etapas.

### 1. Identificar as duas requisições

Você precisa, para cada uma das duas requisições:

- URL completa (incluindo query string)
- Método HTTP (GET, POST, PUT, PATCH, DELETE, ...)
- Headers (se houver)
- Body (se houver)

**Regra obrigatória:** se o contexto da conversa não contém claramente as duas rotas, **pergunte ao desenvolvedor**. Não invente, não chute URLs, não use placeholders. Liste o que falta e peça.

Exemplo de pergunta quando faltam dados:

> Para comparar, preciso de:
> - Requisição A: URL, método, headers, body
> - Requisição B: URL, método, headers, body
> Pode me passar?

### 2. Verificar permissão por método

- **GET**: pode executar os `curl` automaticamente, sem pedir confirmação.
- **POST / PUT / PATCH / DELETE / qualquer outro método**: **obrigatório** pedir permissão explícita ao desenvolvedor antes de executar. Mostre os dois comandos `curl` que você pretende rodar e aguarde o "pode" / "ok" / equivalente.

Detalhes em `references/curl-execucao.md`.

### 3. Executar as duas requisições

Monte e execute os comandos curl. Cada requisição tem um timeout obrigatório carregado de `references/config.md` (atualmente 10s). Se você não leu `references/config.md` ainda nesta tarefa, leia agora — esse arquivo isola o timeout para que ele seja ajustável sem mexer no fluxo.

Estrutura do curl (ajuste headers/body conforme o caso):

```bash
curl -s -S -o <arquivo_resposta> -w "%{http_code}" \
  --max-time <TIMEOUT_DA_CONFIG> \
  -X <METODO> \
  -H "Header: valor" \
  -d '<body>' \
  "<URL>"
```

- `-o <arquivo_resposta>`: grava o body em arquivo temporário (ex: `/tmp/resp_a.json` no Linux/macOS, ou caminho equivalente no Windows usando bash).
- `-w "%{http_code}"`: imprime o status code no stdout — capture isso.
- `--max-time`: timeout total da requisição (use o valor da config).

Se a requisição estourar o timeout, **não** retente. Reporte que a requisição A ou B excedeu o limite de N segundos e pare a comparação dessa requisição.

### 4. Comparar status code

Se os dois status codes forem diferentes, já é divergência — registre e siga para comparar o body assim mesmo (o desenvolvedor geralmente quer ver as duas dimensões de uma vez).

### 5. Comparar o body

As regras de comparação **profunda** estão em `references/comparacao.md`. Leia esse arquivo antes da primeira comparação nesta tarefa. Resumo:

- **Objetos / JSON / dict**: ordem das chaves **não** importa. Compara chave a chave, recursivamente.
- **Arrays**: ordem **importa**. `[1, 2]` ≠ `[2, 1]`.
- Tipos diferentes ⇒ diferente (ex: `"1"` ≠ `1`).
- Se um dos bodies não for JSON parseável, caia para comparação textual exata e registre isso no relatório.

Implementação recomendada (escolha conforme o ambiente disponível):

- **Python disponível**: gere e rode um script curto que carrega os dois JSONs com `json.load`, normaliza objetos com `sort_keys=True`, mantém arrays como estão, e usa `deepdiff` se instalado — senão, faça um diff recursivo manual.
- **Node disponível**: use `JSON.parse` e uma comparação recursiva manual; ordene as chaves de objetos antes de imprimir.
- **Nenhum runtime de script**: use `jq -S` (sort keys) nos dois arquivos e `diff` no resultado. Isso preserva ordem de array (jq não reordena arrays) e ignora ordem de chaves de objeto.

Não confie em `diff` textual cru sem normalização — diferença de ordem de chaves geraria falso positivo.

### 6. Reportar o resultado

Formato do relatório final ao desenvolvedor:

**Caso igual:**

```
✓ Respostas equivalentes
  Status: <code>
  Body: idêntico (chaves de objetos comparadas sem ordem; arrays comparados com ordem)
```

**Caso diferente:**

```
✗ Respostas divergem

Status:
  A: <code_a>
  B: <code_b>
  (ou: "iguais — <code>")

Body — diferenças:
  - <caminho.no.json>: A=<valor_a>  B=<valor_b>
  - <outro.caminho>: faltando em A
  - <outro.caminho[2]>: array em ordem diferente
  ...
```

Use caminhos JSON-pointer-ish (`a.b[0].c`) para localizar cada divergência. Não despeje os JSONs inteiros — só as diferenças.

## Estrutura desta skill

```
comparar-respostas-api/
├── SKILL.md              (este arquivo)
└── references/
    ├── config.md         (timeout e outros parâmetros ajustáveis)
    ├── curl-execucao.md  (montagem do curl e política de método)
    └── comparacao.md     (regras de igualdade profunda)
```

Carregue os arquivos de `references/` sob demanda, conforme apontado no fluxo acima.
