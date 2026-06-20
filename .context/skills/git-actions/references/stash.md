# stash — guardar alterações temporárias

Verifique `stash: true` no `config.md`.

Stash guarda alterações não commitadas para deixar a árvore limpa (ex.: antes de
trocar de branch ou fazer pull), sem precisar criar um commit.

## Guardar

```bash
git stash                          # guarda alterações monitoradas
git stash -u                       # inclui arquivos não rastreados (untracked)
git stash push -m "wip: ajuste X"  # com descrição
```

## Listar e inspecionar

```bash
git stash list
git stash show -p stash@{0}        # diff do stash
```

## Recuperar

```bash
git stash apply           # reaplica o último, mantém na lista
git stash pop             # reaplica o último e remove da lista
git stash apply stash@{2} # reaplica um específico
```

## Limpar

```bash
git stash drop stash@{0}  # remove um
git stash clear           # remove todos (irreversível — confirme com o usuário)
```

## Cuidados

- `pop` pode gerar conflito ao reaplicar; resolva como em `merge.md`.
- `git stash clear` apaga tudo sem recuperação fácil; confirme antes.
