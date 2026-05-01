// ── Shaders ──────────────────────────────────────────────────────────────────

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  // UNPACK_FLIP_Y_WEBGL=true: image top → texture t=1; y*0.5+0.5 maps clip top(+1)→UV(1)
  v_uv = vec2(a_pos.x * 0.5 + 0.5, a_pos.y * 0.5 + 0.5);
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

// ── Pixel Match Mask Shader ────────────────────────────────────────────────────
// Munsell HVC reference and tolerances are passed as uniforms.
// Converts each pixel's RGB to Munsell on the GPU and highlights matches in red.
const FS_MATCH_MASK = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_refH, u_refV, u_refC;  // reference Munsell H V C
uniform float u_tH, u_tV, u_tC;          // tolerance per component
in vec2 v_uv; out vec4 o;

const float XN = 0.95047, YN = 1.0, ZN = 1.08883;

// Convert display gamma RGB (0..1) to linear RGB
vec3 toLinear(vec3 c) {
  return vec3(
    c.r > 0.04045 ? pow((c.r + 0.055)/1.055, 2.4) : c.r/12.92,
    c.g > 0.04045 ? pow((c.g + 0.055)/1.055, 2.4) : c.g/12.92,
    c.b > 0.04045 ? pow((c.b + 0.055)/1.055, 2.4) : c.b/12.92
  );
}

// Convert linear RGB to XYZ
vec3 toXYZ(vec3 c) {
  return vec3(
    (c.r*0.4124 + c.g*0.3576 + c.b*0.1805) / XN,
    (c.r*0.2126 + c.g*0.7152 + c.b*0.0722) / YN,
    (c.r*0.0193 + c.g*0.1192 + c.b*0.9505) / ZN
  );
}

// XYZ to Lab
vec3 toLab(vec3 c) {
  float fx = c.x > 0.008856 ? pow(c.x, 1.0/3.0) : (7.787*c.x + 16.0/116.0);
  float fy = c.y > 0.008856 ? pow(c.y, 1.0/3.0) : (7.787*c.y + 16.0/116.0);
  float fz = c.z > 0.008856 ? pow(c.z, 1.0/3.0) : (7.787*c.z + 16.0/116.0);
  return vec3(116.0*fy - 16.0, 500.0*(fx - fy), 200.0*(fy - fz));
}

float hueDiff(float a, float b) {
  float d = abs(a - b);
  return min(d, 360.0 - d);
}

void main() {
  vec3 rgb = texture(u_tex, v_uv).rgb;
  vec3 linear = toLinear(rgb);
  vec3 xyz = toXYZ(linear);
  vec3 lab = toLab(xyz);

  float hueAngle = atan(lab.z, lab.y) * 180.0 / 3.14159265;
  float chroma  = sqrt(lab.y*lab.y + lab.z*lab.z);
  float value   = lab.x;

  bool match = hueDiff(hueAngle, u_refH) <= u_tH
    && abs(value - u_refV) <= u_tV
    && abs(chroma - u_refC) <= u_tC;

  // R=255 if match else 0 — o.y and o.z are unused
  o = match ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
}`

// ── GL helpers ────────────────────────────────────────────────────────────────

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
  for (const [n, v] of Object.entries(f32s))
    gl.uniform1f(gl.getUniformLocation(prog, n), v)
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
  const { gl, origTex, texA, texB, texC, colorGroupsTex } = state
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
    clarity=0, texture=0, lutIntensity=100,
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

  // Pass 4 — LUT (trilinear via GPU sampler3D)
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

/**
 * Run Munsell pixel match mask on GPU.
 * Renders a red dot overlay at every pixel whose Munsell HVC is within
 * tolerance of the reference (refH, refV, refC).
 * The result is a 1-channel mask RGBA8 texture — blit it to dstCtx and
 * read back pixel coordinates of non-zero fragments.
 *
 * Returns a promise that resolves with [{x, y}, ...] positions.
 */
export function runMatchMask(state, refH, refV, refC, tolerance = { h: 1, v: 0.15, c: 0.8 }) {
  const { gl, vbo, progs, origTex, matchMaskTex, matchMaskFBO, w, h } = state
  const Q = (prog, fbo, texs, f32s) => quad(gl, prog, vbo, w, h, fbo, texs, f32s)

  // Pass 1 — render mask into matchMaskFBO
  Q(progs.matchMask, matchMaskFBO, { u_tex: origTex }, {
    u_refH: refH,
    u_refV: refV,
    u_refC: refC,
    u_tH: tolerance.h,
    u_tV: tolerance.v,
    u_tC: tolerance.c,
  })

  // Blit to default framebuffer so we can read pixels
  Q(progs.blit, null, { u_tex: matchMaskTex }, {})

  // Read pixels from GPU (RGBA8, will be 0 or 255 in R channel for matches)
  const pixels = new Uint8Array(w * h * 4)
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // Extract matching coordinates (R channel > 0)
  const positions = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pixels[(y * w + x) * 4] > 128) {
        positions.push({ x, y })
      }
    }
  }
  return positions
}
