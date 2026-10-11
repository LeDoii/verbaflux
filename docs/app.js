/* Verbaflux : exposition et entraînement à la gravure (fan-made, non affilié à l'équipe d'Elixir RP). */
(function () {
  "use strict";
  const D = window.VERBAFLUX, V = window.VerbafluxScoring;
  const W = 720, SCALE = 0.95;
  const [bx0, by0, bx1, by1] = D.bbox;
  const BCX = (bx0 + bx1) / 2, BCY = (by0 + by1) / 2;
  const map = (p) => [(p[0] - BCX) * SCALE + W / 2, (p[1] - BCY) * SCALE + W / 2];
  const INK = "#20201E";
  const READ_ORDER = ["Mannaz", "Gebo", "Ansuz", "Laguz"];

  /* ------------------------------------------------------------------ plaque de cuivre */
  let plateCache = null;
  function plate() {
    if (plateCache) return plateCache;
    const c = document.createElement("canvas");
    c.width = c.height = W;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(W * 0.38, W * 0.32, 40, W / 2, W / 2, W * 0.75);
    grad.addColorStop(0, "#E2A982"); grad.addColorStop(0.55, "#CD8F66"); grad.addColorStop(1, "#A9704C");
    g.fillStyle = grad; g.fillRect(0, 0, W, W);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.globalAlpha = 0.05;                                   // grain de cire / cuivre brossé
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = rnd() > 0.5 ? "#fff" : "#000";
      g.fillRect(rnd() * W, rnd() * W, 40 + rnd() * 200, 1);
    }
    g.globalAlpha = 1;
    g.lineWidth = 3; g.strokeStyle = "rgba(90,50,26,.35)";
    g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 3, 0, Math.PI * 2); g.stroke();
    plateCache = c;
    return c;
  }

  /* ------------------------------------------------------------------ dessin du modèle */
  function strokePath(g, stroke) {
    g.beginPath();
    stroke.forEach((p, i) => { const [x, y] = map(p); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
  function drawRune(g, rune, color, alpha) {
    g.save();
    g.globalAlpha = alpha; g.strokeStyle = color;
    g.lineWidth = D.strokeWidth * SCALE; g.lineCap = "butt"; g.lineJoin = "miter"; g.miterLimit = 3;
    rune.strokes.forEach((s) => strokePath(g, s));
    g.restore();
  }
  const runeByName = (n) => D.runes.find((r) => r.name === n);

  function legend(ul) {
    ul.innerHTML = "";
    READ_ORDER.forEach((n) => {
      const r = runeByName(n);
      const li = document.createElement("li");
      li.innerHTML = '<i style="background:' + r.color + '"></i>' + r.name;
      ul.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ onglets */
  const tabs = { expo: document.getElementById("tab-expo"), train: document.getElementById("tab-train") };
  function show(which) {
    Object.keys(tabs).forEach((k) => {
      tabs[k].setAttribute("aria-selected", String(k === which));
      document.getElementById(k).hidden = k !== which;
    });
    if (which === "expo") playExpo();
    history.replaceState(null, "", which === "train" ? "#entrainement" : "#");
  }
  tabs.expo.addEventListener("click", () => show("expo"));
  tabs.train.addEventListener("click", () => show("train"));

  /* ------------------------------------------------------------------ exposition */
  const ex = document.getElementById("expo-canvas"), exg = ex.getContext("2d");
  let exToken = 0;
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
  function drawExpo(t) {
    // t en ms : 4 runes qui apparaissent l'une après l'autre (800 ms chacune), puis fusion en encre
    exg.clearRect(0, 0, W, W);
    exg.drawImage(plate(), 0, 0);
    const step = 800, fuseStart = READ_ORDER.length * step + 500, fuse = ease((t - fuseStart) / 1000);
    // modèle fantôme
    D.runes.forEach((r) => drawRune(exg, r, "#5a3320", 0.08));
    let label = "";
    D.runes.forEach((r) => {                                    // ordre de superposition : Gebo au fond
      const i = READ_ORDER.indexOf(r.name);
      const a = ease((t - i * step) / 600);
      if (a <= 0) return;
      const col = mix(r.color, "#2a140a", fuse);
      drawRune(exg, r, col, a * (0.9 - 0.1 * fuse));
    });
    for (let i = 0; i < READ_ORDER.length; i++) if (t >= i * step && t < (i + 1) * step + 300) label = READ_ORDER[i];
    if (t >= fuseStart) label = "";
    if (label) {
      exg.save();
      exg.font = "600 26px ui-monospace, Consolas, monospace"; exg.textAlign = "center";
      exg.fillStyle = "rgba(42,20,10,.85)";
      exg.fillText(label.toUpperCase().split("").join(" "), W / 2, W - 62);
      exg.restore();
    }
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")";
  }
  function playExpo() {
    const token = ++exToken, t0 = performance.now(), total = READ_ORDER.length * 800 + 1700;
    (function frame(now) {
      if (token !== exToken) return;
      const t = Math.min(now - t0, total);
      drawExpo(t);
      if (t < total) requestAnimationFrame(frame);
    })(t0);
  }
  document.getElementById("expo-replay").addEventListener("click", playExpo);
  legend(document.getElementById("expo-legend"));

  /* ------------------------------------------------------------------ entraînement */
  const tc = document.getElementById("train-canvas"), tg = tc.getContext("2d");
  const els = {
    mode: document.getElementById("mode"), align: document.getElementById("align"), msg: document.getElementById("msg"),
    result: document.getElementById("result"), total: document.getElementById("score-total"),
    verdict: document.getElementById("score-verdict"), cov: document.getElementById("score-cov"),
    prec: document.getElementById("score-prec"), bars: document.getElementById("rune-bars"), best: document.getElementById("best"),
    undo: document.getElementById("btn-undo"), clear: document.getElementById("btn-clear"),
    engrave: document.getElementById("btn-engrave"), retry: document.getElementById("btn-retry"),
  };
  legend(document.getElementById("train-legend"));
  let strokes = [], current = null, locked = false, overlay = null, burn = null;

  function drawGuide() {
    const m = els.mode.value;
    if (m === "guide") D.runes.forEach((r) => drawRune(tg, r, r.color, 0.4));
    else if (m === "faint") D.runes.forEach((r) => drawRune(tg, r, "#5a3320", 0.1));
  }
  function burnLine(g, pts, upto, width) {
    // trait de pyrogravure : cœur brûlé sombre + léger halo roussi
    let remaining = upto;
    g.save();
    g.lineCap = "round"; g.lineJoin = "round";
    const path = [pts[0]];
    for (let i = 1; i < pts.length && remaining > 0; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (len <= remaining) { path.push(pts[i]); remaining -= len; }
      else {
        const k = remaining / len;
        path.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
        remaining = 0;
      }
    }
    const trace = () => { g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };
    g.strokeStyle = "rgba(120,55,15,.35)"; g.lineWidth = width + 7; trace();
    g.strokeStyle = "#2a140a"; g.lineWidth = width; trace();
    g.strokeStyle = "rgba(255,170,90,.18)"; g.lineWidth = Math.max(1, width * 0.25); trace();
    g.restore();
  }
  const strokeLen = (s) => s.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0);

  function render() {
    tg.clearRect(0, 0, W, W);
    tg.drawImage(plate(), 0, 0);
    if (!overlay) drawGuide();
    const list = overlay ? overlay.aligned : strokes.concat(current ? [current] : []);
    const live = !overlay;
    list.forEach((s, si) => {
      if (s.length < 2) return;
      let upto = Infinity;
      if (burn) { upto = Math.max(0, burn.progress * burn.total - burn.offsets[si]); }
      burnLine(tg, s, upto, live ? 6 : 8);
    });
    if (overlay && overlay.showDiff) {
      tg.save();
      tg.strokeStyle = "rgba(61,92,140,.85)"; tg.lineWidth = 1.6; tg.setLineDash([6, 5]);
      D.runes.forEach((r) => r.strokes.forEach((s) => strokePath(tg, s)));
      tg.setLineDash([]);
      tg.fillStyle = "rgba(200,30,30,.8)";
      overlay.missed.forEach((p) => { tg.beginPath(); tg.arc(p.x, p.y, 4, 0, Math.PI * 2); tg.fill(); });
      tg.strokeStyle = "rgba(200,30,30,.9)"; tg.lineWidth = 2;
      overlay.excess.forEach((p) => { tg.beginPath(); tg.moveTo(p.x - 4, p.y - 4); tg.lineTo(p.x + 4, p.y + 4); tg.moveTo(p.x + 4, p.y - 4); tg.lineTo(p.x - 4, p.y + 4); tg.stroke(); });
      tg.restore();
    }
  }

  function pos(e) {
    const r = tc.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * W];
  }
  tc.addEventListener("pointerdown", (e) => {
    if (locked) return;
    tc.setPointerCapture(e.pointerId);
    current = [pos(e)];
    els.msg.textContent = "";
    render();
  });
  tc.addEventListener("pointermove", (e) => {
    if (!current) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (evs.length ? evs : [e]).forEach((ev) => {
      const p = pos(ev), q = current[current.length - 1];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 2.5) current.push(p);
    });
    render();
  });
  const end = () => {
    if (!current) return;
    if (current.length > 1) strokes.push(current);
    current = null;
    render();
  };
  tc.addEventListener("pointerup", end);
  tc.addEventListener("pointercancel", end);

  els.undo.addEventListener("click", () => { if (!locked) { strokes.pop(); els.msg.textContent = ""; render(); } });
  els.clear.addEventListener("click", () => { if (!locked) { strokes = []; els.msg.textContent = ""; render(); } });
  els.mode.addEventListener("change", render);
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !document.getElementById("train").hidden && !locked) { strokes.pop(); render(); }
  });

  function verdict(p) {
    if (p >= 95) return "Gravure remarquable.";
    if (p >= 85) return "Très bonne gravure.";
    if (p >= 70) return "Bonne gravure.";
    if (p >= 50) return "Gravure à reprendre : l'ensemble est là, la précision manque.";
    return "Encore loin du modèle.";
  }
  const bestKey = () => "verbaflux-best-" + els.mode.value + (els.align.checked ? "-calage" : "-libre");

  els.engrave.addEventListener("click", () => {
    if (locked) return;
    const res = V.score(D, map, strokes, { align: els.align.checked });
    if (!res) { els.msg.textContent = "Le tracé est trop court pour être gravé."; return; }
    locked = true;
    [els.undo, els.clear, els.engrave].forEach((b) => (b.disabled = true));
    els.msg.textContent = "";
    overlay = { aligned: res.aligned, missed: res.missed, excess: res.excess, showDiff: false };
    const lens = res.aligned.map(strokeLen);
    let acc = 0;
    const offsets = lens.map((l) => { const o = acc; acc += l; return o; });
    burn = { total: acc, offsets, progress: 0 };
    const t0 = performance.now(), dur = Math.min(2600, 700 + acc * 2.2);
    (function frame(now) {
      burn.progress = Math.min(1, (now - t0) / dur);
      render();
      if (burn.progress < 1) requestAnimationFrame(frame);
      else { burn = null; overlay.showDiff = true; render(); showResult(res); }
    })(t0);
  });

  function showResult(res) {
    const total = Math.round(res.total);
    els.result.hidden = false;
    // compteur animé
    const t0 = performance.now();
    (function count(now) {
      const t = Math.min(1, (now - t0) / 900);
      els.total.textContent = Math.round(total * ease(t));
      if (t < 1) requestAnimationFrame(count);
    })(t0);
    els.verdict.textContent = verdict(res.total);
    els.cov.textContent = Math.round(res.coverage) + " %";
    els.prec.textContent = Math.round(res.precision) + " %";
    els.bars.innerHTML = "";
    READ_ORDER.forEach((n) => {
      const r = res.perRune.find((x) => x.name === n);
      const li = document.createElement("li");
      li.innerHTML = '<span class="name">' + r.name + '</span><span class="track"><span class="fill" style="background:' + r.color + '"></span></span><span class="val">' + Math.round(r.coverage) + ' %</span>';
      els.bars.appendChild(li);
      requestAnimationFrame(() => requestAnimationFrame(() => { li.querySelector(".fill").style.width = Math.round(r.coverage) + "%"; }));
    });
    let best = 0;
    try { best = parseFloat(localStorage.getItem(bestKey()) || "0"); } catch (e) { /* stockage indisponible */ }
    if (res.total > best) { best = res.total; try { localStorage.setItem(bestKey(), String(best)); } catch (e) { /* ignoré */ } }
    els.best.textContent = "Meilleur score (ce mode) : " + Math.round(best) + " %";
    els.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  els.retry.addEventListener("click", () => {
    strokes = []; overlay = null; burn = null; locked = false;
    els.result.hidden = true; els.msg.textContent = "";
    [els.undo, els.clear, els.engrave].forEach((b) => (b.disabled = false));
    render();
  });

  /* ------------------------------------------------------------------ démarrage */
  render();
  if (location.hash === "#entrainement") show("train"); else playExpo();
  window.__verbaflux = { map, render, getStrokes: () => strokes, setStrokes: (s) => { strokes = s; render(); }, engrave: () => els.engrave.click() };
})();
