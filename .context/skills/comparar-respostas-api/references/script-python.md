# Script Python — cmp_api.py

Template do script de comparação. Nome fixo: **`cmp_api.py`**, na raiz do repositório.
Nunca commitar — deve estar no `.gitignore`.

## Compatibilidade

Compatível com Python 3.10+. Use `python --version` antes de gerar para confirmar a versão
disponível na máquina e ajustar se necessário (ex: remover sintaxe `match` para < 3.10).

## Template completo

Escreva exatamente este conteúdo em `cmp_api.py`. Adapte apenas se a versão de Python
detectada exigir (ver seção "Ajustes por versão" abaixo).

```python
#!/usr/bin/env python3
"""
cmp_api.py — Motor de comparação de respostas HTTP para a skill comparar-respostas-api.
Nome fixo. Não commitar (deve estar no .gitignore).
"""

import argparse
import json
import sys
from typing import Any


def load_body(path: str) -> tuple[Any, bool]:
    """Retorna (parsed, is_json). Se não for JSON válido, retorna (texto_raw, False)."""
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        return json.loads(content), True
    except (json.JSONDecodeError, UnicodeDecodeError):
        try:
            with open(path, encoding="utf-8") as f:
                return f.read(), False
        except Exception as e:
            return f"<erro ao ler arquivo: {e}>", False


def diff_values(a: Any, b: Any, path: str, diffs: list[str]) -> None:
    """Compara recursivamente dois valores e acumula divergências em `diffs`."""
    if type(a) is not type(b):
        # Exceção: int e float são compatíveis se matematicamente iguais
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and a == b:
            return
        diffs.append(f"{path}: tipo diferente — A={type(a).__name__}({a!r})  B={type(b).__name__}({b!r})")
        return

    if isinstance(a, dict):
        keys_a = set(a.keys())
        keys_b = set(b.keys())
        for k in sorted(keys_a - keys_b):
            diffs.append(f"{path}.{k}: faltando em B")
        for k in sorted(keys_b - keys_a):
            diffs.append(f"{path}.{k}: faltando em A")
        for k in sorted(keys_a & keys_b):
            diff_values(a[k], b[k], f"{path}.{k}", diffs)

    elif isinstance(a, list):
        if len(a) != len(b):
            diffs.append(f"{path}: tamanho diferente — A={len(a)}  B={len(b)}")
            limit = min(len(a), len(b))
        else:
            limit = len(a)
        for i in range(limit):
            diff_values(a[i], b[i], f"{path}[{i}]", diffs)

    else:
        if a != b:
            diffs.append(f"{path}: A={a!r}  B={b!r}")


def compare(
    body_a: Any,
    body_b: Any,
    is_json_a: bool,
    is_json_b: bool,
    status_a: int | None,
    status_b: int | None,
) -> tuple[bool, list[str]]:
    """Retorna (equal, lista_de_divergencias)."""
    report: list[str] = []

    # Status
    if status_a is not None and status_b is not None and status_a != status_b:
        report.append(f"status: A={status_a}  B={status_b}")

    # Body
    if not is_json_a or not is_json_b:
        nota = []
        if not is_json_a:
            nota.append("A não é JSON válido")
        if not is_json_b:
            nota.append("B não é JSON válido")
        report.append(f"comparação textual ({'; '.join(nota)})")
        if body_a != body_b:
            report.append("body: conteúdo textual diferente")
    else:
        diffs: list[str] = []
        diff_values(body_a, body_b, "<raiz>", diffs)
        report.extend(diffs)

    equal = len(report) == 0
    return equal, report


def main() -> None:
    parser = argparse.ArgumentParser(description="Compara dois bodies de resposta HTTP.")
    parser.add_argument("file_a", help="Arquivo com o body da requisição A")
    parser.add_argument("file_b", help="Arquivo com o body da requisição B")
    parser.add_argument("--status-a", type=int, default=None, help="HTTP status code da requisição A")
    parser.add_argument("--status-b", type=int, default=None, help="HTTP status code da requisição B")
    args = parser.parse_args()

    body_a, is_json_a = load_body(args.file_a)
    body_b, is_json_b = load_body(args.file_b)

    equal, report = compare(body_a, body_b, is_json_a, is_json_b, args.status_a, args.status_b)

    if equal:
        status_info = f"  Status: {args.status_a}" if args.status_a else ""
        print(f"✓ Respostas equivalentes{status_info}")
        print("  Body: idêntico (chaves de objetos comparadas sem ordem; arrays comparados com ordem)")
        sys.exit(0)
    else:
        print("✗ Respostas divergem\n")
        for line in report:
            print(f"  - {line}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

## Ajustes por versão

| Versão detectada | Ajuste necessário |
|---|---|
| 3.13.x | Nenhum — use o template acima sem modificações |
| 3.10 – 3.12 | Nenhum — sintaxe `X \| Y` em type hints só afeta anotações, não runtime |
| 3.9 | Substitua `int \| None` por `Optional[int]` e importe `Optional` de `typing` |
| < 3.9 | Substitua também `list[str]` por `List[str]`, `tuple[...]` por `Tuple[...]`, importados de `typing` |

## Uso

```bash
# Comparação básica de bodies
python cmp_api.py /tmp/cmp_a.body /tmp/cmp_b.body

# Com status codes
python cmp_api.py /tmp/cmp_a.body /tmp/cmp_b.body --status-a 200 --status-b 200

# Exit code 0 = iguais, 1 = divergências
echo "Exit: $?"
```

## O que o script faz

- Tenta parsear cada body como JSON.
- Se ambos forem JSON: diff estrutural recursivo — objetos sem ordem de chaves, arrays com ordem.
- Se algum não for JSON: comparação textual exata.
- Tipos são comparados estritamente (`"1" != 1`), exceto `int`/`float` matematicamente iguais.
- Reporta caminhos no formato `a.b[0].c` para cada divergência.
- Saída em stdout; exit code 0 (igual) ou 1 (divergente).
