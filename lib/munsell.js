import munsell from 'munsell'

// Convert RGB (0-255) to Munsell HVC with hue name and angle
export function rgbToMunsell(r, g, b) {
  const [hueAngle, value, chroma] = munsell.rgb255ToMhvc(r, g, b)
  const hueStr = munsell.mhvcToMunsell(hueAngle, value, chroma)
  const hueNames = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP']
  const hueAngles = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]
  const ha = (hueAngle + 360) % 360
  let closest = 0, minDiff = 999
  for (let i = 0; i < hueAngles.length; i++) {
    let diff = Math.abs(ha - hueAngles[i])
    if (diff > 180) diff = 360 - diff
    if (diff < minDiff) { minDiff = diff; closest = i }
  }
  return {
    hue: hueStr,
    hueName: hueNames[closest],
    hueAngle: ha,
    value: parseFloat(value.toFixed(1)),
    chroma: parseFloat(chroma.toFixed(1)),
  }
}

// RGB (0-255) → exact Munsell match via munsell.js library
export function rgbToMunsellExact(r, g, b) {
  const [hueAngle, value, chroma] = munsell.rgb255ToMhvc(r, g, b)
  const hueStr = munsell.mhvcToMunsell(hueAngle, value, chroma)
  const hueNames = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP']
  const hueAngles = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]
  const ha = (hueAngle + 360) % 360
  let closest = 0, minDiff = 999
  for (let i = 0; i < hueAngles.length; i++) {
    let diff = Math.abs(ha - hueAngles[i])
    if (diff > 180) diff = 360 - diff
    if (diff < minDiff) { minDiff = diff; closest = i }
  }
  return {
    hue: hueStr,
    hueName: hueNames[closest],
    hueAngle: ha,
    value: parseFloat(value.toFixed(1)),
    chroma: parseFloat(chroma.toFixed(1)),
    notation: `${hueStr} ${value.toFixed(1)}/${chroma.toFixed(1)}`,
  }
}

// Munsell HVC → RGB via munsell.js (authoritative)
export function munsellHvcToRgb(hue, value, chroma) {
  const str = `${hue} ${Number(value).toFixed(1)}/${Number(chroma).toFixed(1)}`
  const [r, g, b] = munsell.munsellToRgb255(str)
  return { r, g, b }
}

// Lab (D65) → RGB, used by hue wheel click handler
export function labToRgb(L, a, b) {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
  const f = t => t > 0.206897 ? t * t * t : (t - 16 / 116) / 7.787
  const fy = (L + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200
  const x = Xn * f(fx)
  const y = Yn * f(fy)
  const z = Zn * f(fz)
  let rr =  3.2406 * x - 1.5372 * y - 0.4986 * z
  let g = -0.9689 * x + 1.8758 * y + 0.0415 * z
  let bv =  0.0557 * x - 0.2040 * y + 1.0570 * z
  const gamma = v => v > 0.0031308 ? 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055 : 12.92 * v
  return {
    r: Math.round(Math.max(0, Math.min(255, gamma(rr) * 255))),
    g: Math.round(Math.max(0, Math.min(255, gamma(g) * 255))),
    b: Math.round(Math.max(0, Math.min(255, gamma(bv) * 255))),
  }
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