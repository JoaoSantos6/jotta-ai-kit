# Hierarquia de oráculos

Um **oráculo** é o mecanismo que decide se o comportamento observado está correto.
Um teste sem oráculo forte só executa código.

## Níveis (do mais fraco ao mais forte)

| Nível | Nome | O que verifica | Exemplo no domínio de crédito (forma) |
|-------|------|----------------|----------------------------------------|
| — | Implícito | Não travou, não lançou exceção | Chamar a simulação e não checar nada |
| C1 | Sanidade | Não nulo, tipo correto | `oferta != nil` |
| C2 | Propriedade | O campo existe, o valor pertence a um conjunto | `status ∈ {APROVADO, NEGADO, PENDENTE}` |
| C3 | Relacional | Limite, faixa, relação entre valores, exceção específica | `parcela > 0`; `valorTotal >= valorSolicitado`; erro `PERGUNTA_OBRIGATORIA_SEM_RESPOSTA` |
| C4 | Exato | Valor ou estrutura exata, derivada de uma especificação | `parcela == <valor da tabela do critério de aceite>` |
| — | Metamórfico | Relação entre saídas de entradas relacionadas | `parcela(valor=2x) >= parcela(valor=x)`, mantidas as outras condições |

Os valores e as relações da coluna de exemplo mostram a **forma** do oráculo. Antes de
usar qualquer um como oráculo real, confirme com a fonte de autoridade ou com o dev.

### Regressão (marcação, não nível)

Um oráculo de qualquer nível cujo valor veio do **comportamento atual do código** é um
oráculo de regressão. Ele detecta mudança, não erro. Marque assim no teste e no relatório:

- comentário no teste: `// oráculo de regressão: valor capturado do código em <data>, sem fonte`;
- coluna "Tipo" da tabela: `C4 (regressão)`.

## Fonte de autoridade (ordem de preferência)

1. Requisito ou critério de aceite
2. Regra de negócio documentada
3. Contrato de API
4. Especificação do parceiro
5. Comportamento atual do código → oráculo de regressão

Um oráculo vale pela fonte de onde veio. C4 de regressão protege menos que um C3 derivado
do requisito.

## Como subir de nível

| Situação | Caminho |
|----------|---------|
| Só C1 (`not None`) | Pergunte quais campos o negócio usa e que valores são válidos → C2 |
| C2 em valor numérico | Busque limites e relações na fonte (mínimo, máximo, soma, ordem) → C3 |
| Existe tabela, exemplo ou fórmula na fonte | Use o valor exato → C4 |
| Não existe valor exato nem fórmula | Proponha relação metamórfica e peça confirmação |
| Erro esperado | Verifique o tipo, código ou mensagem específica, não "algum erro" → C3 |
| Lista (perguntas, ofertas) | Verifique tamanho esperado, unicidade, ordem e pertencimento, não só "não vazia" |

## Relações metamórficas: como propor

1. Escolha uma entrada `x` e uma transformação `T` (dobrar o valor, aumentar o prazo,
   reordenar as respostas, repetir a requisição).
2. Declare a relação esperada entre `f(x)` e `f(T(x))` (`>=`, `==`, "mesmo id", "um único registro").
3. Fixe todas as outras condições (cliente, parceiro, data, taxa).
4. **Peça confirmação ao dev**: "A relação R vale para este fluxo?". Só use depois do sim.
5. Teste com vários pares `(x, T(x))`, incluindo os pontos de limite.

## LLM como juiz

Quando a verificação usar um LLM (por exemplo, avaliar um texto gerado), a resposta do LLM
é **conselho**. O teste precisa de pelo menos uma checagem determinística associada
(campo obrigatório presente, valor dentro da faixa, ausência de termo proibido).
O assert final é sempre determinístico.

## Checagem por mutação

Para um assert ser considerado forte, uma mutação plausível precisa fazê-lo falhar:

| Mutação | Oráculo que pega |
|---------|------------------|
| `>` → `>=` no limite | C3 com caso exatamente no limite |
| Arredondamento invertido | C4 com valor de referência |
| Campo omitido da resposta | C2 com presença do campo |
| Ramo de erro devolvendo sucesso vazio | C3 com o erro específico |
| Idempotência quebrada | Metamórfico "repetir não duplica" |
