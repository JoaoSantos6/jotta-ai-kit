---
name: git-actions
description: >-
  Executa e orienta ações do Git com segurança e padronização: commit, push,
  fetch, pull, merge, cherry-pick, rebase, branch, stash, tag e reset. Use SEMPRE
  que o usuário pedir para versionar código, "commitar", "subir alterações",
  "dar push", "trazer mudanças do remoto", "fazer merge", "resolver conflito",
  "aplicar um commit específico" (cherry-pick), criar/trocar de branch, guardar
  alterações (stash), ou qualquer operação de Git — mesmo que ele não use a
  palavra "git". Faz commits no padrão Conventional Commits em português
  (feat, fix, docs, test, build, perf, style, refactor, chore, ci, raw,
  cleanup, remove) e respeita um arquivo de configuração que liga/desliga cada
  ação permitida à LLM.
---

# Git Actions

Skill para executar e orientar ações do Git de forma **segura**, **padronizada**
e **controlada por configuração**. Cada operação que altera o estado do
repositório só pode ser executada pela LLM se estiver explicitamente habilitada
no arquivo de configuração.

---

## ⚠️ Regra zero — leia o config ANTES de qualquer coisa

**Antes de executar qualquer ação do Git, leia `references/config.md`.**

Esse arquivo é uma tabela de chaves liga/desliga (estilo YAML: `chave: valor`).
Ele é a primeira coisa a ser lida, sempre, em toda execução desta skill —
inclusive antes de planejar comandos.

Interpretação:

- `acao: true`  → a LLM **pode** executar essa ação diretamente.
- `acao: false` → a LLM **NÃO pode** executar essa ação. Apenas o desenvolvedor
  pode. Nesse caso, a LLM deve **parar**, explicar que a ação está desabilitada
  no `config.md`, e **mostrar o comando pronto** para o desenvolvedor rodar
  manualmente — nunca executá-lo.

Essa regra deve ser seguida **à risca**. Não há exceção, não há "só dessa vez",
não importa o quão urgente o pedido pareça. Se a chave estiver ausente do
`config.md`, trate como `false` (mais seguro) e avise o usuário.

Operações somente-leitura (`git status`, `git log`, `git diff`, `git show`,
`git branch --list`, `git remote -v`) são **sempre permitidas**, pois não
alteram o repositório, e não precisam de chave no config.

---

## Fluxo de execução

Siga esta ordem em toda tarefa de Git:

1. **Ler `references/config.md`** e carregar o estado de cada chave.
2. **Identificar a ação** pedida (ou a sequência de ações).
3. **Verificar a chave** correspondente no config para cada ação.
   - Se `false`: não executa; entrega o comando pronto ao desenvolvedor.
   - Se `true`: prossegue.
4. **Ler a referência específica** da ação (ver índice abaixo) — só a(s) que
   fizer(em) sentido para a tarefa. Não carregue referências irrelevantes.
5. **Inspecionar o estado** com comandos somente-leitura quando útil
   (`git status`, `git branch`, `git log --oneline -5`) antes de agir.
6. **Executar** o(s) comando(s) ou entregá-lo(s) ao desenvolvedor.
7. **Confirmar o resultado** com uma verificação somente-leitura e reportar de
   forma sucinta.

---

## Índice de referências

Leia cada arquivo abaixo **apenas quando a tarefa exigir**. O `config.md` é a
única exceção: é lido sempre, primeiro.

| Arquivo | Quando ler |
|---|---|
| `references/config.md` | **SEMPRE, primeiro.** Define o que a LLM pode ou não executar. |
| `references/commits.md` | Sempre que for criar uma mensagem de commit ou fazer `git commit`. Contém o padrão de tipos (feat, fix, docs...) e o formato obrigatório da mensagem. |
| `references/push.md` | Ao enviar commits para o remoto (`git push`), incluindo upstream e force-push. |
| `references/fetch-pull.md` | Ao trazer mudanças do remoto: `git fetch` e/ou `git pull` (e a diferença entre eles). |
| `references/merge.md` | Ao integrar branches (`git merge`) e ao resolver conflitos de merge. |
| `references/cherry-pick.md` | Ao aplicar commits específicos de outra branch (`git cherry-pick`). |
| `references/branch.md` | Ao criar, trocar, renomear ou deletar branches. |
| `references/rebase.md` | Ao reordenar/reescrever histórico (`git rebase`, incluindo interativo). |
| `references/stash.md` | Ao guardar/recuperar alterações temporárias (`git stash`). |
| `references/tag.md` | Ao criar/remover tags e versões (`git tag`). |
| `references/recovery.md` | Quando algo der errado: desfazer commit, recuperar trabalho, `reset`, `revert`, `reflog`. |

---

## Padrão de commits (resumo)

O formato completo está em `references/commits.md`. **Sempre leia esse arquivo
antes de escrever uma mensagem de commit.** Resumo do formato:

```
<tipo>(<escopo opcional>): <descrição no imperativo, minúscula, sem ponto final>

<corpo opcional explicando o quê e o porquê>

<rodapé opcional: BREAKING CHANGE, refs de issue>
```

Tipos disponíveis: `feat`, `fix`, `docs`, `test`, `build`, `perf`, `style`,
`refactor`, `chore`, `ci`, `raw`, `cleanup`, `remove`. A definição de cada um
está em `references/commits.md`.

Exemplo: `feat(auth): adiciona login via token JWT`

---

## Princípios de segurança

Estes princípios valem para toda a skill e reforçam a Regra Zero:

- **Config manda.** Nenhuma ação destrutiva ou que escreva no repositório é
  executada se sua chave estiver `false` ou ausente.
- **Nunca force sem permissão explícita.** `git push --force`, `git reset --hard`,
  `git rebase` e deleção de branch só rodam se a chave correspondente estiver
  `true`. Em geral force-push tem chave própria (`force_push`).
- **Prefira o seguro.** Quando houver alternativa não destrutiva (ex.: `revert`
  em vez de `reset --hard`; `--force-with-lease` em vez de `--force`), prefira-a
  e explique a escolha.
- **Mostre antes de agir** em operações de risco: exiba o que será afetado
  (`git status`, `git log`, `git diff`) e confirme com o usuário.
- **Mensagens limpas.** Nunca inclua segredos, tokens ou caminhos sensíveis em
  mensagens de commit.
- **Não invente estado.** Sempre verifique com comandos reais; não suponha em
  qual branch está ou o que foi alterado.

---

## Quando uma ação está desabilitada

Se o config define a ação como `false`, responda neste formato:

> A ação **push** está desabilitada no `config.md` (`push: false`), então não vou
> executá-la. Aqui está o comando pronto para você rodar quando quiser:
>
> ```bash
> git push origin minha-branch
> ```

Entregue o comando completo e correto, mas **não o execute**.
