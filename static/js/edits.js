"use strict";
async function initEdits() {
  const stage = $("edStage"), viewer = new Viewer(stage), card = $("edCard"), count = $("edCount");
  stage.querySelector(".loading").remove();
  const r = await fetch("static/data/watch_edits.json"); if (!r.ok) throw new Error(r.status);
  const info = await r.json(), models = new Map(), sideBtns = [...$("edSide").querySelectorAll("button")];
  const getModel = k => {
    if (!models.has(k)) models.set(k, loadHPS(info.states[k]).then(({ meta, base }) => new HPSModel(meta, base)));
    return models.get(k);
  };
  let step = 0, side = "after", first = true, ticket = 0, cardStep = -1;
  const last = EDIT_STEPS.length - 1, prevB = $("edPrev"), nextB = $("edNext");
  function showCard() {
    if (cardStep === step) return;
    cardStep = step;
    const s = EDIT_STEPS[step];
    $("edLabel").textContent = step === 0 ? "Generated" : `Edit ${step} of ${last}`;
    const n = x => x.toLocaleString("en");
    if (step === 0) {
      card.innerHTML = `<div class="tag">Generated</div><p>The watch as generated from a long, detailed text prompt.</p>` +
        `<p>Press Next to apply the first edit.</p>`;
      count.className = "edit-count";
      count.textContent = `${n(info.patches[0])} labelled patches created`;
      return;
    }
    card.innerHTML = `<div class="tag">${s.label} · instruction</div><div class="instr">“${esc(s.text)}”</div>` +
      (s.photo ? `<img src="${s.photo}" alt="Reference photo given with the instruction">` : "") +
      `<p>Orange marks what this edit changed. Switch to Before to see what it replaced.</p>`;

    count.className = "edit-count changed";
    count.innerHTML = `<span class="dot" aria-hidden="true"></span>${n(info.edits[step].changed.length)} of ` +
      `${n(info.patches[step])} patches changed, <span class="nb">the rest untouched</span>`;
  }
  async function render() {
    const mine = ++ticket, k = step > 0 && side === "before" ? step - 1 : step;
    sideBtns.forEach(b => { b.disabled = step === 0; b.setAttribute("aria-pressed", String(step > 0 && b.dataset.side === side)); });
    prevB.disabled = step === 0; nextB.disabled = step === last;
    showCard();
    stageStatus(stage, "loading…");
    const m = await getModel(k);
    if (mine !== ticket) return;
    viewer.setModel(m, WATCH_VIEW, { bbox: info.bbox || m.meta.bbox, keepCamera: !first });
    if (!info.bbox) info.bbox = m.meta.bbox;
    first = false;
    m.setHighlight(step === 0 ? null : new Set(side === "before" ? info.edits[step].removed : info.edits[step].changed));
    viewer.dirty = true;
    stageStatus(stage, `${info.patches[k].toLocaleString("en")} patches`);
    if (step + 1 < EDIT_STEPS.length) getModel(step + 1);
  }
  sideBtns.forEach(b => b.addEventListener("click", () => { side = b.dataset.side; render(); }));
  const go = i => { step = Math.max(0, Math.min(last, i)); side = "after"; render(); };
  prevB.addEventListener("click", () => go(step - 1));
  nextB.addEventListener("click", () => go(step + 1));
  render();
}
