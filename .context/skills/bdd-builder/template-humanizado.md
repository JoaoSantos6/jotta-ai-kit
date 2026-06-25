# Template — BDD humanizado

> Leia este arquivo SOMENTE quando o BDD descrever comportamento de negócio/usuário
> (sem foco em acionar um endpoint). Para consumo de API com response/status, use
> `template-api.md`. As regras de `regras-gerais-bdd.md` continuam valendo.

## Índice
1. Quando usar este template
2. Anatomia do cenário humanizado
3. Boas práticas de linguagem
4. Exemplo completo

---

## 1. Quando usar este template

Use quando o comportamento for descrito do ponto de vista de uma pessoa ou regra de
negócio: jornadas de usuário, regras de elegibilidade, fluxos de uma tela, políticas,
decisões do sistema percebidas pelo usuário. Aqui **não** há `curl` — o cenário é
puramente de comportamento, em linguagem o mais natural possível.

---

## 2. Anatomia do cenário humanizado

```
## Cenário: <comportamento descrito>
**DADO** <contexto do mundo / estado do ator>
**QUANDO** <o ator realiza uma ação>
**ENTÃO** <o resultado que o ator percebe>
```

- O sujeito é uma pessoa ou ator de negócio (cliente, gerente, sistema visto de
  fora), nunca um componente técnico.
- O **ENTÃO** descreve algo perceptível pelo ator (uma mensagem, um acesso liberado,
  um e-mail recebido, um valor atualizado).

---

## 3. Boas práticas de linguagem

1. Escreva como você explicaria a regra para uma pessoa de negócio.
2. Tempo presente, voz ativa, sujeito humano: "O cliente vê a confirmação".
3. Evite jargão técnico e detalhes de UI mecânica, salvo quando o passo de interface
   é o próprio comportamento.
4. Use os termos do domínio exatamente como aparecem na documentação/handoff.
5. Um cenário por caminho: feliz, erro, borda.

---

## 4. Exemplo completo

```markdown
# Funcionalidade: Elegibilidade para frete grátis

> Clientes com pedidos acima de um valor mínimo recebem frete grátis. Clientes do
> plano Premium recebem frete grátis sem valor mínimo.

## Cenário: Frete grátis por valor mínimo atingido
**DADO** que o cliente possui itens somando R$ 200,00 no carrinho
**E** que o valor mínimo para frete grátis é R$ 150,00
**QUANDO** o cliente avança para o resumo do pedido
**ENTÃO** o cliente vê o frete como "Grátis"

## Cenário: Frete cobrado por valor abaixo do mínimo
**DADO** que o cliente possui itens somando R$ 90,00 no carrinho
**E** que o valor mínimo para frete grátis é R$ 150,00
**QUANDO** o cliente avança para o resumo do pedido
**ENTÃO** o cliente vê o valor do frete calculado normalmente

## Cenário: Frete grátis para cliente Premium
**DADO** que o cliente é do plano Premium
**E** que possui itens somando R$ 30,00 no carrinho
**QUANDO** o cliente avança para o resumo do pedido
**ENTÃO** o cliente vê o frete como "Grátis"
**E** vê a indicação de que o benefício vem do plano Premium
```
