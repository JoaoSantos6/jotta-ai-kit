# commits — padrão de mensagens

Verifique `commit: true` no `config.md` antes de executar `git commit`. Se for
`false`, monte a mensagem e entregue o comando pronto, sem executar.

## Formato obrigatório

```
<tipo>(<escopo opcional>): <descrição>

<corpo opcional>

<rodapé opcional>
```

Regras da **descrição** (primeira linha):

- No **imperativo** e em **minúsculas**: "adiciona", "corrige", "remove" — não
  "adicionado", "Adiciona", "Adicionei".
- **Sem ponto final**.
- Curta e objetiva (mire em até ~50 caracteres na primeira linha).
- O **escopo** é opcional e indica a área afetada: `feat(api):`, `fix(login):`.

Regras do **corpo** (opcional, separado por uma linha em branco):

- Explica **o quê** e **por quê**, não o "como".
- Quebre linhas em ~72 caracteres.

Regras do **rodapé** (opcional):

- Mudança incompatível: linha começando com `BREAKING CHANGE:` seguida da
  explicação. Relaciona-se ao **MAJOR** do versionamento semântico.
- Referência a issues: `Refs #123`, `Closes #45`.

## Tipos de commit

Use exatamente um destes tipos na primeira linha:

- **feat** — inclui um **novo recurso**. Relaciona-se ao **MINOR** do
  versionamento semântico.
- **fix** — soluciona um **problema/bug**. Relaciona-se ao **PATCH** do
  versionamento semântico.
- **docs** — mudanças na **documentação** (ex.: README). Não inclui alterações
  em código.
- **test** — cria, altera ou exclui **testes** (ex.: testes unitários). Não
  inclui alterações em código.
- **build** — modificações em arquivos de **build** e **dependências**.
- **perf** — alterações de código relacionadas a **performance**.
- **style** — **formatação** de código: semicolons, trailing spaces, lint... Não
  inclui alterações em código (de comportamento).
- **refactor** — **refatorações** que não alteram a funcionalidade (ex.: mudar
  como uma parte da tela é processada mantendo o comportamento; melhorias vindas
  de code review).
- **chore** — tarefas de build, configs de administrador, **pacotes** (ex.:
  adicionar um pacote no .gitignore). Não inclui alterações em código.
- **ci** — mudanças de **integração contínua** (continuous integration).
- **raw** — mudanças em arquivos de **configuração, dados, features,
  parâmetros**.
- **cleanup** — remover **código comentado**, trechos desnecessários ou outras
  limpezas para melhorar legibilidade e manutenibilidade.
- **remove** — **exclusão** de arquivos, diretórios ou funcionalidades obsoletas
  ou não utilizadas, reduzindo tamanho e complexidade do projeto.

## Como escolher o tipo

- Mudou o comportamento e é algo novo para o usuário? → `feat`
- Consertou algo que estava quebrado? → `fix`
- Só mexeu em texto de documentação? → `docs`
- Só mexeu em testes? → `test`
- Só formatação/lint, sem mudar lógica? → `style`
- Reorganizou código sem mudar o que ele faz? → `refactor`
- Mexeu em build/deps? → `build` (ou `ci` se for pipeline)
- Apagou arquivos/recursos obsoletos? → `remove`
- Limpou código morto/comentado? → `cleanup`

Na dúvida entre dois tipos, escolha o que melhor descreve a **intenção** da
mudança e, se necessário, pergunte ao usuário.

## Exemplos

**Exemplo 1** — recurso novo:
Contexto: adicionou autenticação por token JWT.
Mensagem: `feat(auth): adiciona login via token JWT`

**Exemplo 2** — correção:
Contexto: corrigiu cálculo de total que ignorava desconto.
Mensagem: `fix(checkout): corrige total ignorando desconto aplicado`

**Exemplo 3** — com corpo e breaking change:
```
refactor(api): unifica endpoints de usuário

Junta /user e /users em um único recurso para reduzir duplicação.

BREAKING CHANGE: o endpoint /user foi removido; use /users.
```

**Exemplo 4** — limpeza:
Contexto: removeu blocos de código comentado.
Mensagem: `cleanup: remove código comentado em utils`

## Executando o commit

Fluxo recomendado:

1. `git status` para ver o que está alterado.
2. `git add <arquivos>` (prefira adicionar arquivos específicos a `git add .`).
3. `git diff --staged` para revisar o que será commitado.
4. `git commit -m "<tipo>(<escopo>): <descrição>"` — para corpo/rodapé, use
   múltiplos `-m` ou um arquivo de mensagem.

Nunca inclua segredos ou tokens na mensagem.
