// ── Shaders ──────────────────────────────────────────────────────────────────

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FS_DEVELOP = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_temp, u_tint, u_exp, u_cont;
uniform float u_hi, u_sh, u_wh, u_bl;
uniform float u_dh, u_vib, u_sat;
in vec2 v_uv; out vec4 o;
float lm(vec3 c){ return 0.2126*c.r + 0.7152*c.g + 0.0722*c.b; }
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  // Temperature / Tint
  c.r = clamp(c.r + u_temp*(40.0/255.0) - u_tint*(12.0/255.0), 0.0, 1.0);
  c.g = clamp(c.g + u_temp*(8.0/255.0)  + u_tint*(30.0/255.0), 0.0, 1.0);
  c.b = clamp(c.b - u_temp*(40.0/255.0) - u_tint*(12.0/255.0), 0.0, 1.0);
  // Exposure
  if (u_exp != 0.0) c = clamp(c * pow(2.0, u_exp), 0.0, 1.0);
  // Contrast
  if (u_cont != 0.0) {
    float cf = u_cont > 0.0 ? 1.0 + u_cont*0.02 : 1.0 + u_cont*0.01;
    c = clamp((c - 0.5020)*cf + 0.5020, 0.0, 1.0);
  }
  // Highlights / Shadows / Whites / Blacks — each recomputes luminance
  { float l = lm(c); if (u_hi!=0.0){ float m=max(0.0,(l-0.502)/0.498); c=clamp(c+u_hi*(60.0/25500.0)*m,0.0,1.0); } }
  { float l = lm(c); if (u_sh!=0.0){ float m=max(0.0,(0.502-l)/0.502); c=clamp(c+u_sh*(60.0/25500.0)*m,0.0,1.0); } }
  { float l = lm(c); if (u_wh!=0.0){ float m=max(0.0,(l-0.753)/0.247); c=clamp(c+u_wh*(40.0/25500.0)*m,0.0,1.0); } }
  { float l = lm(c); if (u_bl!=0.0){ float m=max(0.0,(0.251-l)/0.251); c=clamp(c+u_bl*(40.0/25500.0)*m,0.0,1.0); } }
  // Dehaze
  if (u_dh != 0.0) {
    float d = u_dh*0.01;
    c = clamp((c-0.5020)*(1.0+d*0.5)+0.5020, 0.0, 1.0);
    float g = lm(c);
    c = clamp(vec3(g)+(c-g)*(1.0+d*0.4), 0.0, 1.0);
  }
  // Vibrance
  if (u_vib != 0.0) {
    float g = lm(c);
    float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b));
    float sat = mx > 0.0 ? (mx-mn)/mx : 0.0;
    c = clamp(vec3(g)+(c-g)*(1.0+u_vib*0.01*(1.0-sat)), 0.0, 1.0);
  }
  // Saturation
  if (u_sat != 0.0) {
    float g = lm(c);
    c = clamp(vec3(g)+(c-g)*(1.0+u_sat*0.01), 0.0, 1.0);
  }
  o = vec4(c, 1.0);
}`

const FS_BLIT = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv; out vec4 o;
void main() { o = texture(u_tex, v_uv); }`

const FS_BLUR_H = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform float u_tw;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 s = vec3(0.0);
  for (int i = -10; i <= 10; i++) s += texture(u_tex, v_uv + vec2(float(i)*u_tw, 0.0)).rgb;
  o = vec4(s * (1.0/21.0), 1.0);
}`

const FS_BLUR_V = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform float u_th;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 s = vec3(0.0);
  for (int i = -10; i <= 10; i++) s += texture(u_tex, v_uv + vec2(0.0, float(i)*u_th)).rgb;
  o = vec4(s * (1.0/21.0), 1.0);
}`

const FS_CLARITY = `#version 300 es
precision highp float;
uniform sampler2D u_orig, u_blur; uniform float u_amt;
in vec2 v_uv; out vec4 o;
float lm(vec3 c){ return 0.2126*c.r + 0.7152*c.g + 0.0722*c.b; }
void main() {
  vec3 a = texture(u_orig, v_uv).rgb;
  vec3 b = texture(u_blur, v_uv).rgb;
  float mid = 1.0 - abs(lm(a) - 0.502) / 0.502;
  o = vec4(clamp(a + (a-b)*(u_amt*0.01)*mid, 0.0, 1.0), 1.0);
}`

const FS_TEXTURE = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform float u_amt, u_tw, u_th;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb, s = vec3(0.0);
  for (int dy=-1; dy<=1; dy++) for (int dx=-1; dx<=1; dx++)
    s += texture(u_tex, v_uv + vec2(float(dx)*u_tw, float(dy)*u_th)).rgb;
  o = vec4(clamp(c + (c - s*(1.0/9.0))*(u_amt*0.01), 0.0, 1.0), 1.0);
}`

const FS_SHARPEN = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform float u_amt, u_tw, u_th;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 c  = texture(u_tex, v_uv).rgb;
  vec3 n  = texture(u_tex, v_uv + vec2(0.0,      u_th)).rgb;
  vec3 s  = texture(u_tex, v_uv - vec2(0.0,      u_th)).rgb;
  vec3 e  = texture(u_tex, v_uv + vec2(u_tw,     0.0 )).rgb;
  vec3 w  = texture(u_tex, v_uv - vec2(u_tw,     0.0 )).rgb;
  vec3 m  = (n + s + e + w) * 0.25;
  o = vec4(clamp(c + (c - m) * (u_amt * 0.02), 0.0, 1.0), 1.0);
}`

const FS_VALUE_GROUPS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_steps;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  float lum = 0.2126*c.r + 0.7152*c.g + 0.0722*c.b;
  float group = min(u_steps - 1.0, floor(lum * u_steps));
  float t = group / (u_steps - 1.0);
  float gray = 0.02 + t * 0.98;
  o = vec4(gray, gray, gray, 1.0);
}`

const FS_LUT = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform highp sampler3D u_lut;
uniform float u_intensity, u_lutN;
in vec2 v_uv; out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  vec3 tc = (c * (u_lutN - 1.0) + 0.5) / u_lutN;  // remap to texel centers
  o = vec4(mix(c, texture(u_lut, tc).rgb, u_intensity), 1.0);
}`

const FS_MATCH_MASK = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec3 u_refLab;
uniform float u_tLab;
in vec2 v_uv; out vec4 o;

const float XN = 0.95047, YN = 1.0, ZN = 1.08883;

vec3 toLinear(vec3 c) {
  return vec3(
    c.r > 0.04045 ? pow((c.r + 0.055)/1.055, 2.4) : c.r/12.92,
    c.g > 0.04045 ? pow((c.g + 0.055)/1.055, 2.4) : c.g/12.92,
    c.b > 0.04045 ? pow((c.b + 0.055)/1.055, 2.4) : c.b/12.92
  );
}

vec3 toXYZ(vec3 c) {
  return vec3(
     c.r*0.4124564 + c.g*0.3575761 + c.b*0.1804375,
     c.r*0.2126729 + c.g*0.7151522 + c.b*0.0721750,
     c.r*0.0193339 + c.g*0.1191920 + c.b*0.9503041
  );
}

float f_lab(float t) {
  return t > 0.00885645 ? pow(t, 1.0/3.0) : (7.787037 * t + 16.0/116.0);
}

vec3 toLab(vec3 xyz) {
  float fx = f_lab(xyz.x / XN);
  float fy = f_lab(xyz.y / YN);
  float fz = f_lab(xyz.z / ZN);
  return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
}

void main() {
  if (v_uv.x < 0.0 || v_uv.x > 1.0 || v_uv.y < 0.0 || v_uv.y > 1.0) {
    o = vec4(0.0); return;
  }
  vec3 rgb = texture(u_tex, v_uv).rgb;
  vec3 lab = toLab(toXYZ(toLinear(rgb)));
  float dist = distance(lab, u_refLab);
  o = dist <= u_tLab ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0);
}`

function getRefLab(r, g, b) {
  const rn = r/255, gn = g/255, bn = b/255
  const rl = rn > 0.04045 ? Math.pow((rn + 0.055)/1.055, 2.4) : rn/12.92
  const gl2 = gn > 0.04045 ? Math.pow((gn + 0.055)/1.055, 2.4) : gn/12.92
  const bl = bn > 0.04045 ? Math.pow((bn + 0.055)/1.055, 2.4) : bn/12.92
  const x = rl*0.4124564 + gl2*0.3575761 + bl*0.1804375
  const y = rl*0.2126729 + gl2*0.7151522 + bl*0.0721750
  const z = rl*0.0193339 + gl2*0.1191920 + bl*0.9503041
  const f = t => t > 0.00885645 ? Math.pow(t, 1/3) : (7.787037*t + 16/116)
  return [116 * f(y/1.0) - 16, 500 * (f(x/0.95047) - f(y/1.0)), 200 * (f(y/1.0) - f(z/1.08883))]
}

function mkProg(gl, fsrc) {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vs, VS); gl.compileShader(vs)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fs, fsrc); gl.compileShader(fs)
  const p = gl.createProgram()
  gl.attachShader(p, vs); gl.attachShader(p, fs)
  gl.linkProgram(p)
  gl.deleteShader(vs); gl.deleteShader(fs)
  return p
}

function mkTex(gl, w, h) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}

function mkFBO(gl, tex) {
  const f = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, f)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return f
}

// Draw a fullscreen quad to fbo (null = default canvas framebuffer)
// texs: { uniformName: texture } — 'u_lut' is bound as TEXTURE_3D, others as TEXTURE_2D
// f32s: { uniformName: float }
function quad(gl, prog, vbo, w, h, fbo, texs, f32s) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.viewport(0, 0, w, h)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  const a = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(a)
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  let unit = 0
  for (const [n, t] of Object.entries(texs)) {
    if (!t) continue
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(n === 'u_lut' ? gl.TEXTURE_3D : gl.TEXTURE_2D, t)
    gl.uniform1i(gl.getUniformLocation(prog, n), unit++)
  }
  for (const [n, v] of Object.entries(f32s)) {
    if (Array.isArray(v)) {
      gl.uniform3fv(gl.getUniformLocation(prog, n), v)
    } else {
      gl.uniform1f(gl.getUniformLocation(prog, n), v)
    }
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Create GL context, compile shaders, allocate buffers. Call once on mount. */
export function initGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  })
  if (!gl) return null

  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

  const progs = {
    develop: mkProg(gl, FS_DEVELOP),
    blit:    mkProg(gl, FS_BLIT),
    blurH:   mkProg(gl, FS_BLUR_H),
    blurV:   mkProg(gl, FS_BLUR_V),
    clarity: mkProg(gl, FS_CLARITY),
    texture: mkProg(gl, FS_TEXTURE),
    sharpen: mkProg(gl, FS_SHARPEN),
    lut:        mkProg(gl, FS_LUT),
    valueGroups: mkProg(gl, FS_VALUE_GROUPS),
    matchMask: mkProg(gl, FS_MATCH_MASK),
  }

  const origTex = mkTex(gl, 1, 1)
  const texA = mkTex(gl, 1, 1)
  const texB = mkTex(gl, 1, 1)
  const texC = mkTex(gl, 1, 1)
  const colorGroupsTex = mkTex(gl, 1, 1)
  const matchMaskTex = mkTex(gl, 1, 1)
  const fboA = mkFBO(gl, texA)
  const fboB = mkFBO(gl, texB)
  const fboC = mkFBO(gl, texC)
  const matchMaskFBO = mkFBO(gl, matchMaskTex)

  return { gl, canvas, vbo, progs, origTex, texA, texB, texC, colorGroupsTex, matchMaskTex, matchMaskFBO, fboA, fboB, fboC, w: 1, h: 1, lutTex: null, lutSize: 0 }
}

/** Upload a new image (HTMLImageElement). Resizes ping-pong textures if needed. */
export function uploadImage(state, imgEl) {
  const { gl, origTex, texA, texB, texC, colorGroupsTex, matchMaskTex } = state
  const w = imgEl.naturalWidth  || imgEl.width
  const h = imgEl.naturalHeight || imgEl.height

  state.canvas.width  = w
  state.canvas.height = h
  state.w = w
  state.h = h

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.bindTexture(gl.TEXTURE_2D, origTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, imgEl)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

  for (const tex of [texA, texB, texC, colorGroupsTex, matchMaskTex]) {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  }
}

/** Upload k-means analyzed pixels to the colorGroups texture. */
export function uploadColorGroups(state, pixels, w, h) {
  const { gl, colorGroupsTex } = state
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.bindTexture(gl.TEXTURE_2D, colorGroupsTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixels))
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
}

/** Create or replace the 3D LUT texture. Call when lutData changes. */
export function updateLUT(state, lutData, lutSize) {
  const { gl } = state
  if (state.lutTex) { gl.deleteTexture(state.lutTex); state.lutTex = null }
  state.lutSize = 0
  if (!lutData || lutSize <= 1) return

  const n = lutSize * lutSize * lutSize
  const rgba = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    rgba[i*4]   = Math.round(lutData[i*3]   * 255)
    rgba[i*4+1] = Math.round(lutData[i*3+1] * 255)
    rgba[i*4+2] = Math.round(lutData[i*3+2] * 255)
    rgba[i*4+3] = 255
  }

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_3D, tex)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, lutSize, lutSize, lutSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)

  state.lutTex  = tex
  state.lutSize = lutSize
}

/**
 * Run the full develop pipeline on GPU and blit result to dstCtx (2D canvas context).
 * params: { temperature, tint, exposure, contrast, highlights, shadows, whites, blacks,
 *           dehaze, vibrance, saturation, clarity, texture, lutIntensity }
 */
export function runDevelop(state, params, dstCtx, sourceTex) {
  const { gl, vbo, progs, origTex, texA, texB, texC, fboA, fboB, fboC, w, h, lutTex, lutSize } = state
  const {
    temperature=0, tint=0, exposure=0, contrast=0,
    highlights=0,  shadows=0, whites=0, blacks=0,
    dehaze=0, vibrance=0, saturation=0,
    clarity=0, texture=0, sharpen=0, lutIntensity=100,
  } = params

  const Q = (prog, fbo, texs, f32s) => quad(gl, prog, vbo, w, h, fbo, texs, f32s)
  const texs = [texA, texB, texC]
  const fbos = [fboA, fboB, fboC]

  // Pass 1 — develop (all pixel-wise ops) → texA
  // sourceTex allows Color Groups output to be the pipeline input
  const inputTex = sourceTex || origTex
  Q(progs.develop, fbos[0], { u_tex: inputTex }, {
    u_temp: temperature / 100,
    u_tint: tint       / 100,
    u_exp:  exposure,
    u_cont: contrast,
    u_hi:   highlights,
    u_sh:   shadows,
    u_wh:   whites,
    u_bl:   blacks,
    u_dh:   dehaze,
    u_vib:  vibrance,
    u_sat:  saturation,
  })
  let src = 0   // current result is in texs[src]

  // Pass 2 — clarity (2-pass separable blur + unsharp midtone mask)
  if (clarity !== 0) {
    Q(progs.blit,    fbos[2], { u_tex: texs[0] }, {})                            // save develop → texC
    Q(progs.blurH,   fbos[1], { u_tex: texs[0] }, { u_tw: 1 / w })               // horiz blur → texB
    Q(progs.blurV,   fbos[0], { u_tex: texs[1] }, { u_th: 1 / h })               // vert blur  → texA
    Q(progs.clarity, fbos[1], { u_orig: texs[2], u_blur: texs[0] }, { u_amt: clarity }) // → texB
    src = 1
  }

  // Pass 3 — texture (3×3 fine-detail unsharp)
  if (texture !== 0) {
    const dst = src ^ 1
    Q(progs.texture, fbos[dst], { u_tex: texs[src] }, { u_amt: texture, u_tw: 1 / w, u_th: 1 / h })
    src = dst
  }

  // Pass 4 — sharpen (cross-neighbourhood median)
  if (sharpen !== 0) {
    const dst = src ^ 1
    Q(progs.sharpen, fbos[dst], { u_tex: texs[src] }, { u_amt: sharpen, u_tw: 1 / w, u_th: 1 / h })
    src = dst
  }

  // Pass 5 — LUT (trilinear via GPU sampler3D)
  if (lutTex && lutSize > 1) {
    const dst = src ^ 1
    Q(progs.lut, fbos[dst], { u_tex: texs[src], u_lut: lutTex }, {
      u_intensity: lutIntensity / 100,
      u_lutN: lutSize,
    })
    src = dst
  }

  // Final blit → default framebuffer (GL canvas)
  Q(progs.blit, null, { u_tex: texs[src] }, {})

  // Copy result to the 2D display canvas
  if (dstCtx) dstCtx.drawImage(state.canvas, 0, 0)
}

/** Quantize image into N luminance groups (grayscale), optionally soften edges, blit to dstCtx. */
export function runValueGroups(state, steps, soften, dstCtx) {
  const { gl, vbo, progs, origTex, texA, texB, fboA, fboB, w, h } = state
  const Q = (prog, fbo, texs, f32s) => quad(gl, prog, vbo, w, h, fbo, texs, f32s)
  Q(progs.valueGroups, fboA, { u_tex: origTex }, { u_steps: steps })
  if (soften > 0) {
    const scale = soften / 5  // soften=5 → 10px radius, soften=20 → 40px
    Q(progs.blurH, fboB, { u_tex: texA }, { u_tw: scale / w })
    Q(progs.blurV, fboA, { u_tex: texB }, { u_th: scale / h })
  }
  Q(progs.blit, null, { u_tex: texA }, {})
  if (dstCtx) dstCtx.drawImage(state.canvas, 0, 0)
}

export function runMatchMask(state, refR, refG, refB, tolerance = 1.0, scale = 0.5) {
  const { gl, vbo, progs, origTex, matchMaskTex, matchMaskFBO, w, h } = state
  const sw = Math.floor(w * scale)
  const sh = Math.floor(h * scale)

  // Resize mask texture and FBO to downsample resolution
  gl.bindTexture(gl.TEXTURE_2D, matchMaskTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, matchMaskFBO)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, matchMaskTex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  // Compute reference Lab* using the helper (matches shader exactly)
  const refLab = getRefLab(refR, refG, refB)
  const Q = (prog, fbo, texs, f32s) => quad(gl, prog, vbo, sw, sh, fbo, texs, f32s)
  Q(progs.matchMask, matchMaskFBO, { u_tex: origTex }, {
    u_refLab: [refLab[0], refLab[1], refLab[2]],
    u_tLab: tolerance,
  })
  Q(progs.blit, null, { u_tex: matchMaskTex }, {})

  const pixels = new Uint8Array(sw * sh * 4)
  gl.readPixels(0, 0, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  const positions = []
  let nonzero = 0
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (pixels[(y * sw + x) * 4] > 128) {
        // flip y because WebGL reads from bottom-left, image has y=0 at top
        positions.push({ x: Math.round(((x + 0.5) / sw) * w), y: Math.round((1.0 - (y + 0.5) / sh) * h) })
        nonzero++
      }
    }
  }

  // Restore mask FBO to full resolution
  gl.bindTexture(gl.TEXTURE_2D, matchMaskTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, matchMaskFBO)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, matchMaskTex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  console.warn('runMatchMask: refLab', refLab[0].toFixed(1), refLab[1].toFixed(1), refLab[2].toFixed(1), 'tol', tolerance, '→', nonzero, 'matches of', sw * sh)
  return positions
}

/** Draw match mask directly onto the main canvas via alpha blending (for debugging positioning). */
export function drawMatchOverlay(state, refR, refG, refB, tolerance = 4.0) {
  const { gl, vbo, progs, origTex, w, h } = state
  const refLab = getRefLab(refR, refG, refB)

  // Blit the developed image to screen first
  const Q = (prog, fbo, texs, f32s) => quad(gl, prog, vbo, w, h, fbo, texs, f32s)
  const srcTex = state.texA // last developed result
  Q(progs.blit, null, { u_tex: srcTex }, {})

  // Now blend the red mask directly on top
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  Q(progs.matchMask, null, { u_tex: origTex }, {
    u_refLab: [refLab[0], refLab[1], refLab[2]],
    u_tLab: tolerance,
  })
  gl.disable(gl.BLEND)

  console.warn('drawMatchOverlay: refLab', refLab[0].toFixed(1), refLab[1].toFixed(1), refLab[2].toFixed(1), 'tol', tolerance)
}
