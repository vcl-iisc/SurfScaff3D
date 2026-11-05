"use strict";
class Post {
  constructor(renderer) {
    this.r = renderer;
    const hdr = renderer.capabilities.isWebGL2 && renderer.extensions.has("EXT_color_buffer_float") ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.rtColor = new THREE.WebGLRenderTarget(1, 1, { type: hdr, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
    this.rtNormal = new THREE.WebGLRenderTarget(1, 1);
    this.rtNormal.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.PlaneGeometry(2, 2), res = new THREE.Vector2(1, 1);
    this.outMat = new THREE.ShaderMaterial({ vertexShader: FS_QUAD_VS, fragmentShader: OUT_FS, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: this.rtColor.texture }, tNormal: { value: this.rtNormal.texture },
        tDepth: { value: this.rtNormal.depthTexture }, resolution: { value: res }, cameraNear: { value: 0.1 }, cameraFar: { value: 10 },
        cavValley: { value: 0.5 }, cavRidge: { value: 0.3 }, cavPx: { value: 1.5 }, exposure: { value: 1 },
        stepLine: { value: 0.5 }, stepPx: { value: 1 } } });
    this.outScene = new THREE.Scene(); this.outScene.add(new THREE.Mesh(quad, this.outMat));
    this.res = res;
  }
  setSize(w, h, pixelRatio) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    [this.rtColor, this.rtNormal].forEach(rt => rt.setSize(w, h));
    this.res.set(w, h); this.outMat.uniforms.cavPx.value = 1.25 * (pixelRatio || 1); this.outMat.uniforms.stepPx.value = pixelRatio || 1;
  }
  render(scene, camera, viewer) {
    const r = this.r, L = viewer.look, U = this.outMat.uniforms;
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.rtColor); r.clear(); r.render(scene, camera);
    const groundVis = viewer.ground.visible; viewer.ground.visible = false;
    scene.overrideMaterial = this.normalMat;
    r.setClearColor(0x8080ff, 0); r.setRenderTarget(this.rtNormal); r.clear(); r.render(scene, camera);
    scene.overrideMaterial = null; viewer.ground.visible = groundVis;
    U.cameraNear.value = camera.near; U.cameraFar.value = camera.far; U.exposure.value = L.exposure;
    U.cavValley.value = L.cavValley; U.cavRidge.value = L.cavRidge; U.stepLine.value = L.stepLine;
    r.setClearColor(0x000000, 0); r.setRenderTarget(null); r.clear(); r.render(this.outScene, this.cam);
  }
}

class Viewer {
  constructor(stage) {
    this.stage = stage;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x50555e, 0.2); this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1); this.key.position.set(-1.6, 3.2, 2.2);
    this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048); this.key.shadow.bias = -0.0003; this.key.shadow.normalBias = 0.012;
    Object.assign(this.key.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.5, far: 10 });
    this.fill = new THREE.DirectionalLight(0xffffff, 0.3); this.fill.position.set(2.6, 1.0, 1.6);
    this.rim = new THREE.DirectionalLight(0xdfe8ff, 0); this.rim.position.set(0.6, 2.2, -3.0);
    this.scene.add(this.key, this.fill, this.rim);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.2 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.scene.add(this.ground);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12;
    this.controls.enableZoom = false;
    this.controls.addEventListener("change", () => this.dirty = true);
    this.outer = new THREE.Group(); this.outer.rotation.x = -Math.PI / 2; this.scene.add(this.outer);
    this.spin = new THREE.Group(); this.outer.add(this.spin);
    this.group = new THREE.Group(); this.spin.add(this.group);
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide,
      envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.post = new Post(this.renderer);
    this.dirty = true;
    this.applyLook(currentLook);
    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
    const loop = () => { requestAnimationFrame(loop); const moved = this.controls.update(); if (moved || this.dirty) { this.fitDepthRange(); this.post.render(this.scene, this.camera, this); this.dirty = false; } };
    loop();
  }
  fitDepthRange() {
    const d = this.camera.position.distanceTo(this.controls.target);
    const near = Math.max(0.02, d - 1.6), far = d + 3.0;
    if (Math.abs(this.camera.near - near) > 1e-4 || Math.abs(this.camera.far - far) > 1e-4) {
      this.camera.near = near; this.camera.far = far; this.camera.updateProjectionMatrix();
    }
  }
  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio(); this.post.setSize(w * pr, h * pr, pr); this.dirty = true;
  }
  applyLook(name) {
    const L = LOOKS[name] || LOOKS.paper; this.look = L;
    this.stage.style.background = `radial-gradient(120% 95% at 50% 28%, ${L.bg[0]}, ${L.bg[1]})`;
    this.hemi.intensity = L.hemi; this.key.intensity = L.key; this.fill.intensity = L.fill; this.rim.intensity = L.rim;
    this.material.envMapIntensity = L.env; this.ground.material.opacity = L.shadow;
    if (this.model) { this.model.look = L; this.model.paint(); }
    this.dirty = true;
  }
  setModel(model, view, opts = {}) {
    this.group.clear();
    this.model = model; model.look = this.look; model.paint();
    this.mesh = new THREE.Mesh(model.geom, this.material); this.mesh.castShadow = true;
    this.group.add(this.mesh);
    const [lo, hi] = opts.bbox || model.meta.bbox, c = lo.map((v, i) => (v + hi[i]) / 2);
    const r = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
    this.group.scale.setScalar(1 / r);
    this.group.position.set(-c[0] / r, -c[1] / r, -c[2] / r);
    this.ground.position.y = (lo[2] - c[2]) / r - 0.003;
    this.spin.rotation.z = ((opts.yaw || 0) * Math.PI) / 180;
    if (!opts.keepCamera) {
      const dist = 1.0 / Math.sin((this.camera.fov * Math.PI) / 360);
      const dir = new THREE.Vector3(...(view || [0.62, 0.55, 1.0])).normalize();
      this.camera.position.copy(dir.multiplyScalar(dist)); this.camera.near = dist / 50; this.camera.far = dist * 10;
      this.camera.updateProjectionMatrix(); this.controls.target.set(0, 0, 0); this.controls.update();
    }
    this.dirty = true;
  }
  pick(ev) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    if (!this.mesh) return -1;
    const hit = ray.intersectObject(this.mesh, false)[0];
    return hit ? this.model.patchOfFace(hit.faceIndex) : -1;
  }
}

const $ = id => document.getElementById(id);
function chipGroup(el, items, onPick) {
  el.innerHTML = "";
  items.forEach((it, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.innerHTML = it.label + (it.n != null ? `<span class="n">${it.n}</span>` : "");
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { [...el.children].forEach(c => c.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onPick(it, i); });
    el.appendChild(b);
  });
  return i => el.children[i] && el.children[i].click();
}
function stageStatus(stage, text) {
  let s = stage.querySelector(".status"); if (!s) { s = document.createElement("div"); s.className = "status"; stage.appendChild(s); }
  s.textContent = text;
}
const esc = t => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function hpsText(meta, idxs, max = 3) {
  const list = idxs.slice(0, max).map(i => meta.patches[i].hps).map(t => {
    const [first, ...rest] = t.split("\n"); return `<span class="lbl">${esc(first)}</span>\n${esc(rest.join("\n"))}`;
  });
  const more = idxs.length > max ? `\n\n… ${idxs.length - max} more patch${idxs.length - max === 1 ? "" : "es"} in this part` : "";
  return list.join("\n\n") + more;
}
