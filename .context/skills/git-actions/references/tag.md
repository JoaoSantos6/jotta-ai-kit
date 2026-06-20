# tag — marcar versões

Verifique `tag: true` no `config.md`. Enviar tags ao remoto também depende de
`push: true` (ver `push.md`).

## Criar

Tag anotada (recomendada para releases — guarda autor, data e mensagem):

```bash
git tag -a v1.2.0 -m "Release 1.2.0"
```

Tag leve (apenas um marcador):

```bash
git tag v1.2.0
```

Tag em um commit específico:

```bash
git tag -a v1.2.0 <hash> -m "Release 1.2.0"
```

## Versionamento semântico

Use `vMAJOR.MINOR.PATCH` alinhado aos commits (ver `commits.md`):

- `feat` → incrementa **MINOR** (ex.: 1.2.0 → 1.3.0)
- `fix` → incrementa **PATCH** (ex.: 1.2.0 → 1.2.1)
- `BREAKING CHANGE` → incrementa **MAJOR** (ex.: 1.2.0 → 2.0.0)

## Listar e enviar

```bash
git tag                       # lista (sempre permitido)
git push origin v1.2.0        # envia uma tag (requer push: true)
git push origin --tags        # envia todas
```

## Remover

```bash
git tag -d v1.2.0                    # local
git push origin --delete v1.2.0      # remoto (requer push)
```

Confirme com o usuário antes de remover tags já publicadas.
