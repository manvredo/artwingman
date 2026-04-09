function labToXyz(L, a, b) {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
  const f = t => t > 0.206897 ? t * t * t : (t - 16 / 116) / 7.787
  const fy = (L + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200
  return { x: Xn * f(fx), y: Yn * f(fy), z: Zn * f(fz) }
}

export function labToRgb(L, a, b) {
  const { x, y, z } = labToXyz(L, a, b)
  let r =  3.2406 * x - 1.5372 * y - 0.4986 * z
  let g = -0.9689 * x + 1.8758 * y + 0.0415 * z
  let bv =  0.0557 * x - 0.2040 * y + 1.0570 * z
  const gamma = v => v > 0.0031308 ? 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055 : 12.92 * v
  return {
    r: Math.round(Math.max(0, Math.min(255, gamma(r) * 255))),
    g: Math.round(Math.max(0, Math.min(255, gamma(g) * 255))),
    b: Math.round(Math.max(0, Math.min(255, gamma(bv) * 255))),
  }
}

function rgbToXyz(r, g, b) {
  let R = r / 255, G = g / 255, B = b / 255
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92
  return {
    x: R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    y: R * 0.2126729 + G * 0.7151522 + B * 0.0721750,
    z: R * 0.0193339 + G * 0.1191920 + B * 0.9503041,
  }
}

function xyzToLab(x, y, z) {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  return {
    L: 116 * f(y / Yn) - 16,
    a: 500 * (f(x / Xn) - f(y / Yn)),
    b: 200 * (f(y / Yn) - f(z / Zn)),
  }
}

export function rgbToMunsell(r, g, b) {
  const xyz = rgbToXyz(r, g, b)
  const lab = xyzToLab(xyz.x, xyz.y, xyz.z)
  const value = Math.max(0, Math.min(10, lab.L / 10))
  const chromaC = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  const chroma = Math.max(0, chromaC / 5)
  let hueAngle = Math.atan2(lab.b, lab.a) * (180 / Math.PI)
  hueAngle = ((hueAngle + 360) % 360)
  const hueNames = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP']
  const hueAngles = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]
  let closest = 0, minDiff = 999
  for (let i = 0; i < hueAngles.length; i++) {
    let diff = Math.abs(hueAngle - hueAngles[i])
    if (diff > 180) diff = 360 - diff
    if (diff < minDiff) { minDiff = diff; closest = i }
  }
  const prevAngle = hueAngles[(closest + 9) % 10]
  const nextAngle = hueAngles[(closest + 1) % 10]
  let range = nextAngle - prevAngle
  if (range < 0) range += 360
  let pos = hueAngle - prevAngle
  if (pos < 0) pos += 360
  const huePct = Math.max(1, Math.min(10, Math.round((pos / range) * 10)))
  return {
    hue: `${huePct}${hueNames[closest]}`,
    hueName: hueNames[closest],
    hueAngle,
    value: parseFloat(value.toFixed(1)),
    chroma: parseFloat(chroma.toFixed(1)),
    lab: { L: lab.L, a: lab.a, b: lab.b },
  }
}

// Reconstruct an RGB color from quantized Munsell HVC (value rounded to 1dp,
// chroma rounded to 1dp, hue snapped to Munsell step) for visual comparison.
export function munsellHvcToRgb(hue, value, chroma) {
  const hueNames  = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP']
  const hueAngles = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]
  const match = String(hue).match(/^(\d+(?:\.\d+)?)(R|YR|Y|GY|G|BG|B|PB|P|RP)$/)
  if (!match) return null
  const huePct = parseFloat(match[1])
  const idx = hueNames.indexOf(match[2])
  if (idx === -1) return null
  const prevAngle = hueAngles[(idx + 9) % 10]
  let nextAngle   = hueAngles[(idx + 1) % 10]
  let range = nextAngle - prevAngle
  if (range <= 0) range += 360
  const hueAngle = (prevAngle + (huePct / 10) * range + 360) % 360
  const L = value * 10
  const magnitude = chroma * 5
  const rad = hueAngle * Math.PI / 180
  return labToRgb(L, magnitude * Math.cos(rad), magnitude * Math.sin(rad))
}

export function chromaDescription(c) {
  if (c < 1.5) return 'neutral / gray'
  if (c < 4) return 'muted'
  if (c < 7) return 'moderate'
  if (c < 11) return 'strong'
  return 'very saturated'
}

export function valueDescription(v) {
  if (v < 2) return 'very dark'
  if (v < 4) return 'dark'
  if (v < 6) return 'mid'
  if (v < 8) return 'light'
  return 'very light'
}

export function samplePixels(imageData, cx, cy, radius, imgW, imgH) {
  let r = 0, g = 0, b = 0, n = 0
  const x0 = Math.max(0, cx - radius)
  const x1 = Math.min(imgW - 1, cx + radius)
  const y0 = Math.max(0, cy - radius)
  const y1 = Math.min(imgH - 1, cy + radius)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * imgW + x) * 4
      r += imageData.data[i]
      g += imageData.data[i + 1]
      b += imageData.data[i + 2]
      n++
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}