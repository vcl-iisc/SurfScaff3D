"use strict";
function buildTree(meta) {
  const root = { name: "", path: "", kids: new Map(), all: [] };
  meta.patches.forEach((p, i) => {
    let node = root; root.all.push(i);
    p.path.split("/").forEach(seg => {
      if (!node.kids.has(seg)) node.kids.set(seg, { name: seg, path: node.path ? node.path + "/" + seg : seg, kids: new Map(), all: [] });
      node = node.kids.get(seg); node.all.push(i);
    });
  });
  return root.kids.size === 1 ? [...root.kids.values()][0] : root;
}

async function initExplorer() {
  const stage = $("expStage"), viewer = new Viewer(stage);
  stage.querySelector(".loading").remove();
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; stage.appendChild(tip);
  let state = null;
  const nodeBtns = new Map();

  const selected = new Map();
  function reveal(b) {
    let ul = b.closest("ul");
    while (ul && ul.id !== "expTree") { if (ul.hidden) { ul.hidden = false; const tw = ul.parentElement.querySelector(":scope > .twisty"); if (tw) tw.textContent = "▾"; } ul = ul.parentElement.closest("ul"); }
    b.scrollIntoView({ block: "nearest" });
  }
  function select(node) {
    if (!state) return;
    selected.clear();
    if (node !== state.tree) selected.set(node.path, node);
    refreshSelection(node);
  }
  function refreshSelection(focus) {
    nodeBtns.forEach(b => b.removeAttribute("aria-current"));
    const union = new Set();
    selected.forEach((n, path) => { n.all.forEach(i => union.add(i)); const b = nodeBtns.get(path); if (b) b.setAttribute("aria-current", "true"); });
    if (focus && selected.has(focus.path) && nodeBtns.has(focus.path)) reveal(nodeBtns.get(focus.path));
    state.model.setHighlight(selected.size ? union : null);
    viewer.dirty = true;
    const host = $("expSel"); host.innerHTML = "";
    if (!selected.size) {
      host.innerHTML = `<span class="sel-total">Whole object · ${state.tree.all.length} patches</span>`;
      $("expHps").innerHTML = hpsText(state.model.meta, state.tree.all);
      return;
    }
    selected.forEach((n, path) => {
      const chip = document.createElement("span"); chip.className = "selchip";
      chip.innerHTML = `${esc(path.split("/").slice(1).join("/") || path)}<button type="button" aria-label="Remove ${esc(path)}">×</button>`;
      chip.querySelector("button").addEventListener("click", () => { selected.delete(path); refreshSelection(null); });
      host.appendChild(chip);
    });
    const total = document.createElement("span"); total.className = "sel-total";
    total.textContent = `${union.size} patch${union.size === 1 ? "" : "es"}`;
    const clear = document.createElement("button"); clear.type = "button"; clear.className = "sel-clear"; clear.textContent = "Clear";
    clear.addEventListener("click", () => { selected.clear(); refreshSelection(null); });
    host.append(total, clear);
    $("expHps").innerHTML = hpsText(state.model.meta, [...selected.values()][0].all);
  }
  function renderTree(tree) {
    const host = $("expTree"); host.innerHTML = ""; nodeBtns.clear();
    const mk = (node, depth) => {
      const li = document.createElement("li");
      const kids = [...node.kids.values()];
      const tw = document.createElement("button"); tw.type = "button"; tw.className = "twisty";
      tw.textContent = kids.length ? (depth < 1 ? "▾" : "▸") : ""; tw.tabIndex = kids.length ? 0 : -1;
      tw.setAttribute("aria-label", kids.length ? "Expand " + node.name : "");
      const b = document.createElement("button"); b.type = "button"; b.className = "node";
      b.innerHTML = `${esc(node.name)}<span class="n">${node.all.length}</span>`;
      b.addEventListener("click", () => select(node));
      nodeBtns.set(node.path, b);
      li.append(tw, b);
      if (kids.length) {
        const ul = document.createElement("ul"); ul.hidden = depth >= 1;
        const LIMIT = 12;
        kids.slice(0, LIMIT).forEach(k => ul.appendChild(mk(k, depth + 1)));
        if (kids.length > LIMIT) {
          const more = document.createElement("button"); more.type = "button"; more.className = "more";
          more.textContent = `show ${kids.length - LIMIT} more`;
          more.addEventListener("click", () => { kids.slice(LIMIT).forEach(k => ul.insertBefore(mk(k, depth + 1), more)); more.remove(); });
          ul.appendChild(more);
        }
        tw.addEventListener("click", () => { ul.hidden = !ul.hidden; tw.textContent = ul.hidden ? "▸" : "▾"; });
        li.appendChild(ul);
      }
      return li;
    };
    const top = document.createElement("ul"); top.appendChild(mk(tree, 0)); host.appendChild(top);
  }
  function findNode(path) {
    let node = state.tree; const segs = path.split("/");
    const start = segs[0] === state.tree.name ? 1 : 0;
    for (const s of segs.slice(start)) { if (!node.kids.has(s)) break; node = node.kids.get(s); }
    return node;
  }
  let showTicket = 0, prompts = null, currentCfg = null;
  async function show(cfg) {
    const mine = ++showTicket;
    currentCfg = cfg;
    stageStatus(stage, "loading " + cfg.label.toLowerCase() + "…");
    fillPrompt(cfg);
    const { meta, base } = await loadHPS(cfg.id);
    if (mine !== showTicket) return;
    const model = new HPSModel(meta, base);
    state = { cfg, model, tree: buildTree(meta) };
    if (!state.tree.name) state.tree.name = cfg.label.toLowerCase();
    viewer.setModel(model, null, { yaw: cfg.yaw });
    renderTree(state.tree);
    select(state.tree);
    stageStatus(stage, `${meta.n_patches} patches`);
  }
  function fillPrompt(cfg) {
    const P = prompts && prompts[cfg.id], box = $("expPromptBox");
    box.hidden = !P;
    if (!P) return;
    $("expPromptHead").innerHTML = `Prompt for the ${esc(cfg.label.toLowerCase())}<span class="kind">${esc(P.kind)}</span>`;
    let html = (P.image ? `<img src="${P.image}" alt="Input photo for the ${esc(cfg.label.toLowerCase())}">` : "") + blocksHTML(P.blocks);
    if (P.after) html += `<p class="after">${esc(P.after)}</p>`;
    $("expPrompt").innerHTML = html;
  }
  fetch("static/data/prompts.json").then(r => r.ok ? r.json() : null).then(j => { prompts = j; if (currentCfg) fillPrompt(currentCfg); }).catch(() => {});

  let lastHover = 0;
  viewer.renderer.domElement.addEventListener("pointermove", ev => {
    if (!state || ev.buttons) { tip.hidden = true; return; }
    const now = performance.now(); if (now - lastHover < 70) return; lastHover = now;
    const pi = viewer.pick(ev);
    if (pi < 0) { tip.hidden = true; return; }
    const r = stage.getBoundingClientRect();
    tip.textContent = state.model.meta.patches[pi].path; tip.hidden = false;
    tip.style.left = Math.min(ev.clientX - r.left + 12, r.width - tip.offsetWidth - 8) + "px";
    tip.style.top = (ev.clientY - r.top + 14) + "px";
  });
  viewer.renderer.domElement.addEventListener("pointerleave", () => tip.hidden = true);
  let down = null;
  viewer.renderer.domElement.addEventListener("pointerdown", ev => down = [ev.clientX, ev.clientY]);
  viewer.renderer.domElement.addEventListener("pointerup", ev => {
    if (!state || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 4) return;
    const pi = viewer.pick(ev);
    if (pi < 0) { select(state.tree); return; }
    const node = findNode(state.model.meta.patches[pi].path);

    let guard = 0; while (!nodeBtns.has(node.path) && guard++ < 20) { const more = document.querySelectorAll("#expTree .more"); if (!more.length) break; more.forEach(m => m.click()); }
    select(node);
  });
  const pick = chipGroup($("expObjects"), EXPLORER, cfg => show(cfg).catch(e => stageStatus(stage, "Could not load this object (" + e.message + ")")));
  pick(0);
}
