# rebase — reaplicar/reescrever histórico

Verifique `rebase: true` no `config.md`. Rebase **reescreve** o histórico, então
é tratado como ação sensível.

## Rebase simples

Reaplica seus commits locais sobre o topo de outra branch (histórico linear):

```bash
git switch <minha-branch>
git rebase <branch-base>      # ex.: git rebase main
```

## Rebase interativo

Para reordenar, juntar (squash), editar ou remover commits:

```bash
git rebase -i <commit-base>   # ex.: git rebase -i HEAD~3
```

No editor, troque `pick` por: `reword` (mensagem), `squash`/`fixup` (juntar),
`edit` (parar para alterar), `drop` (remover).

## Conflitos durante o rebase

```bash
# edite os arquivos, remova os marcadores (ver merge.md), depois:
git add <arquivo>
git rebase --continue
```

Pular um commit problemático: `git rebase --skip`.
Abortar e voltar ao estado anterior: `git rebase --abort`.

## Regra de ouro

**Nunca faça rebase de commits já publicados** em branches compartilhadas sem
acordo da equipe — isso muda os hashes e quebra o histórico de quem já baixou.
Depois de um rebase de algo já enviado, o push exigirá `--force-with-lease`
(que depende de `force_push: true`; ver `push.md`).

Quando em dúvida entre merge e rebase para integrar mudanças, pergunte ao
usuário; merge preserva o histórico, rebase deixa linear.
