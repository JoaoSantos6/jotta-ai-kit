# recovery — desfazer e recuperar trabalho

Leia este arquivo quando algo deu errado: desfazer commit, recuperar trabalho
perdido, reverter mudanças. Atenção às chaves: `reset: true` para `git reset`,
`revert: true` para `git revert`. `reset --hard` é destrutivo.

## Escolha do método

- Já enviou ao remoto / branch compartilhada → **`git revert`** (cria um commit
  que desfaz, sem reescrever histórico). Mais seguro.
- Ainda é local e não compartilhado → `git reset` pode ser usado.

## revert (requer `revert: true`)

```bash
git revert <hash>      # cria um novo commit que desfaz o commit indicado
```

Resolva conflitos como em `merge.md` se aparecerem.

## reset (requer `reset: true`)

```bash
git reset --soft HEAD~1   # desfaz o commit, mantém mudanças staged
git reset --mixed HEAD~1  # desfaz o commit, mantém mudanças no working dir (padrão)
git reset --hard HEAD~1   # desfaz o commit E descarta as mudanças (DESTRUTIVO)
```

`--hard` apaga alterações de forma difícil de recuperar. Só use com confirmação
explícita do usuário e depois de mostrar `git status`/`git log`.

## Desfazer add (unstage)

Sempre permitido (não destrói conteúdo):

```bash
git restore --staged <arquivo>
```

## Recuperar trabalho "perdido"

O `reflog` registra para onde HEAD apontou; muitas vezes dá para voltar:

```bash
git reflog                 # ache o hash do estado desejado (sempre permitido)
git reset --hard <hash>    # volta para ele (requer reset: true)
```

## Cuidados

- Antes de qualquer reset destrutivo, mostre o que será perdido e confirme.
- Em branches compartilhadas, prefira sempre `revert` a `reset`.
