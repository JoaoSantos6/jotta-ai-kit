# fetch e pull — trazer mudanças do remoto

Verifique `fetch: true` e/ou `pull: true` no `config.md` conforme a ação.

## Diferença essencial

- **`git fetch`** baixa as mudanças do remoto mas **não** altera sua branch de
  trabalho. É seguro e não destrutivo. Bom para inspecionar antes de integrar.
- **`git pull`** = `fetch` + integração (`merge` por padrão, ou `rebase` se
  configurado). **Altera** sua branch atual.

Quando o objetivo for só "ver se há novidades", prefira `fetch`.

## fetch

```bash
git fetch origin
```

Depois, inspecione sem alterar nada:

```bash
git log HEAD..origin/<branch> --oneline   # o que veio de novo
git diff HEAD origin/<branch>             # diferenças de conteúdo
```

## pull

```bash
git pull origin <branch>
```

Pull com rebase (mantém histórico linear, sem commit de merge):

```bash
git pull --rebase origin <branch>
```

> `pull --rebase` reescreve seus commits locais sobre os do remoto. Se houver
> conflitos, eles aparecem durante o rebase — veja `rebase.md` e `merge.md`.

## Recomendações

- Antes do pull, garanta uma árvore limpa (`git status`). Se houver alterações
  não commitadas, faça commit ou `git stash` (ver `stash.md`) para evitar
  conflitos inesperados.
- Se o pull abrir resolução de conflitos, siga `merge.md`.
