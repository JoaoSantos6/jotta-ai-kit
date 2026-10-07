# Matchers

Matchers verificam **tipo e formato**, não valor exato. O valor de exemplo passado ao
matcher é usado no mock do consumidor e serve de documentação.

## Qual usar

| Matcher | Use quando | Exemplo de campo |
|---------|-----------|------------------|
| `like(x)` / `type` | O consumidor só precisa do tipo | `nomeCliente`, objetos aninhados |
| `integer(n)` | Inteiro, e o consumidor depende disso | `prazoMeses`, `quantidadeParcelas` |
| `decimal(n)` | Número com casas decimais | `valorParcela`, `taxaJuros` |
| `regex(padrão, exemplo)` | Formato textual fixo | datas ISO-8601, UUID, CPF mascarado |
| `eachLike(item, min)` | Lista de tamanho variável | perguntas por parceiro ou produto, ofertas |
| `datetime`/`timestamp(formato, exemplo)` | Data/hora com formato definido | `criadoEm` |
| Valor exato | O valor faz parte do contrato | `status` (enum), código HTTP, `tipoEvento`, `versaoSchema` |

## Regras

- **Enum**: use `regex("^(APROVADO|NEGADO|PENDENTE)$", "APROVADO")` com os valores que o
  consumidor **trata**. Se o consumidor tem `default` para valores desconhecidos, prefira
  `like` + um teste funcional no consumidor.
- **Dinheiro**: `decimal`. Se o provedor serializa dinheiro como string, use `regex` com o
  formato real. Não troque o tipo no contrato para "facilitar".
- **IDs**: `regex` de UUID ou `like` com exemplo realista. Nunca valor exato de id gerado.
- **Datas**: `regex`/`datetime` com o formato que o consumidor parseia.
- **Listas**: `eachLike(item, min=1)` quando o consumidor assume ao menos um item. Se o
  consumidor também trata lista vazia, crie outra interação com outro `given` e lista vazia.
- **Campos opcionais**: Pact não tem "campo opcional". Se o consumidor trata presença e
  ausência de forma diferente, crie duas interações (dois `given`).
- **Headers**: inclua só os headers que o consumidor lê (por exemplo `Content-Type`).
  Para `Authorization` na requisição, use `regex` com o formato, nunca um token real.

## Armadilhas

- `like` no objeto raiz com dezenas de campos copiados da resposta real → contrato inchado.
  Volte ao passo 2 da skill e mantenha só os campos usados.
- Matcher em valor que é regra de negócio (taxa, aprovação) **não** é oráculo de negócio:
  o contrato está certo em usar matcher, e o valor vai para o `qa-oraculo`.
- Trocar valor exato por matcher para fazer a verificação passar é afrouxar o contrato.
  É proibido sem a confirmação de que o consumidor aceita qualquer valor.
