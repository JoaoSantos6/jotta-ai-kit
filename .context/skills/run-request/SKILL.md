---
name: run-request
description: >
  Executa uma tarefa singular via script Python descartável de nome fixo: rodar uma
  requisição HTTP (a partir de um curl ou descrição), consultar uma API pública, ou varrer
  arquivos locais como BDDs e testes de integração. Use quando o usuário pedir para
  "executar esse curl", "consultar essa API", "chamar esse endpoint", "varrer os BDDs",
  "analisar os testes de integração", ou variações que envolvam UMA execução pontual.
---

# Executar Requisição

Skill para executar uma ação pontual — requisição HTTP ou varredura de arquivos — usando
um script Python local de nome fixo como motor de execução.

## Quando usar

- O desenvolvedor informa um `curl` (ou descreve uma requisição) e quer o resultado.
- A LLM precisa consultar uma API pública para obter alguma informação.
- A LLM precisa varrer um BDD, testes de integração ou outros arquivos do repositório de
  forma programática.

## Fluxo de execução

Siga os passos em ordem. Não pule etapas.

### 1. Ler a configuração

Leia `references/config.md` **antes de qualquer ação**. Dele vêm:

- **NOME_SCRIPT** — nome fixo do arquivo Python (ex: `llm_runner.py`).
- **EXCLUIR_APOS_EXECUCAO** — `true`/`false`, define o destino do script após a execução.
- **TIMEOUT_SEGUNDOS** — timeout de requisições HTTP.

### 2. Identificar a tarefa

Você precisa saber exatamente o que executar:

- **Requisição HTTP**: URL completa, método, headers e body. Se veio um `curl`, interprete-o
  conforme `references/execucao.md`.
- **Varredura local**: diretório alvo, padrão de arquivos e o que extrair.

**Regra obrigatória:** se faltar informação, **pergunte ao desenvolvedor**. Não invente
URLs, não use placeholders, não chute caminhos.

### 3. Verificar Python disponível

```bash
python --version 2>/dev/null || python3 --version 2>/dev/null
```

Registre a versão major.minor. O script será gerado compatível com ela.

### 4. Verificar permissão por método

- **GET** e varreduras locais → executa automaticamente.
- **POST / PUT / PATCH / DELETE / qualquer outro método** → **obrigatório** pedir permissão
  explícita ao desenvolvedor antes de executar, mostrando URL, método e body (segredos
  mascarados).

Detalhes em `references/execucao.md`.

### 5. Gerar o script

Escreva o arquivo com o nome fixo **NOME_SCRIPT** na raiz do repositório, com o código
necessário para a tarefa. Diretrizes e esqueletos em `references/script-python.md`.

- Se o arquivo já existir, sobrescreva — ele é sempre descartável.
- Use apenas biblioteca padrão do Python.
- O script deve imprimir resultado estruturado no stdout e retornar exit code 0/1.

### 6. Executar

```bash
python <NOME_SCRIPT>
```

- Capture stdout e exit code.
- Timeout, erros de rede e retentativas: siga `references/execucao.md`.

### 7. Limpeza (obrigatória)

Conforme **EXCLUIR_APOS_EXECUCAO** da config:

- `true`  → exclua o script (`rm -f <NOME_SCRIPT>`) após usar o resultado.
- `false` → mantenha o script, garantindo que `<NOME_SCRIPT>` está no `.gitignore`
  (crie o `.gitignore` se não existir).

Nunca, em nenhuma hipótese, o script deve ser commitado.

### 8. Reportar o resultado

Entregue ao desenvolvedor um resumo enxuto baseado no stdout do script:

```
✓ Execução concluída
  Tarefa: <descrição curta>
  Status: <code, se HTTP>
  Resultado: <dados relevantes, não o despejo bruto>
  Script: <excluído | mantido (gitignore)>
```

Em caso de falha, reporte o erro, o que foi tentado e — se a causa for permissão/rule —
o comando pronto para o desenvolvedor rodar manualmente.

## Estrutura desta skill

```
run-request/
├── SKILL.md                (este arquivo)
└── references/
    ├── config.md           (nome do script, exclusão pós-execução, timeout)
    ├── execucao.md         (política por método, parse de curl, erros, limpeza)
    └── script-python.md    (diretrizes e esqueletos do script descartável)
```

Carregue os arquivos de `references/` sob demanda, conforme apontado no fluxo acima.
