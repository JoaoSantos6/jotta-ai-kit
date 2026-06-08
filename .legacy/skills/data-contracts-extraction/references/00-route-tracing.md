# 00 — Rastreamento da rota (call graph)

> **Reference compartilhada.** Este arquivo é idêntico nas skills `php-quirks-capture`, `side-effects-mapping` e `data-contracts-extraction`. O objetivo é localizar o entrypoint da rota no legado PHP e seguir o fluxo até cada fronteira de I/O, produzindo o mapa que as três skills consomem.

## Sumário

- [Quando ler este arquivo](#quando-ler-este-arquivo)
- [Passo 1 — Localizar o entrypoint](#passo-1--localizar-o-entrypoint)
- [Passo 2 — Seguir o call graph](#passo-2--seguir-o-call-graph)
- [Passo 3 — Marcar fronteiras de I/O](#passo-3--marcar-fronteiras-de-io)
- [Passo 4 — Registrar o resultado](#passo-4--registrar-o-resultado)
- [Padrões comuns de frameworks PHP](#padrões-comuns-de-frameworks-php)
- [Armadilhas de rastreamento](#armadilhas-de-rastreamento)

---

## Quando ler este arquivo

Leia no **início** de qualquer uma das três skills, antes de extrair quirks, side-effects ou contratos. Todas dependem de saber exatamente quais arquivos, métodos e fronteiras a rota toca. Pare de ler quando tiver o call graph e a lista de fronteiras de I/O; o resto de cada skill parte daí.

## Passo 1 — Localizar o entrypoint

1. Identifique como a rota é registrada. Procure por:
   - Arquivos de roteamento (`routes/*.php`, `web.php`, `api.php`, tabelas de rotas, arquivos de config de rota).
   - Anotações/atributos no controller (`@Route`, `#[Route(...)]`).
   - Roteadores legados baseados em `$_GET['action']`, `switch`/`if` gigantes, ou `include` dinâmico por path.
2. Mapeie o método HTTP + path → classe/método (ou arquivo) que atende.
3. Anote middlewares, filtros e hooks que rodam **antes** do handler (auth, validação global, rate limit). Eles fazem parte do comportamento AS-IS.

Comandos úteis (ajuste ao layout do projeto):

```bash
# achar onde o path é declarado
grep -rn "onboarding" --include=*.php app/ routes/ config/
# achar o controller/método
grep -rn "function .*[Oo]nboarding" --include=*.php
```

## Passo 2 — Seguir o call graph

A partir do método handler, siga **cada chamada** até o fim:

- Métodos do próprio controller.
- Services, repositories, models, helpers, traits.
- Funções globais e estáticas (fáceis de perder de vista).
- Closures e callbacks passados adiante.
- Código disparado por eventos/observers/listeners (ver também a reference de eventos na skill de side-effects).

Construa uma árvore. Para cada nó registre: arquivo, classe::método, e o que ele recebe/retorna. Pare de descer quando chegar a:

- Uma fronteira de I/O (banco, cache, HTTP externo, fila, log, filesystem).
- Código puro sem efeito (cálculo/transformação) — anote, mas não precisa aprofundar.

## Passo 3 — Marcar fronteiras de I/O

Toda chamada que cruza o processo é uma **fronteira**. Marque cada uma com seu tipo:

| Tipo | Sinais no código PHP |
|------|----------------------|
| Banco (leitura) | `SELECT`, `->find()`, `->get()`, query builder, `fetchAll` |
| Banco (escrita) | `INSERT/UPDATE/DELETE`, `->save()`, `->create()`, `->update()` |
| Cache | `Cache::`, `$redis->`, `$memcached->`, `apcu_*` |
| HTTP externo | `curl_*`, `Guzzle`, `Http::`, `file_get_contents("http...")` |
| Fila / evento | `dispatch(`, `->push(`, `event(`, `publish(` |
| Log | `Log::`, `error_log`, `monolog`, `syslog` |
| Filesystem | `fopen`, `file_put_contents`, `Storage::` |

Cada fronteira vira entrada na skill correspondente.

## Passo 4 — Registrar o resultado

Produza um bloco padronizado que as três skills reutilizam:

```markdown
## Call graph — <METHOD> <path>

Entrypoint: <arquivo>::<método>
Middlewares/hooks antes do handler: <lista ou "nenhum">

Árvore de chamadas (resumida):
- Controller::handle
  - Service::process
    - Repository::save        [I/O: banco-escrita]
    - Cache::forget(key)       [I/O: cache]
  - ExternalClient::send       [I/O: http-externo]
  - Log::info(...)             [I/O: log]

Fronteiras de I/O encontradas:
1. banco-escrita — Repository::save — tabela X
2. cache — Cache::forget — chave Y
3. http-externo — ExternalClient::send — endpoint Z
4. log — Log::info
```

Salve esse bloco; cada skill o referencia em vez de re-rastrear.

## Padrões comuns de frameworks PHP

- **Laravel**: rotas em `routes/`, controllers em `app/Http/Controllers`, model events (`saving`, `saved`), observers, jobs e `dispatch`. Cuidado com lógica em accessors/mutators e em `boot()` de models.
- **Symfony**: rotas por atributo/YAML, controllers como serviços, event subscribers, e o `kernel.terminate` (efeitos pós-resposta).
- **CodeIgniter/legado caseiro**: roteamento por convenção `controller/method`, muito código em helpers globais e em `MY_Controller`. Verifique hooks (`pre_controller`, `post_controller`).
- **Sem framework**: front controller com `switch`, `require` por path, e estado global em `$_SESSION`/`$GLOBALS`.

## Armadilhas de rastreamento

- **Efeitos pós-resposta**: PHP pode rodar código depois de enviar a resposta (`fastcgi_finish_request`, `register_shutdown_function`, `kernel.terminate`). Não os perca — em Go isso vira goroutine/defer explícito.
- **Mágica de framework**: model events, observers e middlewares disparam I/O sem chamada visível no handler. Procure-os ativamente.
- **Estado global**: `$_SESSION`, `$GLOBALS`, singletons e static properties carregam estado entre chamadas dentro do request.
- **Branches que escondem fronteiras**: um `if` raramente percorrido pode conter o único `DELETE` da rota. Percorra todos os branches, não só o caminho feliz.
