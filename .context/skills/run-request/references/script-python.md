# Script Python — llm_runner.py

Diretrizes para gerar o script de execução. Nome fixo definido em `config.md`
(**NOME_SCRIPT**), sempre na raiz do repositório.

## Compatibilidade

Compatível com Python 3.10+. Rode `python --version` antes de gerar para confirmar a versão
disponível e ajustar a sintaxe se necessário.

Use **somente a biblioteca padrão** (`urllib.request`, `json`, `pathlib`, `re`, `argparse`,
`sys`). Não assuma `requests` ou qualquer dependência externa instalada.

## Natureza do script

Diferente de um template fixo, o conteúdo do `llm_runner.py` é **escrito sob demanda** pela
LLM, conforme a tarefa. O arquivo é um "espaço de trabalho" descartável. Regras:

1. O nome do arquivo **nunca muda** — sempre o valor de NOME_SCRIPT.
2. Se o arquivo já existir, **sobrescreva** — ele é sempre descartável, nunca contém
   trabalho do desenvolvedor.
3. O script deve imprimir no stdout um resultado **estruturado e enxuto** (JSON ou linhas
   `chave: valor`), não despejos brutos gigantes. A LLM lerá esse stdout.
4. Exit code `0` para sucesso, `1` para falha — sempre.
5. Sem efeitos colaterais fora do escopo da tarefa (não criar arquivos extras, não alterar
   o repositório).

## Esqueleto base — requisição HTTP

```python
#!/usr/bin/env python3
"""llm_runner.py — script descartável da skill run-request. Não commitar."""

import json
import sys
import urllib.request
import urllib.error

TIMEOUT = 10  # usar TIMEOUT_SEGUNDOS de config.md

def main() -> int:
    url = "<URL>"
    req = urllib.request.Request(
        url,
        method="<METODO>",
        headers={},          # headers da requisição, se houver
        data=None,           # body em bytes, se houver: json.dumps({...}).encode()
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"erro: {e}")
        return 1

    print(f"status: {status}")
    try:
        parsed = json.loads(body)
        print(json.dumps(parsed, ensure_ascii=False, indent=2)[:8000])
    except json.JSONDecodeError:
        print(body[:8000])
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## Esqueleto base — varredura de arquivos (BDD / testes de integração)

```python
#!/usr/bin/env python3
"""llm_runner.py — script descartável da skill run-request. Não commitar."""

import json
import sys
from pathlib import Path

def main() -> int:
    raiz = Path("<diretorio_alvo>")
    resultado = []
    for arq in sorted(raiz.rglob("<padrao, ex: *.feature>")):
        texto = arq.read_text(encoding="utf-8", errors="replace")
        # ... lógica específica da tarefa (extrair cenários, steps, asserts, etc.)
        resultado.append({"arquivo": str(arq)})
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## Ajuste por tarefa

Combine ou adapte os esqueletos conforme necessário (ex: varrer um BDD e depois chamar a
API citada nele). Mantenha o script pequeno e focado na tarefa única — ele será excluído
ou ignorado pelo git logo em seguida.
