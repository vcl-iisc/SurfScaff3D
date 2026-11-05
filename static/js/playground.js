"use strict";
async function initPlayground() {
  const stage = $("pgStage"), viewer = new Viewer(stage);
  stage.querySelector(".loading").remove();
  let state = null;
  const amp = $("amp"), freq = $("freq");

  function partIdx(part) { return state.model.meta.patches.map((p, i) => [p, i]).filter(([p]) => !part || p.path === part || p.path.startsWith(part + "/")).map(([, i]) => i); }
  function readout() {
    const s = ampToS(+amp.value), f = +freq.value;
    $("ampOut").textContent = "s_f = " + s.toFixed(2);
    $("freqOut").textContent = "ω_f = " + f;
    const idx = partIdx(state.part), p = state.model.meta.patches[idx[0]], cur = state.model.cur[idx[0]];
    const label = (p.hps.split("\n")[0] || "").replace(/s=\s*[0-9.]+/, "s=" + cur.s.toFixed(2)).replace(/f=\s*[0-9]+/, "f=" + cur.f);
    $("pgHps").innerHTML = `<span class="lbl">${esc(label)}</span>\n${esc(p.hps.split("\n").slice(1).join("\n"))}` +
      (idx.length > 1 ? `\n\n… applied to all ${idx.length} patches of this part` : "");
  }
  function syncSliders() {
    const i0 = partIdx(state.part)[0], c = state.model.cur[i0];
    amp.value = sToAmp(c.s); freq.value = c.f; readout();
  }
  let pending = null;
  function apply() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const idx = partIdx(state.part);
      state.model.setParams(idx, ampToS(+amp.value), +freq.value);
      state.model.update(idx); viewer.dirty = true; readout();
    });
  }
  amp.addEventListener("input", () => { if (state) apply(); });
  freq.addEventListener("input", () => { if (state) apply(); });
  $("pgReset").addEventListener("click", () => { if (!state) return; state.model.resetParams(); state.model.update(null); viewer.dirty = true; syncSliders(); });
  $("pgGrid").addEventListener("click", () => { if (state) renderGrid(); });

  function showParts() {
    const meta = state.model.meta, counts = new Map();
    meta.patches.forEach(p => { const k = p.path.split("/").slice(0, 2).join("/"); counts.set(k, (counts.get(k) || 0) + 1); });
    const items = [{ label: "All parts", part: null, n: meta.patches.length }, ...[...counts].map(([k, n]) => ({ label: k.split("/").pop(), part: k, n }))];
    const pickPart = chipGroup($("pgParts"), items, it => { state.part = it.part; state.model.setHighlight(null); syncSliders(); });
    let start = items.findIndex(it => it.part === state.cfg.start);
    if (start < 0) {
      let best = 0, bs = 9; items.forEach((it, i) => { if (!it.part) return; const s0 = state.model.cur[partIdx(it.part)[0]].s; if (s0 < bs) { bs = s0; best = i; } }); start = best;
    }
    pickPart(start);
  }
  async function show(cfg) {
    stageStatus(stage, "loading " + cfg.label.toLowerCase() + "…");
    const { meta, base } = await loadHPS(cfg.id);
    state = { cfg, model: new HPSModel(meta, base), part: null };
    viewer.setModel(state.model);
    showParts();
    $("gridOut").classList.remove("on");
    stageStatus(stage, `${meta.n_patches} patches · surface computed in your browser`);
  }

  async function renderGrid() {
    const out = $("gridOut"), M = $("matrix"); out.classList.add("on"); M.innerHTML = ""; $("gridNote").textContent = "Rendering…";
    await new Promise(r => setTimeout(r, 30));
    const amps = [0.0, 0.33, 0.66, 1.0], freqs = [1, 3, 6, 10];
    const idx = partIdx(state.part), saved = idx.map(i => ({ ...state.model.cur[i] }));
    const r = viewer.renderer, cam = viewer.camera.clone(); cam.aspect = 1; cam.updateProjectionMatrix();
    const pr = r.getPixelRatio();
    const partName = state.part ? state.part.split("/").pop() : "all parts";
    const cell = (cls, text) => M.appendChild(Object.assign(document.createElement("div"), { className: cls, textContent: text }));
    cell("ax", "ω_f \\ s_f"); amps.forEach(a => cell("ax", ampToS(a).toFixed(2)));
    try {
      r.setPixelRatio(1); r.setSize(360, 360, false); viewer.post.setSize(360, 360, 1);
      for (const f of freqs) {
        cell("ay", String(f));
        for (const a of amps) {
          state.model.setParams(idx, ampToS(a), f); state.model.update(idx);
          viewer.post.render(viewer.scene, cam, viewer);
          const img = document.createElement("img"); img.src = r.domElement.toDataURL("image/png");
          img.alt = `${state.cfg.label}, ${partName} at s_f ${ampToS(a).toFixed(2)} and ω_f ${f}`;
          M.appendChild(img);
        }
      }
    } finally {
      idx.forEach((i, k) => state.model.cur[i] = saved[k]); state.model.update(idx);
      r.setPixelRatio(pr); viewer.resize(); viewer.dirty = true;
    }
    $("gridNote").textContent = `Columns: amplitude rising from left to right (s_f from 1.00 down to 0.05). Rows: frequency ω_f. Only the ${partName} patches change; the camera matches the viewer above.`;
  }
  const pick = chipGroup($("pgObjects"), PLAYGROUND, cfg => show(cfg).catch(e => stageStatus(stage, "Could not load this object (" + e.message + ")")));
  pick(0);
}
