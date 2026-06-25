# Regras gerais de BDD

> Leia este arquivo SEMPRE, em qualquer tipo de BDD. Ele define o que é um bom
> cenário e o que NUNCA pode aparecer no markdown final.

## Índice
1. O que é BDD (e o que NÃO é)
2. A estrutura DADO / QUANDO / ENTÃO / E
3. Princípios de linguagem natural
4. Nomeando o BDD e os cenários
5. Anti-padrões que invalidam o cenário
6. Checklist rápido de qualidade

---

## 1. O que é BDD (e o que NÃO é)

BDD (Behavior-Driven Development) descreve **comportamento observável** do ponto de
vista de quem usa o sistema. Ele responde "o que o sistema faz e por quê", não "como
o código está implementado".

**BDD ≠ TDD.** Esta é a confusão mais comum e a mais grave. Use a tabela para se situar:

| Aspecto            | BDD (o que queremos)                         | TDD (o que devemos EVITAR aqui)             |
|--------------------|----------------------------------------------|---------------------------------------------|
| Linguagem          | Natural, de negócio                          | Técnica, de implementação                   |
| Foco               | Comportamento e valor                        | Unidade de código / função                  |
| Sujeito da frase   | Usuário, cliente, sistema, ator              | Método, classe, variável, mock              |
| Exemplo de QUANDO  | "QUANDO o cliente confirma o pagamento"      | "QUANDO chamo `processPayment(order)`"      |
| Granularidade      | Fluxo completo de comportamento              | Caso isolado de uma função                  |

Sinais de que você escorregou para TDD (corrija imediatamente): nomes de funções,
classes, mocks, asserts, "deve retornar true", referência a arquivos `.js`/`.py`,
nomes de variáveis internas, cobertura de branches de código.

**A única exceção tecnicamente aceitável** é o BDD de API (ver `template-api.md`):
ali descrevemos como acionar a API e o que se espera no response/status. Ainda
assim, o corpo do cenário continua em linguagem de comportamento; o `curl` entra
apenas como apoio operacional ao fim do cenário, nunca como o cenário em si.

---

## 2. A estrutura DADO / QUANDO / ENTÃO / E

Todo cenário usa exatamente este padrão, com os conectores em **negrito** e maiúsculo:

```
**DADO** <contexto / pré-condição>
**QUANDO** <ação / evento que dispara o comportamento>
**ENTÃO** <resultado observável esperado>
```

Regras de uso:
- **DADO** estabelece o estado inicial (já existe, já está logado, já tem saldo...).
- **QUANDO** é a ação única que dispara o comportamento. Idealmente um só **QUANDO**
  por cenário; se há dois eventos independentes, provavelmente são dois cenários.
- **ENTÃO** descreve o resultado **verificável**. Nada de resultado "invisível".
- **E** encadeia passos adicionais dentro de qualquer um dos três blocos:

```
**DADO** que o cliente possui uma conta ativa
**E** que o saldo é de R$ 100,00
**QUANDO** o cliente solicita um saque de R$ 30,00
**ENTÃO** o saque é aprovado
**E** o novo saldo passa a ser R$ 70,00
```

Use **E** apenas quando agrega informação real. Não infle o cenário com **E**
decorativos.

---

## 3. Princípios de linguagem natural

1. **Tempo presente, voz ativa.** "O cliente recebe o e-mail", não "o e-mail será
   enviado".
2. **Declarativo, não imperativo de UI.** Descreva intenção ("o usuário confirma o
   pedido"), não a mecânica de clique ("o usuário clica no botão azul no canto").
   Exceção: quando o passo de UI é o próprio comportamento sob teste.
3. **Uma asserção observável por ENTÃO.** Se há várias, encadeie com **E**.
4. **Sem ramificações.** Nada de "se... senão" dentro de um cenário. Cada caminho é
   um cenário separado (caminho feliz, caminho de erro, casos de borda).
5. **Linguagem ubíqua.** Use os termos do domínio que o desenvolvedor/documentação
   usou. Não invente sinônimos.
6. **Concreto, não vago.** "ENTÃO o saldo passa a ser R$ 70,00" é melhor que "ENTÃO
   o saldo é atualizado".

---

## 4. Nomeando o BDD e os cenários

Estrutura recomendada do markdown final:

```
# Funcionalidade: <nome da funcionalidade>

> Contexto / objetivo de negócio em 1-3 linhas.

## Cenário: <título curto e descritivo do comportamento>
**DADO** ...
**QUANDO** ...
**ENTÃO** ...
```

- O **título do cenário** descreve o comportamento, não a implementação:
  "Cenário: Saque negado por saldo insuficiente" (bom) vs "Cenário: testa função
  saque" (ruim).
- Cubra, no mínimo: o caminho feliz, ao menos um caminho de erro e os casos de borda
  relevantes que surgirem no planejamento.

---

## 5. Anti-padrões que invalidam o cenário

- Misturar QUANDO e ENTÃO ("QUANDO o saldo fica negativo" — isso é resultado, vai no
  ENTÃO).
- Vários QUANDO independentes no mesmo cenário.
- Detalhes de implementação (nomes de função, tabelas como ator, mocks).
- ENTÃO sem resultado observável.
- Cenário que não consegue ser justificado por um teste de mesa (ver
  `metodologia-prevc.md`, fase Validação).
- No BDD de API: cenário sem `curl` ao final, ou `curl` com variável não explicada.

---

## 6. Checklist rápido de qualidade

Antes de concluir, todo cenário deve passar em:
- [ ] Usa DADO / QUANDO / ENTÃO com conectores em **negrito**.
- [ ] Linguagem natural, sem termos de TDD/implementação.
- [ ] Um QUANDO principal; **E** apenas onde agrega valor.
- [ ] ENTÃO observável e concreto.
- [ ] Título descreve comportamento.
- [ ] Passou no teste de mesa mental.
- [ ] (Se API) tem `curl` ao final e variáveis explicadas.
