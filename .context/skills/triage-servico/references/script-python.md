# Script Python — triage_runner.py

Template do motor de consultas da skill `triage-servico`. Nome fixo definido em `config.md`
(**NOME_SCRIPT**), sempre na raiz do repositório.

## Compatibilidade

Compatível com Python 3.8+. Usa **somente a biblioteca padrão** (`subprocess`, `json`,
`argparse`, `re`, `time`). Não precisa de `jq`: o parse do JSON do pup é feito no script.

## Natureza do script

1. O nome do arquivo **nunca muda** — sempre o valor de NOME_SCRIPT.
2. Se o arquivo já existir, **sobrescreva** com o template abaixo, sem editar a lógica.
   Ajustes de comportamento vão em `config.md` e entram como argumentos.
3. Todo comando pup roda com `--read-only --no-agent --output json`.
4. O stdout é **um único JSON compacto** com números já calculados — nunca payload bruto.
5. Consulta que falha entra em `falhas` (`{consulta, erro}`) e as demais seguem. Exit code
   `0` = triage concluída (mesmo com falhas parciais), `1` = argumento inválido.
6. A variável de ambiente `PUP_BIN` permite apontar outro binário (ex.: um mock em teste).

## Campos do JSON de saída

| Campo | Conteúdo |
|-------|----------|
| `operacao` | span name APM usado (`null` = não encontrado) |
| `janelas.atual` / `1h_antes` / `24h_antes` | `hits`, `rps`, `erro_pct`, `5xx_pct`, `p50`, `p95`, `p99` (ms) |
| `variacao_rps_pct` | variação de req/s vs 1h e vs 24h |
| `logs` | `facet` usado, `total_erros`, `top` (≤ 5 `{padrao, count}`) |
| `monitores` | `alert`/`warn` (`{id, nome}`), `no_data`, `total` |
| `versao` | `atual`, `anterior`, `mudou_ha_min`, `obs` — ou `sem_tag_version: true` (há tráfego sem a tag) / `sem_dados: true` (sem tráfego em 24h) |
| `deploys` | até 5 eventos `{titulo, quando}` (`null` = consulta falhou) |
| `tags.obs` | observações sobre tags `service`/`env`/`version` ausentes |
| `sinais` | limiares ultrapassados, em texto |
| `veredito_sugerido` | `saudável` \| `degradado` \| `incidente` \| `indeterminado` |
| `falhas` | consultas que falharam e o motivo (rate limit, permissão, timeout...) |

## Template

```python
#!/usr/bin/env python3
"""triage_runner.py — script descartável da skill triage-servico. Não commitar.

Executa consultas SOMENTE-LEITURA no Datadog via pup CLI e imprime um JSON
resumido (sem dados brutos) para a LLM interpretar.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time

PUP = os.environ.get("PUP_BIN", "pup")
# --read-only bloqueia qualquer escrita; --no-agent garante payload cru
# (sem o envelope {status,data,metadata}) independente de quem roda.
PUP_BASE = [PUP, "--read-only", "--no-agent", "--output", "json"]
JANELA_MAX_S = 24 * 3600

falhas = []


def pup(nome, args, timeout):
    """Roda um comando pup. Retorna o JSON parseado ou None (e registra a falha)."""
    try:
        proc = subprocess.run(PUP_BASE + args, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        falhas.append({"consulta": nome, "erro": "pup não encontrado no PATH"})
        return None
    except subprocess.TimeoutExpired:
        falhas.append({"consulta": nome, "erro": f"timeout ({timeout}s)"})
        return None
    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout).strip().splitlines()
        msg = msg[0][:200] if msg else f"exit {proc.returncode}"
        falhas.append({"consulta": nome, "erro": classificar_erro(msg)})
        return None
    saida = proc.stdout.strip()
    if not saida:
        return []  # ex.: monitors list sem resultado imprime só no stderr
    try:
        data = json.loads(saida)
    except json.JSONDecodeError:
        falhas.append({"consulta": nome, "erro": "saída não é JSON"})
        return None
    # Defesa: se o envelope do modo agente vier mesmo assim, desembrulha.
    if isinstance(data, dict) and "status" in data and "metadata" in data and "data" in data:
        data = data["data"]
    return data


def classificar_erro(msg):
    m = msg.lower()
    if "429" in m or "rate limit" in m:
        return f"rate limit: {msg}"
    if "403" in m or "forbidden" in m:
        return f"permissão negada: {msg}"
    if "401" in m or "unauthorized" in m or "authentication" in m:
        return f"não autenticado (rode 'pup auth login'): {msg}"
    return msg


def janela_segundos(txt):
    m = re.fullmatch(r"(\d+)\s*(m|min|h)", txt.strip().lower())
    if not m:
        raise ValueError(f"janela inválida: {txt!r} (use ex.: 15m, 30m, 1h)")
    n = int(m.group(1))
    return n * 3600 if m.group(2) == "h" else n * 60


# ---------- métricas ----------

def pontos(serie):
    return [p[1] for p in serie.get("pointlist") or [] if p and len(p) > 1 and p[1] is not None]


def soma(serie):
    return sum(pontos(serie)) if serie else None


def media(serie):
    v = pontos(serie) if serie else []
    return sum(v) / len(v) if v else None


def consultar_janela(nome, op, escopo, ini, fim, timeout):
    """Uma única chamada v1 com várias queries; mapeia séries por query_index."""
    queries = [
        f"sum:trace.{op}.hits{{{escopo}}}.as_count()",
        f"sum:trace.{op}.errors{{{escopo}}}.as_count()",
        f"sum:trace.{op}.hits.by_http_status{{{escopo},http.status_class:5xx}}.as_count()",
        f"p50:trace.{op}{{{escopo}}}",
        f"p95:trace.{op}{{{escopo}}}",
        f"p99:trace.{op}{{{escopo}}}",
    ]
    data = pup(nome, ["metrics", "query", "--query", ", ".join(queries),
                      "--from", str(ini), "--to", str(fim)], timeout)
    if data is None:
        return None
    por_idx = {}
    for s in (data.get("series") or []) if isinstance(data, dict) else []:
        idx = s.get("query_index")
        if idx is None:  # fallback: casa pela expressão
            expr = s.get("expression") or ""
            idx = next((i for i, q in enumerate(queries) if q.split("{")[0] in expr), None)
        if idx is not None and idx not in por_idx:
            por_idx[idx] = s
    hits = soma(por_idx.get(0)) or 0.0
    erros = soma(por_idx.get(1)) or 0.0
    h5xx = soma(por_idx.get(2)) or 0.0
    ms = lambda i: None if media(por_idx.get(i)) is None else round(media(por_idx.get(i)) * 1000, 1)
    return {
        "hits": hits,
        "rps": round(hits / (fim - ini), 1),
        "erro_pct": round(100 * erros / hits, 2) if hits else None,
        "5xx_pct": round(100 * h5xx / hits, 2) if hits else None,
        "p50": ms(3), "p95": ms(4), "p99": ms(5),
    }


def variacao(atual, base):
    if atual is None or not base:
        return None
    return round(100 * (atual - base) / base, 1)


# ---------- consultas individuais ----------

def descobrir_operacao(servico, env, agora, timeout):
    data = pup("apm operações", ["apm", "services", "operations", "--service", servico,
                                 "--env", env, "--from", str(agora - 3600), "--to", str(agora),
                                 "--primary-only"], timeout)
    if data is None:
        return None
    itens = data
    if isinstance(data, dict):  # formato não documentado: pega a 1ª lista do payload
        itens = next((v for v in data.values() if isinstance(v, list)), [])
    for it in itens or []:
        if isinstance(it, str):
            return it
        if isinstance(it, dict):
            nome = it.get("name") or it.get("operation_name") or it.get("operation")
            if nome:
                return nome
    return None


def envs_do_servico(op, servico, ini, fim, timeout):
    data = pup("tags env", ["metrics", "query", "--query",
                            f"sum:trace.{op}.hits{{service:{servico}}} by {{env}}.as_count()",
                            "--from", str(ini), "--to", str(fim)], timeout)
    if not isinstance(data, dict):
        return None
    envs = []
    for s in data.get("series") or []:
        for t in s.get("tag_set") or []:
            if t.startswith("env:"):
                envs.append(t[4:])
    return sorted(set(envs))


def versao(op, escopo, agora, timeout):
    ini = agora - JANELA_MAX_S
    data = pup("versão", ["metrics", "query", "--query",
                          f"sum:trace.{op}.hits{{{escopo}}} by {{version}}.as_count()",
                          "--from", str(ini), "--to", str(agora)], timeout)
    if not isinstance(data, dict):
        return None
    versoes = []
    for s in data.get("series") or []:
        tag = next((t[8:] for t in s.get("tag_set") or [] if t.startswith("version:")), None)
        ts = [p[0] / 1000 for p in s.get("pointlist") or [] if p and p[1]]
        if ts:
            versoes.append({"v": tag, "primeiro": min(ts), "ultimo": max(ts)})
    if not versoes:
        return {"sem_dados": True}
    if all(v["v"] in (None, "N/A", "") for v in versoes):
        return {"sem_tag_version": True}
    versoes = [v for v in versoes if v["v"] not in (None, "N/A", "")]
    atual = max(versoes, key=lambda v: (v["ultimo"], v["primeiro"]))
    anteriores = [v for v in versoes if v is not atual]
    anterior = max(anteriores, key=lambda v: v["ultimo"])["v"] if anteriores else None
    # 1º ponto no início da janela = versão já existia antes das 24h consultadas
    antiga = atual["primeiro"] - ini < 600
    return {
        "atual": atual["v"],
        "anterior": anterior,
        "mudou_ha_min": None if antiga else round((agora - atual["primeiro"]) / 60),
        "obs": "versão atual está no ar há mais de 24h" if antiga else None,
        "versoes_24h": len(versoes),
    }


def top_erros_logs(servico, env, ini, fim, facets, timeout):
    q = f"service:{servico} env:{env} status:error"
    base = ["logs", "aggregate", "--query", q, "--from", str(ini), "--to", str(fim),
            "--compute", "count"]
    total_data = pup("logs total erros", base, timeout)
    total = None
    if isinstance(total_data, dict):
        b = (total_data.get("data") or {}).get("buckets") or []
        total = int(next(iter((b[0].get("computes") or {}).values()), 0)) if b else 0
    for facet in facets:
        data = pup(f"logs top erros ({facet})",
                   base + ["--group-by", facet, "--limit", "5", "--sort", "count"], timeout)
        if data is None:
            break  # falhou (rate limit/permissão): não insiste nos outros facets
        if not isinstance(data, dict):
            continue
        top = []
        for b in (data.get("data") or {}).get("buckets") or []:
            valor = (b.get("by") or {}).get(facet)
            n = next(iter((b.get("computes") or {}).values()), 0)
            if valor not in (None, "", "N/A"):
                top.append({"padrao": str(valor)[:120], "count": int(n)})
        if top:
            return {"facet": facet, "total_erros": total, "top": top[:5]}
    return {"facet": None, "total_erros": total, "top": []}


def monitores(servico, env, timeout):
    data = pup("monitores", ["monitors", "list", "--tags", f"service:{servico}",
                             "--limit", "100"], timeout)
    if data is None:
        return None
    res = {"alert": [], "warn": [], "no_data": 0, "total": 0}
    for m in data if isinstance(data, list) else []:
        tags = m.get("tags") or []
        env_tags = [t[4:] for t in tags if t.startswith("env:")]
        if env_tags and env not in env_tags:
            continue
        res["total"] += 1
        estado = (m.get("overall_state") or "").lower()
        item = {"id": m.get("id"), "nome": (m.get("name") or "")[:90]}
        if estado == "alert":
            res["alert"].append(item)
        elif estado == "warn":
            res["warn"].append(item)
        elif estado == "no data":
            res["no_data"] += 1
    return res


def eventos_deploy(query, agora, timeout):
    data = pup("eventos de deploy", ["events", "search", "--query", query,
                                     "--from", str(agora - JANELA_MAX_S), "--to", str(agora),
                                     "--limit", "5"], timeout)
    if not isinstance(data, dict):
        return None
    out = []
    for e in data.get("data") or []:
        a = e.get("attributes") or {}
        inner = a.get("attributes") or {}
        out.append({"titulo": str(inner.get("title") or a.get("message") or "")[:100],
                    "quando": a.get("timestamp") or inner.get("timestamp")})
    return out


# ---------- veredito ----------

def avaliar(r, a):
    sinais = []
    atual, b1h, b24h = r["janelas"].get("atual"), r["janelas"].get("1h_antes"), r["janelas"].get("24h_antes")
    if atual:
        base = b1h or b24h
        if atual["hits"] < a.min_req:
            sinais.append(f"baixo volume ({int(atual['hits'])} req na janela): baixa confiança")
        if atual["erro_pct"] is not None and atual["erro_pct"] > a.erro_max:
            sinais.append(f"erro {atual['erro_pct']}% > {a.erro_max}%")
        if base and atual["p99"] and base["p99"] and atual["p99"] > a.p99_fator * base["p99"]:
            sinais.append(f"p99 {atual['p99']}ms > {a.p99_fator}x baseline ({base['p99']}ms)")
        quedas = [variacao(atual["rps"], b["rps"]) for b in (b1h, b24h) if b and b["rps"]]
        if quedas and all(q is not None and q < -a.queda_rps for q in quedas):
            sinais.append(f"throughput caiu {min(quedas)}% (> {a.queda_rps}%)")
        if base and base["hits"] >= a.min_req and atual["hits"] == 0:
            sinais.append("throughput zerado")
    mon = r.get("monitores") or {}
    v = r.get("versao") or {}
    if v.get("mudou_ha_min") is not None and v["mudou_ha_min"] <= a.deploy_recente:
        sinais.append(f"deploy recente: {v.get('anterior')} -> {v.get('atual')} há {v['mudou_ha_min']}min")

    quebras = [s for s in sinais if not s.startswith(("baixo volume", "deploy recente"))]
    erro = (atual or {}).get("erro_pct") or 0
    sem_trafego = atual and atual["hits"] == 0 and not any(b and b["hits"] for b in (b1h, b24h))
    if not atual or sem_trafego:
        veredito = "indeterminado"
    elif erro >= a.erro_incidente or len(quebras) >= 2 or "throughput zerado" in quebras \
            or (quebras and mon.get("alert")):
        veredito = "incidente"
    elif quebras or mon.get("alert") or mon.get("warn"):
        veredito = "degradado"
    else:
        veredito = "saudável"
    return sinais, veredito


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--service", required=True)
    p.add_argument("--env", default="prod")
    p.add_argument("--window", default="15m")
    p.add_argument("--operacao", help="span name APM (ex.: http.request); descoberto se omitido")
    p.add_argument("--erro-max", type=float, default=1.0)
    p.add_argument("--erro-incidente", type=float, default=5.0)
    p.add_argument("--p99-fator", type=float, default=2.0)
    p.add_argument("--queda-rps", type=float, default=30.0)
    p.add_argument("--min-req", type=int, default=100)
    p.add_argument("--deploy-recente", type=int, default=60)
    p.add_argument("--log-facets", default="@error.kind,@error.message,@http.status_code")
    p.add_argument("--eventos-query", default="service:{service} env:{env} source:gitlab")
    p.add_argument("--timeout", type=int, default=30)
    p.add_argument("--permitir-janela-longa", action="store_true")
    a = p.parse_args()

    try:
        w = janela_segundos(a.window)
    except ValueError as e:
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
        return 1
    if w > JANELA_MAX_S and not a.permitir_janela_longa:
        print(json.dumps({"erro": "janela > 24h exige pedido explícito (--permitir-janela-longa)"},
                         ensure_ascii=False))
        return 1

    agora = int(time.time())
    r = {"servico": a.service, "env": a.env, "janela": a.window,
         "gerado_em": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(agora)),
         "tags": {"obs": []}, "janelas": {}}

    n_falhas = len(falhas)
    op = a.operacao or descobrir_operacao(a.service, a.env, agora, a.timeout)
    op_falhou = len(falhas) > n_falhas
    r["operacao"] = op
    escopo = f"service:{a.service},env:{a.env}"

    if op:
        for nome, desloc in (("atual", 0), ("1h_antes", 3600), ("24h_antes", 86400)):
            res = consultar_janela(f"métricas {nome}", op, escopo, agora - desloc - w, agora - desloc, a.timeout)
            if res is not None:
                r["janelas"][nome] = res
        atual = r["janelas"].get("atual")
        if atual and atual["hits"] == 0:
            envs = envs_do_servico(op, a.service, agora - w, agora, a.timeout)
            if envs is not None and a.env not in envs:
                r["tags"]["obs"].append(f"sem tráfego com env:{a.env}; envs vistos: {', '.join(envs) or 'nenhum'}")
        r["versao"] = versao(op, escopo, agora, a.timeout)
        if (r["versao"] or {}).get("sem_tag_version"):
            r["tags"]["obs"].append("serviço sem tag version nas métricas APM")
    elif not op_falhou:
        r["tags"]["obs"].append(f"nenhuma operação APM para service:{a.service} env:{a.env} "
                                "(tag service/env ausente ou serviço sem APM)")

    r["logs"] = top_erros_logs(a.service, a.env, agora - w, agora, a.log_facets.split(","), a.timeout)
    if r["logs"]["total_erros"] == 0:
        r["tags"]["obs"].append("nenhum log de erro com service+env na janela")
    r["monitores"] = monitores(a.service, a.env, a.timeout)
    r["deploys"] = eventos_deploy(a.eventos_query.format(service=a.service, env=a.env), agora, a.timeout)

    atual, b1h, b24h = (r["janelas"].get(k) for k in ("atual", "1h_antes", "24h_antes"))
    if atual:
        r["variacao_rps_pct"] = {"vs_1h": variacao(atual["rps"], (b1h or {}).get("rps")),
                                 "vs_24h": variacao(atual["rps"], (b24h or {}).get("rps"))}
    r["sinais"], r["veredito_sugerido"] = avaliar(r, a)
    r["falhas"] = falhas
    print(json.dumps(r, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```
