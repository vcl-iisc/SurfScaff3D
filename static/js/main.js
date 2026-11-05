"use strict";
function whenNear(el, fn) {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "600px 0px" });
  io.observe(el);
}
if (window.THREE) {
  initExplorer();
  initPlayground();
  whenNear($("edStage"), () => initEdits().catch(e => stageStatus($("edStage"), "Could not load the edits (" + e.message + ")")));
} else {
  document.querySelectorAll(".stage .loading").forEach(e => e.textContent = "The 3D viewer could not load three.js from cdn.jsdelivr.net.");
}
initGallery();
