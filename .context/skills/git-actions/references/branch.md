# branch — criar, trocar, renomear e deletar branches

Verifique `branch: true` para criar/trocar/renomear. **Deletar branch exige
`delete_branch: true`** (chave separada, por ser destrutivo).

## Listar (sempre permitido)

```bash
git branch              # locais
git branch -a           # locais + remotas
git branch --show-current
```

## Criar e trocar

```bash
git switch -c <nova-branch>          # cria e muda para ela
git switch <branch-existente>        # muda para uma existente
git switch -c <nova> origin/<branch> # cria local rastreando a remota
```

(Equivalentes antigos: `git checkout -b <nova>`, `git checkout <branch>`.)

## Renomear

```bash
git branch -m <novo-nome>            # renomeia a branch atual
git branch -m <antigo> <novo>        # renomeia outra
```

## Deletar (requer `delete_branch: true`)

```bash
git branch -d <branch>    # seguro: recusa se houver commits não integrados
git branch -D <branch>    # força a deleção (perde commits não integrados!)
```

Deletar no remoto:

```bash
git push origin --delete <branch>    # também sujeito a push/force conforme config
```

## Cuidados

- Prefira `-d` a `-D`; só force se o usuário confirmar que aceita perder
  commits.
- Antes de deletar, mostre `git log <branch> --oneline` para o usuário confirmar.
- Nunca delete `main`/`master`/`develop` sem confirmação explícita.
