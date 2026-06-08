# 02 — Catálogo de mensagens de erro literais

> Mensagens de erro do PHP frequentemente viraram contrato sem ninguém perceber: um app mobile faz `if (resp.message == "Resposta inválida")`, uma integração casa por substring, um log alerta dispara por regex. Mudar a string quebra esses consumidores em silêncio. Esta reference organiza o catálogo e separa o que é contrato do que é livre.

## Sumário

- [Inventariar as mensagens do legado](#inventariar-as-mensagens-do-legado)
- [Sinais de que uma mensagem é contrato](#sinais-de-que-uma-mensagem-é-contrato)
- [Identificar consumidores que casam por string](#identificar-consumidores-que-casam-por-string)
- [Tradução, i18n e variações por locale](#tradução-i18n-e-variações-por-locale)
- [Como representar mensagens fixas em Go](#como-representar-mensagens-fixas-em-go)
- [Saída esperada](#saída-esperada)

---

## Inventariar as mensagens do legado

Para a rota em análise, capture cada mensagem emitida em caminho de erro:

- Mensagens em `throw new \Exception("...")` e descendentes.
- Mensagens passadas para o handler global (Laravel `report`/`render`, Symfony `Throwable->getMessage()`).
- Strings em arrays de validação (`Validator::make([...], ['field' => 'required'], ['field.required' => '...'])`).
- Strings em `return [..., 'message' => '...']` quando o legado emite 200-com-erro.
- Mensagens **acumuladas** (várias por campo) e mensagens **únicas**.
- Erros de framework por trás de tradução (`__('errors.required')`) — capture a string final emitida no locale efetivo.

Liste cada uma com:

- O texto **exato** (case, pontuação, espaços, acentos).
- O caminho de código que a emite.
- O status HTTP e shape associados (cruzando com `01-status-and-shape.md`).

## Sinais de que uma mensagem é contrato

Trate como contrato (não pode mudar sem decisão explícita) quando:

- Há documentação pública/externa que cita a string.
- O time tem registro de incidentes em que clientes "quebraram porque a mensagem mudou".
- A mensagem inclui um **código** ou prefixo claramente estruturado (`"ERR_AUTH_001: ..."`).
- A mensagem é curta e específica de domínio (`"Resposta inválida"`, `"Usuário já cadastrado"`) — usuários casam por string mais facilmente em strings curtas.
- Ela aparece em logs/alertas com regex.

Trate como livre quando:

- É genérica (`"Erro interno"`, `"Internal Server Error"`) e o status carrega o significado.
- É claramente diagnóstica/técnica (`"Undefined index: foo"`) — clientes não devem casar por isso.
- Inclui partes voláteis (timestamp, PID) que já tornam casamento por igualdade improvável.

Na dúvida, **trate como contrato** até alguém provar o contrário. O custo de manter a string é baixo; o custo de quebrar um cliente é alto.

## Identificar consumidores que casam por string

Procure ativamente:

- Repositórios de apps mobile/web do mesmo time: grep pelo texto exato.
- Documentação interna (Confluence, Notion, README do parceiro).
- Suíte de testes legada do **consumidor** — se você tem acesso.
- Tickets de suporte mencionando a mensagem.
- Logs de alerta/monitoramento (Datadog, Grafana) com regras de regex em mensagens.

Se nada disso for acessível, faça o levantamento por amostragem: ouça oncall e suporte sobre incidentes históricos com mensagens. A ausência de incidente é dado parcial: a mensagem pode ainda ser usada por um cliente silencioso.

## Tradução, i18n e variações por locale

- Se o legado serve várias línguas, capture a mensagem em **cada locale relevante**. O contrato é por idioma — `"Required field"` em EN e `"Campo obrigatório"` em PT-BR são duas strings de contrato.
- O Go precisa replicar o mesmo mecanismo de seleção de locale (header `Accept-Language`, query param, etc.). Confirme onde o legado decide e replique.
- Se a tradução do legado vem de arquivos de mensagens (`lang/pt_BR/errors.php`), considere portar **os mesmos arquivos** (ou um mapa equivalente) para o Go, em vez de re-escrever as strings.

## Como representar mensagens fixas em Go

Padrões:

- **Constantes nomeadas** por caminho de erro:

  ```go
  const (
      MsgValidationFailed = "Dados inválidos"
      MsgNotFound         = "Não encontrado"
      MsgIntegrationFail  = "Falha ao integrar"
  )
  ```

- **Catálogo central** (`internal/errors/messages.go`) — facilita revisão e dificulta mudança acidental.

- **Bundle de i18n** quando o legado usa locale variável. Use o mesmo formato (chave/valor) que o legado, importando os arquivos se possível.

- **Wrap de erro com `errors.New(MsgX)`** — combine com sentinels (ver `04-go-error-translation.md`). O wrap preserva a mensagem visível.

- **Teste de regressão por string**: para cada caminho de erro, adicione um teste que assere a mensagem literal. Quebrar uma string vira falha de teste, não vazamento em produção.

## Saída esperada

```markdown
## Catálogo de mensagens — <METHOD> <path>

### Contrato (não pode mudar sem decisão explícita)
| ID | Mensagem | Caminho | Evidência |
|----|----------|---------|-----------|
| M1 | "Resposta inválida" | validate() em OnboardingController | app mobile v3.x casa por string |
| M2 | "Usuário já cadastrado" | createUser() | doc parceiro X, item 4.3 |

### Livres (podem ser revistas, com cuidado)
| ID | Mensagem | Caminho | Observações |
|----|----------|---------|-------------|
| L1 | "Internal Server Error" | exception handler global | status 500 carrega significado |

### Tradução para Go
- M1, M2 importados como constantes em `internal/errors/messages.go`.
- Teste em `errors_test.go` assere literal de cada constante para evitar mudança acidental.
- Locale: rota serve só PT-BR; arquivo `lang/pt_BR/errors.php` portado para `internal/errors/pt_BR.go`.
```
