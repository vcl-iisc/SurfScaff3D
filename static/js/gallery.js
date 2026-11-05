"use strict";
function blocksHTML(blocks) {
  let html = "", inList = false;
  for (const [k, t] of blocks) {
    if (k === "li") { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${esc(t)}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += k === "h" ? `<h4>${esc(t)}</h4>` : `<p>${esc(t)}</p>`;
  }
  return inList ? html + "</ul>" : html;
}
function initGallery() {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prompts = fetch("static/data/prompts.json").then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const videos = [];
  function grid(el, list, detail) {
    const box = document.createElement("details");
    box.className = "prompt-details gal-prompt"; box.hidden = true;
    box.innerHTML = `<summary></summary><div class="prompt-body"></div>`;
    const head = box.querySelector("summary"), body = box.querySelector(".prompt-body");
    let sel = -1;
    const items = list.map((g, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "gal-item"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<span class="gal-media"><video muted loop playsinline disablepictureinpicture preload="none" aria-hidden="true" ` +
        `poster="static/gallery/${g.slug}.webp"></video></span><span class="gal-cap"><b>${esc(g.label)}</b><span>${g.model} · ${g.ds}</span></span>`;
      b.addEventListener("click", () => pick(i === sel ? -1 : i));
      el.appendChild(b);
      videos.push([b.querySelector("video"), g.slug]);
      return b;
    });
    function place() {
      if (sel < 0) return;
      const cols = getComputedStyle(el).gridTemplateColumns.split(" ").length;
      items[Math.min(items.length, (Math.floor(sel / cols) + 1) * cols) - 1].after(box);
    }
    function pick(i) {
      sel = i;
      items.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
      box.hidden = i < 0;
      if (i < 0) return;
      const g = list[i];
      body.dataset.slug = g.slug;
      [head.innerHTML, body.innerHTML] = detail(g, body);
      place();
      box.open = true;
    }
    addEventListener("resize", place);
  }
  grid($("galGrid"), GALLERY, (g, body) => {
    if (g.blocksFrom) prompts.then(j => { if (body.dataset.slug === g.slug && j[g.blocksFrom]) body.innerHTML = blocksHTML(j[g.blocksFrom].blocks); });
    return [`Prompt for the ${esc(g.label.toLowerCase())}<span class="kind">${g.model} · ${g.ds}</span>`,
      g.prompt ? `<p>${esc(g.prompt)}</p>` : ""];
  });

  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (!e.isIntersecting) { v.pause(); return; }
    if (still) return;
    if (!v.dataset.loaded) {
      v.dataset.loaded = "1";
      const f = `static/gallery/${v.dataset.slug}`;
      v.innerHTML = `<source src="${f}.mp4" type="video/mp4"><source src="${f}.webm" type="video/webm">`;
      v.load();
    }
    v.play().catch(() => {});
  }), { rootMargin: "150px 0px" });
  videos.forEach(([v, slug]) => { v.dataset.slug = slug; io.observe(v); });
}
