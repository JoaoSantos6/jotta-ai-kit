# merge — integrar branches e resolver conflitos

Verifique `merge: true` no `config.md`.

## Fazer um merge

1. Vá para a branch que vai **receber** as mudanças:
   ```bash
   git switch <branch-destino>
   ```
2. (Opcional, recomendado) atualize-a: `git pull` (ver `fetch-pull.md`).
3. Integre a branch de origem:
   ```bash
   git merge <branch-origem>
   ```

Opções úteis:

- `--no-ff` força um commit de merge mesmo quando seria fast-forward (preserva o
  histórico de que houve uma branch).
- `--squash` junta todos os commits da origem em um só, sem commit de merge
  automático (você commita manualmente depois, seguindo `commits.md`).

## Resolver conflitos

Quando o merge para com conflitos:

1. Veja os arquivos em conflito:
   ```bash
   git status
   ```
2. Abra cada arquivo e procure os marcadores:
   ```
   <<<<<<< HEAD
   (versão da branch destino)
   =======
   (versão da branch origem)
   >>>>>>> <branch-origem>
   ```
3. Edite para deixar o conteúdo final correto e **remova os marcadores**.
4. Marque como resolvido e finalize:
   ```bash
   git add <arquivo-resolvido>
   git commit          # conclui o merge (mensagem padrão de merge é aceitável)
   ```

Para **abortar** e voltar ao estado anterior ao merge:

```bash
git merge --abort
```

## Boas práticas

- Não edite às cegas: entenda o que cada lado mudou (`git diff`, `git log`).
- Após resolver, rode os testes antes de empurrar.
- Em conflitos grandes ou ambíguos, mostre o diff ao usuário e confirme a
  resolução em vez de decidir sozinho.
