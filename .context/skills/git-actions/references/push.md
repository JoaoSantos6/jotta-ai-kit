# push — enviar commits ao remoto

Verifique `push: true` no `config.md`. Force-push tem chave própria:
`force_push: true`. Se a chave estiver `false`, entregue o comando pronto sem
executar.

## Antes de empurrar

1. `git status` — confirme que não há nada inesperado por commitar.
2. `git log origin/<branch>..HEAD --oneline` — veja o que será enviado.
3. Confirme a branch atual com `git branch --show-current`.

## Push comum

```bash
git push origin <branch>
```

Primeira vez na branch (define upstream para futuros `git push`/`git pull`):

```bash
git push -u origin <branch>
```

## Force-push (requer `force_push: true`)

Reescrever histórico remoto é destrutivo: pode apagar trabalho de outras
pessoas. **Sempre prefira `--force-with-lease`**, que só sobrescreve se o remoto
não mudou desde o seu último fetch:

```bash
git push --force-with-lease origin <branch>
```

Use `--force` puro apenas se o usuário pedir explicitamente e entender o risco.
Nunca faça force-push em branches compartilhadas (main, develop) sem
confirmação explícita do usuário.

## Erros comuns

- **rejected (non-fast-forward)**: o remoto tem commits que você não tem. Faça
  `git pull` (ver `fetch-pull.md`) e integre antes de empurrar. Não resolva com
  force-push automaticamente.
- **no upstream branch**: use `git push -u origin <branch>` na primeira vez.
