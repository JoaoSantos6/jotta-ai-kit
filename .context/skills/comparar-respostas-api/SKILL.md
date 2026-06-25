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

Skill para comparar a resposta de dois endpoints HTTP e reportar equivalência — usando um
script Python local de nome fixo como motor de comparação.

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

**Regra obrigatória:** se o contexto da conversa não contém claramente as duas rotas, **pergunte
ao desenvolvedor**. Não invente, não chute URLs, não use placeholders. Liste o que falta e peça.

Exemplo de pergunta quando faltam dados:

> Para comparar, preciso de:
> - Requisição A: URL, método, headers, body
> - Requisição B: URL, método, headers, body
> Pode me passar?

### 2. Verificar e preparar o script Python

O motor de comparação desta skill é um script Python com nome fixo: **`cmp_api.py`**

O nome é fixo para que o script possa ser encontrado consistentemente em qualquer repositório
onde a skill for usada. Ele nunca deve ser commitado.

**2a. Verificar versão do Python disponível**

```bash
python --version 2>/dev/null || python3 --version 2>/dev/null
```

Registre a versão major.minor (ex: 3.13). O script será gerado compatível com essa versão.

**2b. Verificar se o script já existe**

```bash
ls cmp_api.py 2>/dev/null && echo "existe" || echo "nao existe"
```

- Se existir: continue para o passo 3 diretamente.
- Se não existir: siga os passos 2c e 2d.

**2c. Gerar o script**

Leia `references/script-python.md` para o template completo do script. Escreva o arquivo
`cmp_api.py` na raiz do repositório (diretório de trabalho atual).

**2d. Proteger o script do git**

Adicione `cmp_api.py` ao `.gitignore` do repositório:

```bash
# Verificar se já está no .gitignore
grep -q "cmp_api.py" .gitignore 2>/dev/null && echo "ja ignorado" || echo "nao ignorado"
```

Se não estiver ignorado:

```bash
echo "cmp_api.py" >> .gitignore
```

Se não houver `.gitignore`, crie-o:

```bash
echo "cmp_api.py" > .gitignore
```

### 3. Verificar permissão por método

- **GET**: pode executar os `curl` automaticamente, sem pedir confirmação.
- **POST / PUT / PATCH / DELETE / qualquer outro método**: **obrigatório** pedir permissão
  explícita ao desenvolvedor antes de executar. Mostre os dois comandos `curl` que você
  pretende rodar e aguarde o "pode" / "ok" / equivalente.

Detalhes em `references/curl-execucao.md`.

### 4. Executar as duas requisições

Monte e execute os comandos curl. Cada requisição tem um timeout obrigatório carregado de
`references/config.md` (atualmente 10s). Se você não leu `references/config.md` ainda
nesta tarefa, leia agora.

Estrutura do curl:

```bash
curl -s -S -o <arquivo_resposta> -w "%{http_code}" \
  --max-time <TIMEOUT_DA_CONFIG> \
  -X <METODO> \
  -H "Header: valor" \
  -d '<body>' \
  "<URL>"
```

- `-o <arquivo_resposta>`: grava o body em arquivo temporário (`/tmp/cmp_a.body` e `/tmp/cmp_b.body`).
- `-w "%{http_code}"`: imprime o status code no stdout — capture isso.
- `--max-time`: timeout total (use o valor da config).

Se a requisição estourar o timeout, **não** retente. Reporte que a requisição A ou B
excedeu o limite e pare a comparação dessa requisição.

### 5. Comparar com o script Python

Execute o script para comparar os dois bodies salvos:

```bash
python cmp_api.py /tmp/cmp_a.body /tmp/cmp_b.body --status-a <STATUS_A> --status-b <STATUS_B>
```

O script retorna:
- **exit code 0** → respostas equivalentes
- **exit code 1** → divergências encontradas
- **stdout** → relatório estruturado de diferenças

Se o script falhar por erro de importação ou Python não disponível, caia para a comparação
descrita em `references/comparacao.md` e informe o desenvolvedor.

### 6. Reportar o resultado

Use a saída do script como base do relatório ao desenvolvedor.

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

Use caminhos JSON-pointer-ish (`a.b[0].c`) para localizar cada divergência. Não despeje os
JSONs inteiros — só as diferenças.

## Estrutura desta skill

```
comparar-respostas-api/
├── SKILL.md                (este arquivo)
└── references/
    ├── config.md           (timeout e outros parâmetros ajustáveis)
    ├── curl-execucao.md    (montagem do curl e política de método)
    ├── comparacao.md       (regras de igualdade profunda — fallback sem Python)
    └── script-python.md    (template do script cmp_api.py)
```

Carregue os arquivos de `references/` sob demanda, conforme apontado no fluxo acima.
