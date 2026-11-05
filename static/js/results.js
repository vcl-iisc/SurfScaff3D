"use strict";
const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
tabs.forEach((t, i) => t.addEventListener("click", () => {
  tabs.forEach((u, j) => { u.setAttribute("aria-selected", String(i === j)); $("tp-" + j).hidden = i !== j; });
}));

function table(el, groups, cols, rows, lowerBetter, markSecond = false) {
  const head1 = groups.some(([g]) => g) ? `<tr><th></th>${groups.map(([g, span]) => `<th colspan="${span}" class="grp" style="text-align:center">${g}</th>`).join("")}</tr>` : "";
  const head2 = `<tr><th>Method</th>${cols.map((c, i) => `<th class="${groups.length > 1 && i % 5 === 0 ? "grp" : ""}">${c}</th>`).join("")}</tr>`;
  const ranked = cols.map((c, j) => [...new Set(rows.map(r => r[1][j]))].sort((a, b) => lowerBetter(c) ? a - b : b - a));
  const best = ranked.map(u => u[0]);

  const second = ranked.map((u, j) => markSecond && rows.filter(r => r[1][j] === u[0]).length === 1 ? u[1] : undefined);
  const mark = (v, j) => v === best[j] ? "best" : v === second[j] ? "second" : "";
  const body = rows.map(([name, vals, ours]) => `<tr class="${ours ? "ours" : ""}"><td>${name}</td>${vals.map((v, j) => `<td class="${mark(v, j)} ${groups.length > 1 && j % 5 === 0 ? "grp" : ""}">${v}</td>`).join("")}</tr>`).join("");
  el.innerHTML = `<thead>${head1}${head2}</thead><tbody>${body}</tbody>`;
}
const per = ["CLIP↑", "ULIP↑", "VQA↑", "FPD↓", "Elo↑"];
table($("t1"), [["ShapeNetCore", 5], ["Toys4K", 5], ["OmniObject3D", 5], ["", 1]], [...per, ...per, ...per, "Fail %↓"], [
  ["BlenderLLM", [24.9, 21.9, 38.3, 930, 763, 24.2, 20.6, 35.3, 397, 670, 25.2, 19.1, 41.9, 991, 780, 36.4]],
  ["LLaMA-Mesh", [23.4, 16.6, 24.4, 305, 696, 23.2, 13.2, 21.8, 298, 648, 23.8, 15.8, 37.9, 298, 646, 0.9]],
  ["NURBGen", [23.6, 7.3, 23.0, 736, 716, 23.4, 6.6, 19.6, 1198, 759, 24.1, 7.6, 23.7, 706, 660, 0.9]],
  ["ShapeCraft", [24.6, 20.6, 38.8, 378, 910, 24.9, 20.8, 39.6, 279, 1030, 25.1, 20.1, 42.0, 251, 922, 1.3]],
  ["Articraft", [28.0, 23.3, 58.8, 258, 1258, 27.8, 24.4, 59.0, 200, 1192, 27.8, 24.1, 60.6, 234, 1189, 3.0]],
  ["SurfScaff3D-Q", [26.8, 20.8, 51.6, 397, 1005, 26.9, 23.4, 59.6, 394, 1149, 28.1, 22.8, 60.5, 384, 1161, 0.0], true],
  ["SurfScaff3D-K", [28.9, 23.4, 66.9, 195, 1301, 29.2, 25.8, 61.7, 135, 1292, 28.8, 24.8, 65.1, 211, 1284, 0.0], true],
  ["SurfScaff3D", [29.2, 24.1, 66.6, 186, 1353, 28.9, 26.2, 61.7, 135, 1260, 28.5, 25.5, 64.8, 206, 1356, 0.0], true],
].map(([n, v, o]) => [n, v.map(x => x.toFixed(Number.isInteger(x) && x > 100 ? 0 : 1)).map(Number), o]), c => /↓/.test(c), true);
table($("t2"), [["", 5]], ["CLIP↑", "ULIP↑", "VQA↑", "FPD↓", "Fail %↓"], [
  ["LLaMA-Mesh", [26.6, 21.0, 32.4, 740, 62.2]],
  ["NURBGen", [24.9, 9.4, 42.6, 786, 1.1]],
  ["ShapeCraft", [25.9, 21.1, 59.7, 909, 31.1]],
  ["SurfScaff3D-K", [29.5, 25.6, 75.6, 426, 0.0], true],
], c => /↓/.test(c));
function groupedTable(el, cols, groups, lowerBetter) {
  const head = `<tr><th>Method</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;
  const body = groups.map(([g, rows]) => {
    const best = cols.map((c, j) => rows.map(r => +r[1][j]).reduce((a, b) => lowerBetter(c) ? Math.min(a, b) : Math.max(a, b)));
    return `<tr class="sub"><th colspan="${cols.length + 1}">${g}</th></tr>` + rows.map(([name, vals, ours]) =>
      `<tr class="${ours ? "ours" : ""}"><td>${name}</td>${vals.map((v, j) => `<td class="${+v === best[j] ? "best" : ""}">${v}</td>`).join("")}</tr>`).join("");
  }).join("");
  el.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}
groupedTable($("t3"), ["Chamfer↓", "F@0.05↑", "CLIP-I↑", "LPIPS↓"], [
  ["OmniObject3D", [
    ["CAD-Coder", ["0.154", "0.424", "66.1", "0.402"]],
    ["Articraft", ["0.096", "0.596", "67.7", "0.295"]],
    ["SurfScaff3D-K", ["0.084", "0.709", "71.0", "0.269"], true],
  ]],
  ["DeepCAD", [
    ["CAD-Coder", ["0.140", "0.464", "71.0", "0.400"]],
    ["Articraft", ["0.115", "0.570", "73.3", "0.347"]],
    ["SurfScaff3D-K", ["0.094", "0.642", "75.8", "0.319"], true],
  ]],
], c => /↓/.test(c));
document.querySelectorAll("table td").forEach(td => { if (/^\d+$/.test(td.textContent) && +td.textContent < 100) td.textContent = (+td.textContent).toFixed(1); });

$("copyBib").addEventListener("click", async () => {
  const b = $("copyBib");
  try { await navigator.clipboard.writeText($("bibText").textContent); b.textContent = "Copied"; }
  catch { const r = document.createRange(); r.selectNodeContents($("bibText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected, press Ctrl/Cmd+C"; }
  setTimeout(() => b.textContent = "Copy", 2000);
});
