# 05 — Ordenação e transações

> AS-IS não é só "quais efeitos", é "em que ordem e sob qual garantia transacional". Onde está a fronteira da transação determina o que sobra persistido quando algo falha no meio — e onboarding com banco + API externa é exatamente o cenário onde falha parcial importa.

## Sumário

- [Mapear a fronteira da transação](#mapear-a-fronteira-da-transação)
- [O que está dentro vs fora](#o-que-está-dentro-vs-fora)
- [Falha parcial e estado resultante](#falha-parcial-e-estado-resultante)
- [Efeitos não transacionais no meio da transação](#efeitos-não-transacionais-no-meio-da-transação)
- [Nível de isolamento e locks](#nível-de-isolamento-e-locks)
- [Saída esperada](#saída-esperada)

---

## Mapear a fronteira da transação

Localize `beginTransaction`/`commit`/`rollback`, `DB::transaction(...)`, ou auto-commit implícito. Para a rota, desenhe onde a transação **abre** e **fecha** no call graph, e quais efeitos caem dentro.

## O que está dentro vs fora

Classifique cada efeito (das references 01–04) como:

- **Dentro da transação**: revertido no rollback (apenas escritas no mesmo banco/conexão).
- **Fora da transação**: cache, API externa, fila, e-mail, log — **não** são revertidos por rollback. Esse é o ponto crítico.

## Falha parcial e estado resultante

Para cada ponto de falha possível, descreva o estado que sobra:

- Banco commitado + API externa não chamada → usuário registrado localmente mas não na API.
- API chamada + banco com rollback → resposta na API sem correspondência local.
- Cache invalidado + banco revertido → cache repovoa com dado antigo (ou miss desnecessário).

O legado tem **algum** comportamento aqui (mesmo que seja "fica inconsistente"). Capture-o como está; o AS-IS deve reproduzir o mesmo resultado de falha, salvo decisão explícita de melhorar.

## Efeitos não transacionais no meio da transação

Padrões perigosos a registrar:

- Enfileirar job **antes** do commit → job pode rodar e não achar o dado.
- Chamar API externa **dentro** da transação → segura locks de banco durante I/O de rede (lento) e não reverte se a transação falhar depois.
- Invalidar cache antes do commit → janela de repovoamento com dado velho.

Não "conserte" esses padrões na migração sem sinalizar; eles podem ser comportamento do qual algo depende.

## Nível de isolamento e locks

- Anote `SELECT ... FOR UPDATE`, `LOCK TABLES`, nível de isolamento setado na conexão.
- Locks afetam concorrência observável; o driver Go precisa replicar (mesmo `SET TRANSACTION ISOLATION`, mesmos hints de lock).

## Saída esperada

```markdown
## Transação — <METHOD> <path>

Abre em: <ponto>   Fecha em: <ponto>
Isolamento/locks: <...>

Efeitos dentro da transação:
- <escrita A>, <escrita B>

Efeitos fora da transação (não revertidos):
- <cache>, <API externa>, <fila>, <log>

Matriz de falha parcial:
| Falha em | Persistido | Não persistido | Estado resultante |
|----------|-----------|----------------|-------------------|
| <ponto>  | <...>     | <...>          | <consistente?>    |
```
