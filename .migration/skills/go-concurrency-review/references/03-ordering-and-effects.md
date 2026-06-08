# 03 — Ordem dos efeitos e modo (síncrono vs fire-and-forget)

> O ponto **mais importante** desta skill. A ordem mapeada em `side-effects-mapping/05-ordering-and-transactions.md` é contrato: "grava banco → chama API → invalida cache" produz semântica diferente de qualquer outra permutação em caso de falha no meio. Concorrência no Go pode embaralhar isso sem ninguém perceber. Esta reference cobre o critério e os padrões.

## Sumário

- [Por que ordem é contrato](#por-que-ordem-é-contrato)
- [Importar a ordem do legado](#importar-a-ordem-do-legado)
- [O que **não** pode ser paralelizado](#o-que-não-pode-ser-paralelizado)
- [Fire-and-forget que virou síncrono](#fire-and-forget-que-virou-síncrono)
- [Síncrono que virou fire-and-forget](#síncrono-que-virou-fire-and-forget)
- [Janelas de visibilidade](#janelas-de-visibilidade)
- [Saída esperada](#saída-esperada)

---

## Por que ordem é contrato

Considere a sequência do legado:

1. `BEGIN` transação banco.
2. `INSERT` em `onboarding`.
3. `INSERT` em `onboarding_answers`.
4. `COMMIT`.
5. `POST` na API externa.
6. `DEL` chave de cache.

Permutações comuns que parecem inocentes e mudam o sistema:

- **5 antes de 4 (API antes do commit)**: se o commit falha, a API recebeu uma resposta sem persistência local — usuário "respondeu" segundo a API e "não respondeu" segundo o banco.
- **6 antes de 4 (cache invalidado antes do commit)**: outra request pode repopular o cache com dado antigo (porque o novo ainda não está visível) — cache fica errado por TTL inteiro.
- **5 paralelo a 6**: a API pode falhar mas o cache foi invalidado; ou vice-versa. Estado parcial diferente do legado.

`side-effects-mapping/05-ordering-and-transactions.md` produz a matriz de falha parcial do legado. Qualquer concorrência que mude essa matriz é drift, mesmo se "tudo correr bem" no caminho feliz.

## Importar a ordem do legado

Para a rota em revisão:

1. Abra a saída do `side-effects-mapping` do PHP equivalente.
2. Liste a sequência ordenada de efeitos.
3. Marque a fronteira de transação.
4. Marque modo de cada efeito: bloqueante (a rota espera) vs fire-and-forget (a rota segue sem esperar).

Use isso como **gabarito**. A revisão do Go pergunta, ponto a ponto: a ordem foi preservada? O modo foi preservado?

## O que **não** pode ser paralelizado

Sem decisão explícita aprovada pelo time, **mantenha serial**:

- Operações dentro da mesma transação de banco (`INSERT` A, depois `INSERT` B no mesmo `tx`). Paralelizar usando duas conexões já quebra a transação.
- Operações que **dependem** logicamente uma da outra (API B precisa do resultado de API A).
- Chamadas à API externa **não idempotentes** — paralelizar adiciona janela de double-call em retry.
- Sequências que o legado fazia serialmente: presumir que o legado tinha um motivo (mesmo que esquecido) é a postura AS-IS.

Quando o autor argumentar "mas isso ficou mais rápido", a resposta da skill é: **mais rápido ≠ correto**. O critério é "observavelmente igual ao legado, agora".

## Fire-and-forget que virou síncrono

Cenário: o legado dispara um efeito via `register_shutdown_function` ou fila (`dispatch(job)`); o cliente recebe a resposta antes do efeito completar. O Go reescreveu como chamada síncrona.

Implicações:

- A rota fica **mais lenta** (a resposta agora espera o efeito).
- Falhas do efeito agora **afetam a resposta**: um log/audit que falhava silenciosamente passa a retornar `5xx`.
- Cliente que esperava resposta rápida pode timeout.

Recomendação: voltar para fire-and-forget no Go (goroutine ou fila), preservando o contrato. Use `04-context-and-lifecycle.md` para fazer isso com segurança (recover, context independente).

## Síncrono que virou fire-and-forget

Cenário oposto: o legado bloqueava esperando a API/banco; o Go dispara `go func()` para "soltar" a resposta.

Implicações:

- Cliente recebe `200` mas a operação pode ainda falhar — o cliente nem sabe.
- Em retry do cliente, ele assume "deu erro, vou tentar de novo", podendo duplicar.
- Auditoria/log que confirmavam a operação podem chegar depois (ou nunca, se o handler panicar).

Recomendação: **bloquear** como no legado. Otimização para fire-and-forget é decisão de produto explícita, fora do AS-IS.

## Janelas de visibilidade

Mesmo preservando ordem, concorrência pode criar janelas onde o **estado intermediário** é observável por outro consumidor:

- Invalidar cache antes do commit cria janela onde uma leitura concorrente populariza o cache com dado antigo.
- Gravar banco antes da API: se outra rota lê banco e dispara ação por aquilo, pode disparar **antes** de a API estar consistente.
- `errgroup` com timeout: o sucesso de uma chamada e o cancelamento de outra deixam estado parcial.

O legado tem **alguma** janela; preserve a mesma. Reduzir a janela é melhoria, mas é decisão.

## Saída esperada

Por ponto de concorrência avaliado, alimente a tabela do `SKILL.md` com:

```markdown
### Avaliação de ordem — ponto C2
- Sequência esperada (legado): db.commit → api.post → cache.del (todos bloqueantes)
- Sequência observada no Go: api.post || cache.del (paralelos via errgroup, depois espera os dois) → db.commit
- Diagnóstico: ordem mudou (api.post deveria ser depois do commit) **e** db.commit moveu-se para o fim.
- Veredito: altera semântica.
- Recomendação: serializar para `db.commit → api.post → cache.del`. Se latência for o problema, abrir decisão de produto.
```
