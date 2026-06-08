---
name: side-effects-mapping
description: >-
  Lê uma rota de um sistema legado em PHP e enumera TODOS os seus efeitos
  colaterais — escritas no banco (incluindo triggers, cascatas e model events),
  operações de cache, chamadas a API externa, logs de negócio, eventos, filas,
  e-mails e webhooks — com a ordem e a condição exatas de cada um, além das
  fronteiras de transação e do estado resultante de falhas parciais. Use SEMPRE
  que for migrar, portar ou reescrever uma rota PHP para Go e precisar garantir
  que o novo serviço reproduza os mesmos efeitos nas mesmas condições, mesmo que
  o pedido fale só em "migrar a rota" e não cite "side effects". Acione junto do
  handoff de fluxo de dados, antes de desenvolver a rota em Go.
---

# Side-Effects Mapping

Numa migração AS-IS, reproduzir o **retorno** da rota não basta: o valor real está nos efeitos colaterais. Um onboarding grava no banco, escreve/invalida cache, chama uma API externa, emite logs e talvez dispare eventos — e a ordem e as condições disso são o contrato implícito que o novo serviço Go precisa honrar. Esta skill produz o inventário completo desses efeitos.

## Quando usar

- Antes de desenvolver a rota equivalente em Go.
- Para complementar o handoff de fluxo de dados, que costuma descrever o caminho feliz e omitir efeitos condicionais e fora-de-transação.
- Quando há suspeita de inconsistência entre banco e sistemas externos.

## Quando NÃO usar

- Para comportamentos implícitos da linguagem (coerção, truthy/falsy) → use `php-quirks-capture`.
- Para schema/contrato dos recursos (tipos de coluna, shape da API) → use `data-contracts-extraction`.

## Fluxo de trabalho

1. **Rastreie a rota.** Leia `references/00-route-tracing.md` e produza o call graph + a lista de fronteiras de I/O. Cada fronteira é candidata a efeito.
2. **Classifique cada fronteira** por tipo (banco, cache, API, log/evento/fila) e abra a reference correspondente.
3. **Para cada efeito, capture ordem + condição + transação.** Não basta "grava na tabela X"; é "grava X, depois chama a API, e só invalida o cache se a API retornou 2xx, tudo isso se a resposta mudou".
4. **Mapeie a transação e a falha parcial** com `references/05`. É o que diferencia um inventário útil de uma lista solta.
5. **Liste os efeitos condicionais** com `references/06`, expressando a condição em dados reais.
6. **Monte a sequência ordenada de efeitos** (saída principal) e rode a auto-verificação.

## Index das references

Abra conforme o tipo de efeito encontrado:

- **Escritas no banco** (INSERT/UPDATE/DELETE, triggers, cascade, model events, last_insert_id) → `references/01-db-writes.md`
- **Cache** (set/forget/incr, TTL, padrão de invalidação, ordem vs banco, convivência com o legado) → `references/02-cache-operations.md`
- **API externa** (bloqueante vs fire-and-forget, retry, idempotência, falha) → `references/03-external-api-calls.md`
- **Logs / eventos / filas / e-mails / webhooks** (efeitos esquecíveis, contrato de log) → `references/04-logs-events-messaging.md`
- **Ordenação e transações** (fronteira da transação, dentro vs fora, matriz de falha parcial, locks) → `references/05-ordering-and-transactions.md`
- **Efeitos condicionais** (condição de disparo em dados reais, diagrama de sequência) → `references/06-conditional-effects.md`
- **Rastreamento da rota** (compartilhada) → `references/00-route-tracing.md`

Cada reference tem sumário no topo; leia só a seção aplicável.

## Formato de saída

Produza um markdown por rota:

```markdown
# Side-effects — <METHOD> <path>

Call graph de referência: <resumo do 00-route-tracing>

## Sequência ordenada de efeitos
1. <efeito> — <alvo> — condição: <...> — transação: <dentro/fora> — sync/async
2. ...

## Detalhe por tipo
### Banco
<entradas da reference 01>
### Cache
<entradas da reference 02>
### API externa
<entradas da reference 03>
### Logs / eventos / filas
<entradas da reference 04>

## Transação e falha parcial
<saída da reference 05: fronteira + matriz de falha>

## Efeitos condicionais
<saída da reference 06: tabela efeito × condição (+ diagrama opcional)>

## Efeitos verificados e ausentes
<tipos percorridos sem ocorrência — prova de cobertura>
```

## Princípios

- **Ordem e condição são parte do efeito.** Reordenar writes ou errar o branch muda o estado observável.
- **Atenção ao que está fora da transação.** Cache, API, fila e e-mail não voltam no rollback — é a maior fonte de inconsistência num AS-IS.
- **Procure os efeitos mágicos.** Triggers, model events e listeners gravam sem aparecer no handler; venha do tracing com eles.
- **Não conserte em silêncio.** Padrões arriscados (enfileirar antes do commit, API dentro da transação) podem ter dependentes; sinalize como comportamento herdado em vez de corrigir por conta própria.

## Auto-verificação antes de entregar

- [ ] Todas as fronteiras de I/O do tracing viraram efeito (ou foram justificadas)?
- [ ] Efeitos indiretos (triggers, cascade, model events, listeners) investigados?
- [ ] Cada efeito tem ordem **e** condição em dados reais?
- [ ] Fronteira de transação mapeada e matriz de falha parcial preenchida?
- [ ] Efeitos fora da transação explicitamente marcados?
- [ ] Idempotência das chamadas externas avaliada (risco de duplicar respostas)?
- [ ] Seção de efeitos ausentes preenchida (cobertura)?
