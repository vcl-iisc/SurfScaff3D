"use strict";
const { OrbitControls, RoomEnvironment } = window.THREE || {};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function sEff(s) {
  s = +s;
  if (s >= 0.9) s = 1.0;
  else if (s >= 0.6) s = 0.6 + (s - 0.6) * (0.4 / 0.3);
  return Math.max(s, 0.05);
}
const ampToS = a => Math.pow(0.05, a);
const sToAmp = s => Math.min(1, Math.max(0, Math.log(s) / Math.log(0.05)));

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gaussField(seed, n) {
  const r = rng(seed), out = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    let u = 0; while (u === 0) u = r();
    const v = r(), m = Math.sqrt(-2 * Math.log(u));
    out[i] = m * Math.cos(2 * Math.PI * v); if (i + 1 < n) out[i + 1] = m * Math.sin(2 * Math.PI * v);
  }
  return out;
}
const tapCache = new Map();
function taps(R, L) {
  const key = R + ":" + L; if (tapCache.has(key)) return tapCache.get(key);
  const idx = new Int32Array(R * 4), w = new Float32Array(R * 4);
  for (let i = 0; i < R; i++) {
    const x = R === 1 ? 0 : (i / (R - 1)) * (L - 1);
    const i1 = Math.min(Math.floor(x), L - 1), t = x - i1, t2 = t * t, t3 = t2 * t;
    const ws = [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
    for (let k = 0; k < 4; k++) { idx[i * 4 + k] = Math.min(L - 1, Math.max(0, i1 - 1 + k)); w[i * 4 + k] = ws[k]; }
  }
  const v = { idx, w }; tapCache.set(key, v); return v;
}

class HPSModel {
  constructor(meta, base) {
    this.meta = meta; this.base = base;
    const P = meta.patches, nV = meta.n_vertices;
    this.sigma = meta.sigma; this.alpha = meta.alpha;
    this.pos = new Float32Array(base);
    this.col = new Float32Array(nV * 3);
    this.taper = new Float32Array(nV);
    this.cur = P.map(p => ({ s: p.s, f: p.f }));
    this.faceStart = new Uint32Array(P.length + 1);
    let nTri = 0;
    P.forEach((p, i) => { this.faceStart[i] = nTri; nTri += 2 * (p.ru - 1) * (p.rv - 1); });
    this.faceStart[P.length] = nTri;
    const index = new Uint32Array(nTri * 3); let k = 0;
    P.forEach((p, pi) => {
      const o = p.offset, rv = p.rv;
      for (let i = 0; i < p.ru - 1; i++) for (let j = 0; j < rv - 1; j++) {
        const a = o + i * rv + j, b = a + 1, c = a + rv, d = c + 1;
        index[k++] = a; index[k++] = c; index[k++] = b; index[k++] = b; index[k++] = c; index[k++] = d;
      }
      this.computeTaper(pi);
    });
    this.geom = new THREE.BufferGeometry();
    this.geom.setIndex(new THREE.BufferAttribute(index, 1));
    this.posAttr = new THREE.BufferAttribute(this.pos, 3); this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geom.setAttribute("position", this.posAttr);
    this.colAttr = new THREE.BufferAttribute(this.col, 3);
    this.geom.setAttribute("color", this.colAttr);
    this.lattices = new Map();
    this.sel = null; this.paint();
    this.update(null);
  }
  computeTaper(pi) {
    const p = this.meta.patches[pi], B = this.base, o = p.offset, ru = p.ru, rv = p.rv, a = this.alpha;
    const edge = [];
    for (let i = 0; i < ru; i++) for (let j = 0; j < rv; j++)
      if (i === 0 || j === 0 || i === ru - 1 || j === rv - 1) edge.push(o + i * rv + j);
    const ex = new Float32Array(edge.length * 3);
    edge.forEach((e, n) => { ex[3 * n] = B[3 * e]; ex[3 * n + 1] = B[3 * e + 1]; ex[3 * n + 2] = B[3 * e + 2]; });
    const a2 = a * a;
    for (let i = 0; i < ru; i++) for (let j = 0; j < rv; j++) {
      const v = o + i * rv + j, x = B[3 * v], y = B[3 * v + 1], z = B[3 * v + 2];
      let best = a2;
      for (let n = 0; n < ex.length; n += 3) {
        const dx = x - ex[n], dy = y - ex[n + 1], dz = z - ex[n + 2], d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < best) { best = d2; if (best === 0) break; }
      }
      this.taper[v] = Math.sqrt(best);
    }
  }
  lattice(pi, Lu, Lv) {
    const key = pi + ":" + Lu + ":" + Lv;
    const seed = this.meta.patches[pi].seed ?? pi;
    if (!this.lattices.has(key)) this.lattices.set(key, gaussField(seed * 7919 + Lu * 131 + Lv * 17 + 1, Lu * Lv * 3));
    return this.lattices.get(key);
  }
  setParams(indices, s, f) { for (const i of indices) this.cur[i] = { s, f }; }
  resetParams() { this.cur = this.meta.patches.map(p => ({ s: p.s, f: p.f })); }
  update(indices) {
    const P = this.meta.patches, list = indices || P.map((_, i) => i);
    for (const pi of list) this.displacePatch(pi);
    this.posAttr.needsUpdate = true;
    this.geom.computeVertexNormals();
    this.geom.computeBoundingSphere();
  }
  displacePatch(pi) {
    const p = this.meta.patches[pi], { s, f } = this.cur[pi];
    const ru = p.ru, rv = p.rv, o = p.offset;
    const Lu = Math.max(2, Math.min(f * p.nu, ru)), Lv = Math.max(2, Math.min(f * p.nv, rv));
    const N = this.lattice(pi, Lu, Lv), tu = taps(ru, Lu), tv = taps(rv, Lv);
    const amp = this.sigma / sEff(s), B = this.base, X = this.pos, T = this.taper;
    const tmp = new Float32Array(Lu * rv * 3);
    for (let a = 0; a < Lu; a++) for (let j = 0; j < rv; j++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) { const w = tv.w[j * 4 + k], n = (a * Lv + tv.idx[j * 4 + k]) * 3; x += w * N[n]; y += w * N[n + 1]; z += w * N[n + 2]; }
      const t = (a * rv + j) * 3; tmp[t] = x; tmp[t + 1] = y; tmp[t + 2] = z;
    }
    for (let i = 0; i < ru; i++) for (let j = 0; j < rv; j++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) { const w = tu.w[i * 4 + k], t = (tu.idx[i * 4 + k] * rv + j) * 3; x += w * tmp[t]; y += w * tmp[t + 1]; z += w * tmp[t + 2]; }
      const v = o + i * rv + j, m = T[v] * amp, q = 3 * v;
      X[q] = B[q] + m * x; X[q + 1] = B[q + 1] + m * y; X[q + 2] = B[q + 2] + m * z;
    }
  }
  setHighlight(set) { this.sel = set; this.paint(); }
  paint() {
    const P = this.meta.patches, C = this.col, L = this.look || LOOKS[currentLook];
    P.forEach((p, i) => {
      let c = L.clay;
      if (this.sel) c = this.sel.has(i) ? HOT : mix(c, L.dim, 0.8);
      for (let v = p.offset; v < p.offset + p.ru * p.rv; v++) { C[3 * v] = c[0]; C[3 * v + 1] = c[1]; C[3 * v + 2] = c[2]; }
    });
    if (this.colAttr) this.colAttr.needsUpdate = true;
  }
  patchOfFace(fi) {
    const F = this.faceStart; let lo = 0, hi = F.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (F[mid] <= fi) lo = mid; else hi = mid - 1; }
    return lo;
  }
}

const dataCache = new Map();
function loadHPS(id) {
  if (!dataCache.has(id)) dataCache.set(id, (async () => {
    const [meta, buf] = await Promise.all([
      fetch(`static/data/${id}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`static/data/${id}.bin`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    ]);
    return { meta, base: new Float32Array(buf) };
  })());
  return dataCache.get(id);
}
