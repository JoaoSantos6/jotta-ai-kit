# Conselho de Propostas — Instalação no Cursor

## Requisitos

- Cursor 2.4 ou superior (subagents disponíveis desde a versão 2.4)
- Para melhor experiência com `/multitask`: Cursor 3.2+

## Instalação (2 minutos)

Copie os arquivos para seu projeto seguindo esta estrutura:

```
seu-projeto/
└── .cursor/
    ├── agents/
    │   ├── conselheiro-contrario.md       ← subagent: erros fatais
    │   ├── conselheiro-arquiteto.md       ← subagent: primeiros princípios
    │   ├── conselheiro-expansivo.md       ← subagent: oportunidades
    │   ├── conselheiro-forasteiro.md      ← subagent: olho fresco
    │   └── conselheiro-executor.md        ← subagent: ação imediata
    ├── rules/
    │   └── conselho-de-propostas.mdc      ← regra de ativação
    └── skills/
        └── conselho-de-propostas/
            └── SKILL.md                   ← orquestração do presidente
```

Pronto. Sem API key, sem pip install, sem dependências externas.
Tudo roda com o modelo que já está no Cursor.

## Como usar

No chat do Cursor, peça naturalmente:

```
Analise esta proposta: [sua proposta aqui]
```

```
Quero a análise do conselho sobre este plano:

[Proposta detalhada]
```

```
O que o conselho acha dessa ideia: [ideia]
```

## O que acontece por baixo

```
Você pede → Agente principal lê a rule + SKILL.md
                ↓
         Delega para 5 subagents (em paralelo, contexto isolado)
                ↓
         🔴 Contrário      analisa sem ver os outros
         🔵 Arquiteto      analisa sem ver os outros
         🟢 Expansivo      analisa sem ver os outros
         🟡 Forasteiro     analisa sem ver os outros
         🟠 Executor       analisa sem ver os outros
                ↓
         Presidente recebe apenas os resumos finais
                ↓
         Monta: análises → painel de tensão → veredito
```

O ponto-chave: cada subagent roda com seu PRÓPRIO contexto.
O Contrário não sabe o que o Expansivo disse. O Forasteiro não sabe o que
ninguém disse. As análises são genuinamente independentes.

## Variações após o veredito

Depois de receber a análise completa, você pode pedir:

| Comando                              | O que faz                                   |
|---------------------------------------|---------------------------------------------|
| "Análise rápida de [proposta]"       | Cada conselheiro em 2-3 frases              |
| "Foco no Contrário"                  | Expande a análise do Contrário para 500+ palavras |
| "Debate entre Contrário e Expansivo" | Diálogo direto entre 2 conselheiros         |
| "Segunda rodada"                     | Revisão cruzada: cada um revisa os outros 4 |
| "Só o presidente"                    | Análise direta sem delegar para subagents   |

## Personalização

### Adicionar um conselheiro

Crie um novo arquivo em `.cursor/agents/`, por exemplo `conselheiro-financeiro.md`,
seguindo o mesmo padrão dos outros (frontmatter YAML + system prompt).
Depois atualize o `SKILL.md` para incluí-lo no fluxo de delegação.

Ideias de conselheiros extras:
- **Financeiro** — unit economics, ROI, runway, break-even
- **Usuário** — reação do usuário final, UX, adoção
- **Regulador** — riscos legais, compliance, LGPD
- **Técnico** — viabilidade técnica, stack, dívida técnica

### Mudar o modelo por conselheiro

No frontmatter de cada subagent, troque `model: inherit` por um modelo específico:

```yaml
model: claude-sonnet-4-20250514   # ou qualquer modelo disponível no Cursor
```

Isso permite, por exemplo, usar um modelo mais potente para o Presidente
e modelos mais rápidos para os conselheiros.

### Ajustar profundidade

Em cada subagent, altere o range "150-300 palavras" no formato de saída.
Para análises mais profundas, use "300-500 palavras".

### Compartilhar com o time

Como tudo fica em `.cursor/`, basta commitar no repositório.
Todo o time terá acesso ao conselho automaticamente.
