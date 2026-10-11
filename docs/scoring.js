/* Verbaflux : calcul de la précision d'un tracé (module pur, testable sous Node).
 *
 * Idée : on compare la ligne centrale du tracé de l'utilisateur à celle du modèle, point par point.
 *  - couverture : quelle part du modèle est recouverte par le tracé ;
 *  - précision  : quelle part du tracé tombe bien sur le modèle (les traits en trop pénalisent) ;
 *  - score      : produit des deux (0 à 100) : il faut être complet ET propre pour approcher 100.
 * Chaque point reçoit une note douce : 1 sous T0 d'écart (trait parfait), 0 au-delà de T1, linéaire entre les deux.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VerbafluxScoring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const T0 = 4;       // px (canevas 720) : écart toléré sans pénalité
  const T1 = 24;      // px : écart à partir duquel le point ne compte plus
  const STEP = 3;     // px : pas d'échantillonnage

  function samplePolyline(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(len / step));
      for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
    if (pts.length) out.push(pts[pts.length - 1].slice());
    return out;
  }

  /** Points de référence (dédoublonnés) avec le masque des runes auxquelles ils appartiennent. */
  function referencePoints(data, map, step) {
    const merged = new Map();
    data.runes.forEach((rune, ri) => {
      rune.strokes.forEach((stroke) => {
        samplePolyline(stroke.map(map), step).forEach(([x, y]) => {
          const key = Math.round(x / 2) + "," + Math.round(y / 2);
          const cur = merged.get(key);
          if (cur) cur.mask |= 1 << ri;
          else merged.set(key, { x, y, mask: 1 << ri });
        });
      });
    });
    return [...merged.values()];
  }

  /** Recentre et redimensionne (échelle uniforme) le tracé sur la boîte du modèle. */
  function alignStrokes(ref, strokes) {
    const pts = [];
    strokes.forEach((s) => s.forEach(([x, y]) => pts.push({ x, y })));
    const rb = bbox(ref), ub = bbox(pts);
    const k = Math.min(rb.w / Math.max(ub.w, 1), rb.h / Math.max(ub.h, 1));
    const ucx = ub.x0 + ub.w / 2, ucy = ub.y0 + ub.h / 2, rcx = rb.x0 + rb.w / 2, rcy = rb.y0 + rb.h / 2;
    return strokes.map((s) => s.map(([x, y]) => [(x - ucx) * k + rcx, (y - ucy) * k + rcy]));
  }

  /** Index spatial très simple pour la recherche du point le plus proche. */
  function buildIndex(points, cell) {
    const grid = new Map();
    points.forEach((p, i) => {
      const k = Math.floor(p.x / cell) + "," + Math.floor(p.y / cell);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    });
    return { grid, cell, points };
  }

  function nearest(index, x, y, maxD) {
    const { grid, cell, points } = index;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    const r = Math.ceil(maxD / cell);
    let best = Infinity;
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        const list = grid.get(cx + i + "," + (cy + j));
        if (!list) continue;
        for (const idx of list) {
          const d = Math.hypot(points[idx].x - x, points[idx].y - y);
          if (d < best) best = d;
        }
      }
    }
    return best;
  }

  const soft = (d) => (d <= T0 ? 1 : d >= T1 ? 0 : 1 - (d - T0) / (T1 - T0));

  function bbox(points) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }

  /**
   * @param data     window.VERBAFLUX
   * @param map      fonction (point de la grille) -> point du canevas
   * @param strokes  tracé de l'utilisateur : tableau de traits, un trait = tableau de [x, y] (px du canevas)
   * @param opts     { align: boolean } calage automatique du tracé sur le modèle (échelle uniforme + centrage)
   */
  function score(data, map, strokes, opts) {
    opts = opts || {};
    const ref = referencePoints(data, map, STEP);
    let user = [];
    strokes.forEach((s) => { if (s.length > 1) user = user.concat(samplePolyline(s, STEP).map(([x, y]) => ({ x, y }))); });
    if (user.length < 20) return null;

    let alignedStrokes = strokes;
    if (opts.align) {
      alignedStrokes = alignStrokes(ref, strokes);
      user = [];
      alignedStrokes.forEach((s) => { if (s.length > 1) user = user.concat(samplePolyline(s, STEP).map(([x, y]) => ({ x, y }))); });
    }

    const userIdx = buildIndex(user, 40), refIdx = buildIndex(ref, 40);
    const covD = ref.map((p) => nearest(userIdx, p.x, p.y, T1));
    const preD = user.map((p) => nearest(refIdx, p.x, p.y, T1));
    const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
    const C = mean(covD.map(soft)), P = mean(preD.map(soft));
    const total = 100 * C * P;

    const perRune = data.runes.map((r, ri) => {
      const vals = ref.map((p, i) => ((p.mask >> ri) & 1 ? soft(covD[i]) : null)).filter((v) => v !== null);
      return { name: r.name, color: r.color, coverage: 100 * mean(vals) };
    });
    return {
      total, coverage: 100 * C, precision: 100 * P, perRune,
      missed: ref.filter((p, i) => covD[i] >= T1),       // modèle non recouvert
      excess: user.filter((p, i) => preD[i] >= T1),      // traits en trop
      aligned: alignedStrokes,
    };
  }

  return { score, samplePolyline, referencePoints, T0, T1, STEP };
});
