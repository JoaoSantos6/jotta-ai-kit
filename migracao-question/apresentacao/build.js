const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require("C:/Users/JOÃO PC/.claude/skills/synced/04bec06d-b687-45fd-a407-6d379f136d5a_cfc8578d-008f-4f61-a6e7-35a5cb1c7783/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";

const HEX = {
  ink: "1B1F3B", muted: "565C75", white: "FFFFFF", mist: "EEF2F7",
  go: "00ADD8", magenta: "E5007D", teal: "0B7A8F", amber: "F2A900", slate: "8A90A8", green: "2BB673",
};
const THEME = {
  name: "Question-MS",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: HEX.ink, lt1: HEX.white, dk2: HEX.muted, lt2: HEX.mist,
    accent1: HEX.go, accent2: HEX.magenta, accent3: HEX.teal, accent4: HEX.amber,
    accent5: HEX.slate, accent6: HEX.green, hlink: HEX.go, folHlink: HEX.slate,
  },
};

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10 x 5.625
  pres.title = "Migração Question-MS: PHP → Go";
  pres.author = "Equipe de Crédito";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  const titlePh = (color) => ({
    placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.65, fontSize: 30, bold: true, color, valign: "middle", align: "left", margin: 0 }, text: "" },
  });
  const slideNum = (color) => ({ x: 9.2, y: 5.22, w: 0.4, h: 0.25, fontSize: 9, color, align: "right" });

  pres.defineSlideMaster({ title: "DARK", background: { color: C.text1 }, objects: [titlePh(C.background1)], slideNumber: slideNum(C.accent5) });
  pres.defineSlideMaster({ title: "LIGHT", background: { color: C.background1 }, objects: [titlePh(C.text1)], slideNumber: slideNum(C.accent5) });

  const ic = {
    shield: await icon(fa.FaShieldAlt, HEX.white), lock: await icon(fa.FaLock, HEX.white),
    mem: await icon(fa.FaMemory, HEX.white), db: await icon(fa.FaDatabase, HEX.white),
    bdd: await icon(fa.FaClipboardCheck, HEX.white), doc: await icon(fa.FaFileAlt, HEX.white),
    robot: await icon(fa.FaRobot, HEX.white), rocket: await icon(fa.FaRocket, HEX.white),
    arrow: await icon(fa.FaChevronRight, HEX.slate), check: await icon(fa.FaCheck, HEX.white),
  };
  const circleIcon = (s, x, y, d, fill, img, name) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: name + "-circle" });
    const p = d * 0.25;
    s.addImage({ data: img, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: name + "-icon" });
  };

  // ---------- Slide 1: Contexto e decisão ----------
  pres.addSection({ title: "Contexto" });
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Contexto" });
    s.addText("Migração Question-MS: PHP 7.4 → Go", { placeholder: "title" });
    s.addText("Jornada e lições de uma migração AS IS assistida por IA · Squad de Crédito", {
      x: 0.5, y: 0.95, w: 9, h: 0.35, fontSize: 14, color: C.accent1, margin: 0, isTextBox: true, objectName: "subtitle",
    });

    // Por que migrar
    s.addText("Por que migrar", { x: 0.5, y: 1.5, w: 4.3, h: 0.35, fontSize: 16, bold: true, color: C.background1, margin: 0, isTextBox: true });
    const pains = [
      [ic.shield, "Vulnerabilidades críticas sem correção", "a principal dor — guiou todas as decisões", HEX.magenta],
      [ic.lock, "Pipeline presa ao PHP 7.4", "nem 7.3, nem 8.x; 3+ devs tentaram atualizar", HEX.teal],
      [ic.mem, "Alto consumo de memória", "e número alto de pods no Kubernetes", HEX.teal],
      [ic.db, "Pooling externo ao banco", "e sem cache eficaz para respostas internas", HEX.teal],
    ];
    pains.forEach(([img, head, sub, col], i) => {
      const y = 1.95 + i * 0.62;
      circleIcon(s, 0.5, y, 0.48, col, img, "pain" + i);
      s.addText([
        { text: head, options: { bold: true, color: C.background1, fontSize: 14, breakLine: true } },
        { text: sub, options: { color: C.accent5, fontSize: 12 } },
      ], { x: 1.13, y: y - 0.04, w: 3.7, h: 0.56, margin: 0, valign: "middle", isTextBox: true, objectName: "pain" + i + "-text" });
    });

    // Decisão
    s.addText("Decisão: 3 ADRs na mesa", { x: 5.2, y: 1.5, w: 4.3, h: 0.35, fontSize: 16, bold: true, color: C.background1, margin: 0, isTextBox: true });
    const adrs = [
      ["Microsserviços (4 novos)", "Adiado: muita mão de obra para um time enxuto", false],
      ["Monolito modular", "Adiado: time majoritariamente Python, pouco Go", false],
      ["AS IS em Go", "Mesmo banco, mesmas queries, mesmos contratos e camadas — só troca a linguagem", true],
    ];
    let ay = 1.95;
    adrs.forEach(([head, sub, chosen], i) => {
      const h = chosen ? 0.9 : 0.62;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 5.2, y: ay, w: 4.3, h, rectRadius: 0.08,
        fill: { color: chosen ? C.accent1 : C.text1 }, line: { color: chosen ? C.accent1 : C.accent5, width: 1 }, objectName: "adr" + i,
      });
      s.addText([
        { text: (chosen ? "✓  " : "") + head, options: { bold: true, fontSize: 14, color: chosen ? C.text1 : C.background1, breakLine: true } },
        { text: sub, options: { fontSize: 12, color: chosen ? C.text1 : C.accent5 } },
      ], { x: 5.35, y: ay, w: 4.0, h, margin: 0, valign: "middle", isTextBox: true, objectName: "adr" + i + "-text" });
      ay += h + 0.15;
    });

    // Números do projeto
    const stats = [["~4 meses", "prazo da migração"], ["3 devs + 1 QA", "+ coordenador e PM"], ["~80 tasks", "no épico do Jira"], ["10 de ~70", "rotas migradas, por req/s"]];
    stats.forEach(([big, small], i) => {
      const x = 0.5 + i * 2.3;
      s.addText([
        { text: big, options: { fontSize: 20, bold: true, color: C.accent1, breakLine: true } },
        { text: small, options: { fontSize: 11, color: C.accent5 } },
      ], { x, y: 4.6, w: 2.1, h: 0.6, margin: 0, valign: "top", isTextBox: true, objectName: "stat" + i });
    });

    s.addNotes(
      "~2 min. O Question-MS guarda perguntas e respostas do onboarding (não só o dado, mas a pergunta com question_id) — peça central do marketplace de crédito.\n" +
      "Dores: vulnerabilidades críticas impossíveis de corrigir porque a pipeline só aceitava PHP 7.4; memória alta, muitos pods, pooling externo, cache fraco.\n" +
      "No discovery (PMs, gerentes, devs, SREs) elegemos vulnerabilidade como dor principal — por isso o tempo foi o fator decisivo.\n" +
      "Microsserviços e monolito modular não foram descartados, só adiados. AS IS em Go: mesmo banco, mesmos downstreams, mesma arquitetura em camadas.\n" +
      "Das ~70 rotas, só 10 eram chamadas em 3 meses de observabilidade; migramos essas, na ordem de req/s."
    );
  }

  // ---------- Slide 2: A jornada ----------
  pres.addSection({ title: "Jornada" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Jornada" });
    s.addText("A jornada de cada rota: spec antes do código", { placeholder: "title" });

    const steps = [
      [ic.bdd, "1. BDD first", "Dev + QA definem cenários de contrato (API) e E2E (web/app)"],
      [ic.doc, "2. Handoff", "Rota legada em Markdown (~3.000 linhas) com sumário, fora do workspace"],
      [ic.robot, "3. Spec-kit", "IA gera PRD e tasks; /judge e reviewers aprovam; /execute codifica"],
      [ic.rocket, "4. HML → PRD", "MR no CI/CD, QA em HML e rollout por % no Split.io"],
    ];
    const cw = 2.0, gap = 0.33;
    steps.forEach(([img, head, body], i) => {
      const x = 0.5 + i * (cw + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.1, w: cw, h: 1.75, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: "step" + i });
      circleIcon(s, x + 0.15, 1.25, 0.42, i === 2 ? HEX.magenta : HEX.teal, img, "step" + i);
      s.addText(head, { x: x + 0.65, y: 1.25, w: cw - 0.75, h: 0.42, fontSize: 14, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
      s.addText(body, { x: x + 0.15, y: 1.78, w: cw - 0.3, h: 0.98, fontSize: 12, color: C.text2, margin: 0, valign: "top", isTextBox: true, objectName: "step" + i + "-text" });
      if (i < steps.length - 1) s.addImage({ data: ic.arrow, x: x + cw + 0.08, y: 1.86, w: 0.17, h: 0.17, objectName: "arrow" + i });
    });

    // Reverse proxy
    s.addText("Reverse-proxy em Go: rollout e consistência no mesmo lugar", {
      x: 0.5, y: 3.05, w: 9, h: 0.32, fontSize: 15, bold: true, color: C.accent3, margin: 0, isTextBox: true,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.75, w: 1.3, h: 0.85, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 }, objectName: "upstreams" });
    s.addText("Upstreams", { x: 0.5, y: 3.75, w: 1.3, h: 0.85, fontSize: 13, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addShape(pres.shapes.LINE, { x: 1.8, y: 4.175, w: 0.4, h: 0, line: { color: C.accent5, width: 1.5, endArrowType: "triangle" }, objectName: "edge-up-proxy" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.2, y: 3.55, w: 1.75, h: 1.25, rectRadius: 0.08, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: "proxy" });
    s.addText([
      { text: "reverse-proxy", options: { bold: true, fontSize: 14, color: C.background1, breakLine: true } },
      { text: "mesmo contrato do legado; lê a regra da rota no Split.io", options: { fontSize: 11, color: C.accent1 } },
    ], { x: 2.3, y: 3.55, w: 1.55, h: 1.25, align: "center", valign: "middle", margin: 0, isTextBox: true });

    const rules = [
      ["0% novo", "→ proxy só para o legado PHP (também é o rollback)", false],
      ["0 < x < 100%", "→ chama ambos e compara responses + side-effects (Datadog)", true],
      ["100% novo", "→ só o serviço Go; rota legada em 0% no Datadog", false],
    ];
    rules.forEach(([tag, txt, hl], i) => {
      const y = 3.5 + i * 0.47;
      const ty = y + 0.19, up = ty < 4.175;
      s.addShape(pres.shapes.LINE, { x: 3.95, y: Math.min(ty, 4.175), w: 0.35, h: Math.max(Math.abs(ty - 4.175), 0.001), flipV: up, line: { color: C.accent5, width: 1 }, objectName: "edge-rule" + i });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.3, y, w: 5.2, h: 0.38, rectRadius: 0.06, fill: { color: hl ? C.accent2 : C.background2 }, line: { color: hl ? C.accent2 : C.background2 }, objectName: "rule" + i });
      s.addText([
        { text: tag + "  ", options: { bold: true, color: hl ? C.background1 : C.text1 } },
        { text: txt, options: { color: hl ? C.background1 : C.text2 } },
      ], { x: 4.42, y, w: 5.0, h: 0.38, fontSize: 11, valign: "middle", margin: 0, isTextBox: true, objectName: "rule" + i + "-text" });
    });
    s.addText("Nasceu como roteador de rollout, virou o controle de consistência — e já é reutilizado em outras migrações do time.", {
      x: 4.3, y: 4.92, w: 5.2, h: 0.3, fontSize: 11, italic: true, color: C.text2, margin: 0, isTextBox: true,
    });

    s.addNotes(
      "~2 min. Primeira tentativa: os dois repositórios no mesmo workspace e a LLM replicando — funcionou no começo, mas o contexto inflou: mais alucinação e mais tokens.\n" +
      "Solução: skills de handoff. No legado, isolado, a IA documenta tudo da rota em Markdown com sumário/índice, para a próxima LLM ler só o trecho necessário.\n" +
      "Depois incorporamos o spec-kit (harness spec-driven da squad): /grill-me entrevista, /judge faz análise crítica, /execute implementa as tasks. Reviewers aprovam as specs antes do código.\n" +
      "Para QA: BDD é a primeira coisa, antes até do handoff; depois validação em HML, dashboards do Datadog e regressivo com dados do reverse-proxy.\n" +
      "Por que não canary: repositórios diferentes, um host intracluster por serviço. Por isso o reverse-proxy, que também evitou sujar o serviço novo com lógica de rollout."
    );
  }

  // ---------- Slide 3: Lições aprendidas ----------
  pres.addSection({ title: "Lições" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Lições" });
    s.addText("O que deu errado e o que levamos disso", { placeholder: "title" });
    const head = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 }, fontSize: 12 } });
    const tag = (t, col) => ({ text: t, options: { bold: true, color: col, fontSize: 12 } });
    const cell = (t, bold) => ({ text: t, options: { color: bold ? C.text1 : C.text2, bold: !!bold, fontSize: 12 } });
    const rows = [
      [head("Tema"), head("O que aconteceu"), head("Lição")],
      [tag("Código", C.accent3), cell("AS IS barrado pelo SonarQube; classes do PHP confundiam a IA num Go de structs"), cell("Respeite a régua de qualidade e o idioma da linguagem desde o dia 1", true)],
      [tag("IA", C.accent2), cell("Dois repos no mesmo contexto: alucinação e custo de tokens crescendo"), cell("Handoff + spec-driven; gerencie a janela de contexto e use o modelo certo para cada tarefa", true)],
      [tag("Observabilidade", C.accent3), cell("Serviços sem traces chamavam o legado; troca de URL nos upstreams subestimada"), cell("Datadog não é inventário: faça discovery ativo de consumidores e impacto por upstream", true)],
      [tag("Dados", C.accent3), cell("Downstream não idempotente quebrava a comparação em paralelo"), cell("Mapeie idempotência; valide só via contrato quando não puder chamar duas vezes", true)],
      [tag("Side-effects", C.accent3), cell("Outro serviço limpava o cache do legado e gerava falsas inconsistências"), cell("Mapeie side-effects que entram e saem do serviço antes de comparar", true)],
      [tag("Pessoas", C.accent2), cell("Saída de colegas; MRs com 100+ changes e um único QA viraram gargalo"), cell("MRs pequenas, conhecimento distribuído (RACI) e regressivo no CI/pre-push", true)],
    ];
    s.addTable(rows, {
      x: 0.5, y: 1.1, w: 9, colW: [1.45, 3.6, 3.95], rowH: [0.34, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56],
      valign: "middle", margin: [0.04, 0.1, 0.04, 0.1],
      border: { type: "solid", pt: 0.75, color: HEX.mist }, fill: { color: HEX.white }, color: C.text2, objectName: "lessons-table",
    });
    s.addText("Bônus: teste de stress antes de cada push produtivo — expõe gargalos e código stateful que trava pods ou banco.", {
      x: 0.5, y: 4.85, w: 8.6, h: 0.3, fontSize: 11, italic: true, color: C.text2, margin: 0, isTextBox: true,
    });
    s.addNotes(
      "~2,5 min. Para QA e produto: as linhas de Observabilidade, Dados e Side-effects são as que mais custaram tempo de investigação de inconsistências.\n" +
      "Downstream não idempotente: a primeira chamada (legado ou novo) passava, a segunda sempre falhava — criamos validação só por contrato.\n" +
      "Upstreams: CORS, chamadas internas e regras de negócio em cada consumidor — deveria ter sido mapeado com a importância do serviço para cada um.\n" +
      "Pessoas: time pequeno ficou menor; onboarding de novos colegas é investimento, mas consome tempo do cronograma.\n" +
      "Mensagem central: discovery técnico E de produto, com todos os envolvidos informados (RACI)."
    );
  }

  // ---------- Slide 4: Resultados ----------
  pres.addSection({ title: "Resultados" });
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Resultados" });
    s.addText("Resultado: mais rápido, mais barato, sem impacto", { placeholder: "title" });
    const tiles = [
      ["4x", "menor custo do serviço, na mesma infra"],
      ["0", "usuários impactados, mesmo a 1.000 req/s"],
      ["−60%", "p95: de 200 ms para 80 ms"],
      ["−50%", "p50: de 50 ms para 25 ms"],
    ];
    tiles.forEach(([big, small], i) => {
      const x = 0.5 + (i % 2) * 2.25, y = 1.15 + Math.floor(i / 2) * 1.5;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.05, h: 1.3, rectRadius: 0.08, fill: { color: HEX.ink, transparency: 0 }, line: { color: C.accent5, width: 1 }, objectName: "tile" + i });
      s.addText(big, { x: x + 0.15, y: y + 0.1, w: 1.8, h: 0.65, fontSize: 36, bold: true, color: i < 2 ? C.accent1 : C.accent6, margin: 0, valign: "middle", isTextBox: true });
      s.addText(small, { x: x + 0.15, y: y + 0.75, w: 1.8, h: 0.48, fontSize: 11, color: C.background1, margin: 0, valign: "top", isTextBox: true });
    });

    s.addChart(pres.charts.BAR, [
      { name: "Legado PHP", labels: ["p50", "p95"], values: [50, 200] },
      { name: "Novo Go", labels: ["p50", "p95"], values: [25, 80] },
    ], {
      x: 5.2, y: 1.15, w: 4.3, h: 3.9, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
      chartColors: [HEX.slate, HEX.go],
      showTitle: true, title: "Latência (ms)", titleColor: HEX.white, titleFontSize: 12, titleFontFace: "+mn-lt",
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: HEX.white, dataLabelFontSize: 11, dataLabelFontFace: "+mn-lt",
      catAxisLabelColor: HEX.white, catAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt", catAxisLineShow: false,
      valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: true, legendPos: "b", legendColor: HEX.white, legendFontSize: 11, legendFontFace: "+mn-lt",
      objectName: "latency-chart",
    });

    const gains = [
      [ic.check, "Vulnerabilidades sob controle e gestão contínua"],
      [ic.check, "Avanço na plataformização do fluxo de perguntas"],
      [ic.check, "Simples de manter; próximo passo: modularizar"],
    ];
    gains.forEach(([img, t], i) => {
      const y = 4.2 + i * 0.36;
      circleIcon(s, 0.5, y + 0.03, 0.26, HEX.green, img, "gain" + i);
      s.addText(t, { x: 0.88, y, w: 3.9, h: 0.32, fontSize: 12, color: C.background1, margin: 0, valign: "middle", isTextBox: true, objectName: "gain" + i + "-text" });
    });

    s.addNotes(
      "~1,5 min. Mesmo sem mudar banco, downstreams ou arquitetura, só a troca de linguagem já reduziu custo em 4x e cortou latência pela metade ou mais.\n" +
      "Nenhum usuário impactado durante o rollout, inclusive em rotas com 1.000 req/s — mérito do rollout por rota + consistência no reverse-proxy.\n" +
      "Próximos passos: retomar as ADRs de monolito modular / microsserviços agora que a dor de segurança acabou.\n" +
      "Abrir para perguntas."
    );
  }

  await pres.writeFile({ fileName: OUT });
  if (!process.env.NOTHEME) await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
