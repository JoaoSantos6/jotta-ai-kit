---
name: go-parity-verification
description: >-
  Prova que a rota Go produz o MESMO comportamento observável que a rota PHP
  legada equivalente — não apenas o status e o corpo da resposta, mas também o
  estado do banco, o estado do cache (chaves, valores, TTL e formato byte a byte)
  e a sequência de chamadas feitas à API externa. Compara o Go contra goldens
  capturados do legado real, não contra a intenção descrita em BDD. Use SEMPRE
  que for verificar paridade entre a rota nova e a antiga, criar golden/snapshot
  tests, fechar a migração AS-IS de uma rota PHP→Go, ou garantir que "ficou
  igual ao legado" — inclusive quando o pedido falar apenas em "validar a
  migração", "testar a rota nova", "comparar com o legado" ou "garantir que não
  quebrou nada", sem citar "golden" ou "paridade". Acione antes de declarar uma
  rota Go pronta para produção e sempre que houver suspeita de drift.
---

# Go Parity Verification

Numa migração AS-IS, a única definição rigorosa de "ficou igual" é: para os mesmos inputs, o serviço Go produz o mesmo **comportamento observável** que o PHP. Isso inclui resposta (status, headers, corpo), estado do banco (linhas/colunas tocadas), estado do cache (chaves, valores, TTL, **formato de serialização**) e o **conjunto + ordem** de chamadas à API externa. BDD descreve a intenção; goldens descrevem o que de fato existe — inclusive bugs herdados que o AS-IS exige reproduzir.

Esta skill fecha o ciclo da migração. As três skills do legado (`php-quirks-capture`, `side-effects-mapping`, `data-contracts-extraction`) dizem **o que** comparar; esta skill diz **como** comparar e **como classificar** as diferenças.

## Quando usar

- Antes de declarar pronta uma rota Go que substitui uma rota PHP existente.
- Quando alguém pergunta "isso ficou igual?" ou "podemos cortar o tráfego para o Go?".
- Para criar/atualizar a suíte de testes de paridade (golden tests) de uma rota migrada.
- Sempre que houver suspeita de drift silencioso (resposta certa, efeito errado).

## Quando NÃO usar

- Para traduzir o tratamento de erros do PHP para Go preservando status/shape → use `php-to-go-error-mapping`.
- Para revisar concorrência introduzida no Go (goroutines, races, ordem de efeitos) → use `go-concurrency-review`.
- Para validar a **intenção** de uma feature nova que não existia no legado — BDD/testes próprios cobrem isso; golden de paridade pressupõe um legado de referência.

## Fluxo de trabalho

1. **Localize o handler Go** com `references/00-go-route-locating.md` e produza o bloco padronizado de call graph + fronteiras de I/O. Sem isso você não sabe quais dimensões existem para comparar.
2. **Puxe as saídas das skills do legado** para saber **o que** comparar:
   - `data-contracts-extraction` → contrato dos dados (schema, chaves de cache, serialização, contrato da API) — define a granularidade da comparação.
   - `side-effects-mapping` → quais efeitos, em que ordem, sob qual condição — define o que precisa virar assert.
   - `php-quirks-capture` → comportamentos implícitos que o Go pode estar quebrando sem perceber — define as armadilhas de diff.
3. **Capture os goldens do legado** com `references/01-golden-capture.md`: request/response, estado do banco antes/depois, dump de chaves de cache tocadas (com valor e TTL), e gravação das chamadas externas. Trate o golden como dado versionado e determinístico.
4. **Rode a rota Go** com os mesmos inputs, no mesmo estado inicial de banco e cache, mockando/replayando a API externa.
5. **Faça o diff em quatro dimensões**: resposta, banco, cache e chamadas externas. Use `references/02-diff-strategy.md` para decidir o que normalizar antes de comparar e o que **nunca** normalizar.
6. **Classifique cada diferença** como *drift real* (corrigir o Go) ou *ruído normalizável* (ajustar o normalizador e justificar). Nunca esconda um drift sob um normalizador genérico.
7. **Documente bugs herdados conscientes**: se o legado tem comportamento errado e o AS-IS diz para reproduzir, registre isso explicitamente; o Go passa o teste por design.
8. **Rode a auto-verificação** antes de declarar paridade.

## Index das references

Cada reference tem sumário no topo; consuma só a seção necessária.

- **Localização da rota no Go** (call graph + fronteiras + correlação com o PHP) — abra quando começar **qualquer** verificação de paridade, antes de tudo. → `references/00-go-route-locating.md`
- **Captura de goldens do legado** (request/response, snapshot de banco/cache, gravação de chamadas externas, versionamento, determinismo) — abra quando precisar produzir/atualizar o material de referência contra o qual o Go será comparado. → `references/01-golden-capture.md`
- **Estratégia de diff** (o que normalizar e o que NUNCA normalizar; array vs objeto JSON; escaping; ordem de chaves) — abra antes da primeira comparação e sempre que uma diferença parecer "ruído". → `references/02-diff-strategy.md`
- **Assertions de estado do banco** (linhas/colunas tocadas, tipos, isolamento do teste sem gerenciar Docker) — abra quando montar a comparação da dimensão banco. → `references/03-db-state-assertions.md`
- **Assertions de estado do cache** (chaves, valores byte a byte, TTL, formato de serialização para coexistência) — abra quando montar a comparação da dimensão cache, especialmente em coexistência com o PHP. → `references/04-cache-state-assertions.md`
- **Assertions de chamadas externas** (quais, em que ordem, com qual payload; idempotência) — abra quando a rota toca a API externa que já contém parte das respostas do usuário. → `references/05-external-api-assertions.md`
- **Harness de teste Go** (estrutura prática detectada no repositório: framework de teste, table-driven, fakes de banco/cache/HTTP) — abra para escrever o esqueleto do teste de paridade ponta a ponta. → `references/06-test-harness-go.md`

## Princípios

- **Comparar comportamento, não intenção.** Golden > BDD para AS-IS. BDD descreve o que **deveria** acontecer; golden registra o que **acontece** — inclusive bugs que o consumidor talvez já dependa.
- **Quatro dimensões, sempre.** Resposta certa com banco/cache/API errados é drift mascarado. Comparar só a resposta é o erro clássico de paridade.
- **Normalizar ruído sem mascarar drift.** Timestamps e IDs voláteis precisam de normalização; valores de negócio e contagem de efeitos, nunca. Cada normalizador é uma decisão explícita, justificada na PR.
- **Reproduzir bugs herdados conscientemente.** Se um quirk do PHP (`php-quirks-capture`) faz a rota retornar `"0"` em vez de `0`, o golden trava esse comportamento. O Go passa o teste por design; melhorar isso é uma decisão de produto, não do migrador.
- **Determinismo é pré-requisito.** Fixtures, relógio, RNG e ordem de iteração precisam ser controlados. Um teste de paridade *flaky* não prova nada.
- **Coexistência byte a byte.** Se o PHP e o Go escrevem na mesma chave de cache, o valor do Go precisa ser idêntico em bytes ao do PHP (mesmo formato, mesma ordem de campos). A reference 04 cobre o detalhe.

## Checklist de auto-verificação

- [ ] Bloco padronizado de `00-go-route-locating.md` produzido e correlacionado com o PHP equivalente?
- [ ] Saídas das três skills do legado consumidas e referenciadas (não só citadas)?
- [ ] Goldens capturados a partir do **legado real**, não a partir do BDD ou de exemplos?
- [ ] As quatro dimensões — resposta, banco, cache, chamadas externas — viraram assertions explícitas?
- [ ] Normalizações listadas em um único local, com justificativa por item, e nenhuma cobrindo valor de negócio?
- [ ] Determinismo confirmado: relógio, RNG, ordem de chaves JSON e ordem de queries fixados?
- [ ] Para coexistência com o legado: valor gravado no cache pelo Go é byte a byte igual ao do PHP (formato + ordem de campos)?
- [ ] Chamadas externas comparadas em **conjunto + ordem + payload**, com idempotência verificada (não duplicar respostas que a API já contém)?
- [ ] Bugs herdados conscientes registrados explicitamente como "AS-IS por decisão", com link para a evidência?
- [ ] Banco e cache de teste isolados **sem gerenciar Docker ativamente** (fakes em processo ou harness do projeto)?
- [ ] Relatório de paridade produzido no formato esperado (matriz dimensão × resultado, evidências, classificação)?

## Formato de saída

Um relatório por rota:

```markdown
# Paridade — <METHOD> <path>

Call graph Go: <link/resumo do 00-go-route-locating>
Goldens versão: <hash/tag>
Saídas legadas consumidas: <links: php-quirks, side-effects, data-contracts>

## Matriz de paridade
| Dimensão           | Resultado      | Diferenças | Classificação           |
|--------------------|----------------|------------|-------------------------|
| Resposta (status)  | igual          | -          | -                       |
| Resposta (corpo)   | diferente      | N campos   | drift / ruído (detalhe) |
| Banco              | igual          | -          | -                       |
| Cache              | diferente      | TTL        | drift                   |
| API externa        | igual          | -          | -                       |

## Diferenças (detalhe)
### <dimensão> — <título>
- Evidência: <trecho de golden vs trecho do Go>
- Classificação: <drift a corrigir | ruído normalizado | bug herdado AS-IS>
- Ação: <PR/commit ou normalizador adicionado, com justificativa>

## Bugs herdados reproduzidos (AS-IS por decisão)
- <comportamento>: link para a decisão e para o trecho do legado que originou

## Normalizadores aplicados
- <campo/padrão>: justificativa
```
