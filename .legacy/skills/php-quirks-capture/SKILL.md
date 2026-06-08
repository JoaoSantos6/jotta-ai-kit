---
name: php-quirks-capture
description: >-
  Lê uma rota de um sistema legado em PHP e produz um relatório dos
  comportamentos implícitos da linguagem (type juggling, truthy/falsy, coerção
  string/número, ordem de arrays, datas/timezone, null e warnings silenciosos)
  que divergem em Go, para serem replicados ou conscientemente corrigidos numa
  migração AS-IS. Use SEMPRE que for migrar, portar ou reescrever código PHP
  para Go (ou outra linguagem fortemente tipada), ou quando precisar entender
  por que o comportamento do PHP difere do esperado, mesmo que o pedido não cite
  "quirks" ou "type juggling" explicitamente. Acione antes de escrever o código
  Go da rota, junto do handoff de fluxo de dados.
---

# PHP Quirks Capture

Numa migração AS-IS de PHP para Go, o maior risco não é "não funcionar" — é o **drift silencioso de comportamento**. PHP é fracamente tipado e cheio de coerção implícita; Go é estrito e explícito. Esta skill captura esses comportamentos implícitos da rota legada para que o novo serviço os reproduza de propósito (ou os corrija de propósito), nunca por acidente.

## Quando usar

- Antes de desenvolver a rota equivalente em Go.
- Ao revisar um handoff de fluxo de dados, para anexar os quirks que ele costuma omitir.
- Quando o comportamento observado do legado parece "estranho" e precisa ser explicado.

## Quando NÃO usar

- Para mapear efeitos colaterais (writes, cache, API) → use `side-effects-mapping`.
- Para extrair schema/contratos de dados → use `data-contracts-extraction`.
- Para código que já é fortemente tipado e sem coerção relevante.

## Fluxo de trabalho

1. **Rastreie a rota.** Leia `references/00-route-tracing.md` e produza o call graph + fronteiras de I/O. Sem isso você não sabe quais trechos analisar.
2. **Fixe a versão do PHP** do legado (7.x vs 8.x). Muitos quirks mudam entre versões; toda conclusão depende disso.
3. **Varra o call graph por categoria de quirk.** Para cada arquivo/método, percorra as categorias abaixo e abra a reference correspondente só quando encontrar o padrão. Não leia todas de uma vez.
4. **Para cada quirk, capture o resultado real**, não a regra abstrata: dado o input que a rota realmente recebe, qual o valor/branch/ordem que o PHP produz.
5. **Preencha o template de saída** (abaixo), um por rota.
6. **Rode a auto-verificação** antes de entregar.

## Categorias e index das references

Abra a reference quando a rota apresentar o padrão indicado:

- **Comparações e coerção** (`==`, `===`, `switch`, `in_array`, sort com tipos mistos) → `references/01-type-juggling.md`
- **Condicionais e presença** (`if ($x)`, `empty`, `isset`, `??`, `?:`) → `references/02-truthy-falsy.md`
- **String ↔ número** (aritmética sobre strings, `intval`/casts, dinheiro, IDs grandes, zeros à esquerda) → `references/03-strings-numbers.md`
- **Arrays** (ordem de iteração, chaves, `+` vs `array_merge`, serialização lista/objeto) → `references/04-arrays.md`
- **Datas e fuso** (`strtotime`, `DateTime`, formatos, timezone default, datas no banco) → `references/05-dates-timezones.md`
- **Null e erros silenciosos** (índice/propriedade indefinido, `@`, defaults de parâmetro, `?->`) → `references/06-null-and-warnings.md`
- **Rastreamento da rota** (compartilhada) → `references/00-route-tracing.md`

Cada reference tem sumário no topo; leia só a seção que se aplica ao trecho em mãos.

## Formato de saída

Produza um markdown por rota, sempre com esta estrutura:

```markdown
# Quirks — <METHOD> <path>

Versão do PHP do legado: <7.x | 8.x>
Call graph de referência: <link/resumo do 00-route-tracing>

## Quirks encontrados

### [categoria] — <título curto>
- **Onde**: <arquivo::método, linha aproximada>
- **Trecho**:
  ```php
  <código mínimo que ilustra>
  ```
- **Comportamento PHP** (para os inputs reais): <o que acontece de fato>
- **Equivalente em Go**: <como reproduzir o mesmo resultado>
- **Risco / decisão**: <replicar como AS-IS | comportamento herdado a revisar>

(repita por quirk)

## Quirks NÃO encontrados (verificados)
- <categorias percorridas sem ocorrência, para registrar cobertura>
```

A seção "NÃO encontrados" é importante: ela prova que a categoria foi olhada, não esquecida.

## Princípios

- **Capture resultado, não teoria.** "Para `resposta="0"`, `empty()` retorna true e a rota trata como sem resposta" vale mais que "PHP tem regras de truthy".
- **Não conserte em silêncio.** Quando o legado depende de um bug de coerção, marque como *comportamento herdado* e deixe o time decidir manter ou corrigir. AS-IS significa reproduzir, inclusive bugs, salvo decisão explícita.
- **Versão importa.** PHP 8 endureceu coerções e virou warnings em erros. Reafirme a versão sempre que ela mudar a conclusão.

## Auto-verificação antes de entregar

- [ ] Versão do PHP registrada e considerada nas conclusões?
- [ ] Todas as 6 categorias percorridas (com seção "NÃO encontrados" preenchida)?
- [ ] Cada quirk tem o resultado real para os inputs da rota, não só a regra?
- [ ] Datas: timezone efetivo do ambiente legado identificado?
- [ ] Cada quirk marcado como "replicar" ou "comportamento herdado a revisar"?
- [ ] Equivalente em Go descrito de forma acionável para quem vai desenvolver?
