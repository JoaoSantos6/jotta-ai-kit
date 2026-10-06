---
name: qa-oraculo
description: "Use ao criar, corrigir ou revisar testes, ou ao mudar regras de negócio: garante asserts derivados do comportamento esperado, e não do código atual."
---

# qa-oraculo

Garanta que todo teste criado ou alterado tenha um **oráculo forte**: um assert que
decide se o comportamento está correto, derivado do comportamento **esperado**
(requisito, regra de negócio, contrato), e não do que o código faz hoje.

Princípio: o que falta nos testes gerados por agentes são oráculos melhores, não mais
testes. Prefira poucos testes com asserts fortes a muitos testes com asserts fracos.

Antes de executar comandos, consulte `.context/rules/`.

## Quando ler as referências

- `references/hierarquia-oraculos.md`: no passo 3, para classificar e subir o nível do oráculo.
- `references/regras-credito.md`: no passo 1, sempre. Só use regras que estejam lá ou numa fonte citada.
- `references/exemplos-antes-depois.md`: ao reescrever teste fraco ou ao revisar testes existentes.

## Procedimento

Siga na ordem. Não pule passos.

### 1. Encontrar a fonte de autoridade ANTES de ler a implementação

Não abra o código sob teste antes de terminar este passo. Assim você evita copiar o
comportamento atual (inclusive bugs) para o assert.

Procure, nesta ordem de preferência:

1. critério de aceite ou história (ticket, descrição do PR, pedido do dev no chat);
2. regra de negócio documentada (`references/regras-credito.md`, docs do repositório, BDD existente);
3. contrato de API (OpenAPI, Pact, schema de evento);
4. especificação do parceiro de crédito;
5. comportamento atual do código: só como último recurso. Gera **oráculo de regressão**.

Registre a fonte usada para cada comportamento. Se não houver nenhuma das fontes 1 a 4:

- diga isso explicitamente;
- pergunte ao dev qual é o comportamento esperado; ou
- marque o oráculo como `regressão` (só detecta mudança, não erro) e liste como pendência.

### 2. Listar os comportamentos esperados

Escreva em linguagem de negócio, sem nomes de função. Inclua as bordas que se aplicam:

- valores-limite (mínimo, máximo, exatamente no limite, um centavo acima e abaixo);
- cliente sem oferta ou não elegível;
- parceiro de crédito indisponível, com erro ou com timeout;
- pergunta obrigatória (por parceiro ou por produto) sem resposta;
- entrada inválida (nula, negativa, formato errado);
- idempotência: o mesmo pedido enviado duas vezes;
- concorrência ou reprocessamento de evento, quando houver consumidor de fila.

Não invente o resultado esperado de uma borda. Se a fonte não disser, pergunte.

### 3. Escolher o oráculo mais forte possível

Para cada comportamento, escolha o nível mais alto da hierarquia:
Implícito < C1 Sanidade < C2 Propriedade < C3 Relacional < C4 Exato, com o Metamórfico
como alternativa quando não há valor exato conhecido. Ver `references/hierarquia-oraculos.md`.

Quando não for possível chegar a C3 ou C4, escreva em uma linha o porquê
(por exemplo: "sem fórmula documentada da parcela; usado metamórfico").

### 4. Converter observação em verificação

- Todo `print`, `console.log`, `fmt.Println`, `var_dump`, `log` usado para inspecionar
  valor vira `assert` ou é removido.
- Um teste sem nenhum assert que verifique comportamento é **inválido**. Não entregue.
- `assert not None` ou checagem de tipo sozinha em resultado de negócio não basta.
- Erros esperados são verificados pelo **tipo ou código específico**, não por "lançou algo".

### 5. Buscar relações metamórficas e de propriedade

Quando não houver valor exato, proponha relações. Exemplos de *forma* (cada uma precisa
de confirmação):

- aumentar o valor solicitado, mantidas as outras condições, não diminui a parcela;
- aumentar o prazo, mantidas as outras condições, não aumenta a parcela;
- reenviar o mesmo pedido não cria um segundo pedido;
- a ordem das perguntas respondidas não muda a elegibilidade.

**Peça ao dev para confirmar cada relação antes de usá-la como oráculo.** Relação não
confirmada fica em "Pendências", não no teste.

### 6. Checar se o oráculo detecta o erro

Para cada assert importante, descreva uma mutação plausível no código e confirme que o
teste falharia. Exemplos:

- trocar `>` por `>=` no limite de valor;
- arredondar para baixo em vez de para cima;
- ignorar a pergunta obrigatória do parceiro;
- devolver lista vazia em vez de erro quando o parceiro cai.

Se o repositório tiver ferramenta de mutation testing configurada (procure no arquivo de
build e na CI), rode-a no escopo do teste. Se não tiver, faça a análise manual e registre-a.
Se a mutação sobreviver, fortaleça o assert.

### 7. Nunca ajustar o assert para fazer o teste passar

Quando um teste falhar:

1. releia a fonte de autoridade do comportamento;
2. se a fonte confirma o valor do teste → **o bug é no código**. Reporte. Não altere o teste;
3. se a fonte confirma o valor do código → corrija o teste e cite a fonte no relatório;
4. se não houver fonte → **pare e pergunte** ao dev. Não escolha um lado.

Também é proibido: remover o teste, marcá-lo como skip, trocar o assert por um mais fraco
ou trocar valor exato por matcher genérico só para passar.

### 8. Gerar a tabela de oráculos

Inclua no Relatório de QA (formato definido na skill `qa`):

```
| Comportamento | Fonte de autoridade | Tipo (C1–C4, metamórfico, regressão) | Assert |
|---------------|---------------------|--------------------------------------|--------|
```

Mais as mutações verificadas no passo 6 e as relações pendentes de confirmação.

## Anti-padrões a detectar em testes existentes

Ao revisar ou tocar um arquivo de teste, aponte estes casos, com arquivo e linha:

| Anti-padrão | Por que é ruim |
|-------------|----------------|
| Teste sem assert, ou só com `print` | Só executa código, não verifica nada |
| Só `assert not None` / tipo em resultado de negócio | Oráculo C1 onde a regra exige C3 ou C4 |
| Assert copiado da saída atual, sem fonte | Oráculo de regressão disfarçado: congela bugs |
| Snapshot gigante como oráculo de regra de negócio | Não diz qual valor importa. Qualquer mudança vira "atualizar snapshot" |
| `try/except` (`catch`, `recover`) que engole a falha | O teste passa mesmo quando o código quebra |
| Mock que devolve exatamente o valor que o assert espera | Teste tautológico: testa o mock, não o código |
| LLM como juiz sem checagem determinística | É conselho, não oráculo. A decisão final precisa de assert determinístico |
| Erro verificado como "qualquer exceção" | Passa por motivo errado |

Para cada anti-padrão encontrado, proponha a reescrita (ver `references/exemplos-antes-depois.md`).
Só reescreva testes fora do escopo do pedido se o dev autorizar. Fora isso, liste no relatório.

## Agnóstico à linguagem

Detecte a linguagem e o framework de teste do repositório (`go.mod`, `pyproject.toml`,
`requirements*.txt`, `composer.json`, `package.json`, testes existentes). Escreva os testes
no padrão já usado ali: nomes, pastas, helpers e biblioteca de assert. Não introduza
framework novo sem pedir.
