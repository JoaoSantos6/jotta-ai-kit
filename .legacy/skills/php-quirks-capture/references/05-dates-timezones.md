# 05 — Datas e timezones

> Diferenças de fuso, parsing leniente e timezone default global do PHP geram off-by-one de data e horários divergentes. Crítico em onboarding, onde timestamps de respostas e expiração costumam ser comparados.

## Sumário

- [Timezone default global](#timezone-default-global)
- [`strtotime` e parsing leniente](#strtotime-e-parsing-leniente)
- [`DateTime`, `DateTimeImmutable` e mutação](#datetime-datetimeimmutable-e-mutação)
- [Formatos de saída](#formatos-de-saída)
- [Timestamps Unix e frações](#timestamps-unix-e-frações)
- [Banco: armazenamento e leitura](#banco-armazenamento-e-leitura)
- [Tradução para Go](#tradução-para-go)

---

## Timezone default global

PHP tem um timezone padrão de processo (`date_default_timezone_set`, `date.timezone` no `php.ini`). Toda função de data sem fuso explícito usa ele. Se o legado roda em, por exemplo, `America/Sao_Paulo` e o novo serviço Go assume UTC, todos os horários divergem. **Descubra o timezone efetivo do ambiente legado** (não só o do código) e fixe o mesmo em Go.

## `strtotime` e parsing leniente

`strtotime` aceita formatos ambíguos e relativos: `"2024-01-02"`, `"02/01/2024"` (interpretação m/d vs d/m depende de separador), `"+1 day"`, `"next monday"`. Ele "conserta" entradas inválidas (ex.: dia 32 vira mês seguinte) em vez de falhar. Go (`time.Parse`) exige layout exato e falha em entrada inválida. Para cada `strtotime` na rota, capture o formato real de entrada e o resultado, inclusive como o legado trata entradas malformadas.

## `DateTime`, `DateTimeImmutable` e mutação

- `DateTime` é **mutável**: `$d->modify('+1 day')` altera o objeto. Bugs de aliasing onde duas variáveis apontam o mesmo objeto são parte do comportamento.
- `DateTimeImmutable` retorna novo objeto.
- `DateTime::createFromFormat` com `!` zera campos não informados; sem `!`, herda a hora atual — fonte clássica de diferença.

## Formatos de saída

`date('Y-m-d H:i:s')` e `->format(...)` usam os códigos do PHP, diferentes do layout de referência do Go (`2006-01-02 15:04:05`). Mapeie cada código:

| PHP | Significado | Go |
|-----|-------------|-----|
| `Y` | ano 4 díg. | `2006` |
| `m` | mês 2 díg. | `01` |
| `d` | dia 2 díg. | `02` |
| `H` | hora 24h | `15` |
| `i` | minuto | `04` |
| `s` | segundo | `05` |

## Timestamps Unix e frações

- `time()` retorna segundos (int). `microtime(true)` retorna float com frações.
- Comparações entre timestamp inteiro e `DateTime` podem perder a fração. Se a rota compara expiração de resposta com precisão de segundo, replique a mesma granularidade.

## Banco: armazenamento e leitura

- Colunas `DATETIME` no MySQL não guardam timezone; `TIMESTAMP` converte para UTC na escrita e de volta na leitura conforme o `time_zone` da conexão. Saber qual tipo a tabela usa muda a interpretação.
- A connection do legado pode setar `SET time_zone` — verifique. O driver Go precisa replicar o mesmo `loc`/`time_zone` para ler os mesmos valores.

## Tradução para Go

- Fixe explicitamente a `*time.Location` igual ao timezone efetivo do legado; nunca dependa do default do host.
- Para cada formato, traduza o layout PHP→Go e teste com datas reais (inclusive viradas de mês/ano e horário de verão histórico, se aplicável).
- Decida o comportamento para entrada inválida: o legado "conserta" via `strtotime`; em Go você precisa reproduzir ou sinalizar como comportamento herdado.
- Replique o `time_zone` da conexão de banco no driver Go.
