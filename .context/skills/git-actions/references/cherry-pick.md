# cherry-pick — aplicar commits específicos

Verifique `cherry_pick: true` no `config.md`.

Cherry-pick copia um (ou mais) commit de outra branch para a branch atual,
criando **novos** commits com o mesmo conteúdo.

## Uso básico

1. Vá para a branch que vai **receber** o commit:
   ```bash
   git switch <branch-destino>
   ```
2. Descubra o hash do commit desejado:
   ```bash
   git log <branch-origem> --oneline
   ```
3. Aplique:
   ```bash
   git cherry-pick <hash>
   ```

Vários commits de uma vez:

```bash
git cherry-pick <hash1> <hash2>
git cherry-pick <hash-inicial>..<hash-final>   # intervalo (exclui o inicial)
```

## Opções úteis

- `-x` adiciona ao corpo da mensagem a referência ao commit original (bom para
  rastreabilidade entre branches).
- `-n` (ou `--no-commit`) aplica as mudanças sem commitar, para você revisar e
  commitar depois seguindo `commits.md`.

## Conflitos

Se houver conflito, ele se resolve igual a um merge (ver `merge.md`):

```bash
# edite os arquivos, remova os marcadores, depois:
git add <arquivo>
git cherry-pick --continue
```

Para abortar e voltar ao estado anterior:

```bash
git cherry-pick --abort
```

## Cuidados

- Cherry-pick **duplica** o conteúdo do commit em um novo hash. Evite cherry-pick
  do mesmo trabalho que depois também será integrado por merge, para não criar
  histórico confuso.
- Confirme com o usuário qual commit deve ser aplicado quando houver ambiguidade.
