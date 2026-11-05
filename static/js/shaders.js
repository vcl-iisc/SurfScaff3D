"use strict";
const FS_QUAD_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const HIGHP = `precision highp float;\nprecision highp int;\nprecision highp sampler2D;\n`;
const OUT_FS = HIGHP + `
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth;
uniform vec2 resolution; uniform float cameraNear; uniform float cameraFar;
uniform float cavValley; uniform float cavRidge; uniform float cavPx; uniform float exposure;
uniform float stepLine; uniform float stepPx;
varying vec2 vUv;
float viewZ(float d) { return (cameraNear * cameraFar) / ((cameraFar - cameraNear) * d - cameraFar); }
vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
vec3 nb(vec2 uv, vec3 n0, float z0) {
  float d = texture2D(tDepth, uv).x;
  if (d >= 1.0 || abs(viewZ(d) - z0) > 0.08) return n0;
  return nrm(uv);
}
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) {
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c *= exposure / 0.6; c = OUT * RRTAndODTFit(IN * c); return clamp(c, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
void main() {
  vec4 c = texture2D(tColor, vUv);
  if (c.a <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 col = c.rgb / c.a;
  float d = texture2D(tDepth, vUv).x;
  if (d < 1.0) {
    float z0 = viewZ(d);
    vec2 px = vec2(cavPx) / resolution;
    vec3 n0 = nrm(vUv);
    float curv = (nb(vUv + vec2(px.x, 0.0), n0, z0).x - nb(vUv - vec2(px.x, 0.0), n0, z0).x)
               + (nb(vUv + vec2(0.0, px.y), n0, z0).y - nb(vUv - vec2(0.0, px.y), n0, z0).y);
    float ridge = smoothstep(0.2, 0.9, curv), valley = smoothstep(0.2, 0.9, -curv);
    vec2 sp = vec2(stepPx) / resolution; float lap = 0.0;
    for (int k = 0; k < 4; k++) {
      vec2 o = k == 0 ? vec2(sp.x, 0.0) : k == 1 ? vec2(0.0, sp.y) : k == 2 ? vec2(sp.x, sp.y) : vec2(sp.x, -sp.y);
      float da = texture2D(tDepth, vUv + o).x, db = texture2D(tDepth, vUv - o).x;
      if (da >= 1.0 || db >= 1.0) continue;
      lap = max(lap, abs(viewZ(da) + viewZ(db) - 2.0 * z0));
    }
    float stepEdge = smoothstep(0.0010, 0.0035, lap / max(-z0, 1e-3));
    col *= (1.0 - cavValley * valley) * (1.0 + cavRidge * ridge) * (1.0 - stepLine * stepEdge);
  }
  gl_FragColor = vec4(srgb(aces(col)) * c.a, c.a);
}`;
