self.onmessage = function (e) {
  const { filter, strength, buffer, width, height } = e.data
  const src = new Uint8ClampedArray(buffer)
  const out = new Uint8ClampedArray(src.length)
  const w = width, h = height

  if (filter === 'grayscale') {
    for (let i = 0; i < src.length; i += 4) {
      const lum = Math.round(0.2126 * src[i] + 0.7152 * src[i+1] + 0.0722 * src[i+2])
      out[i] = out[i+1] = out[i+2] = lum
      out[i+3] = src[i+3]
    }
  } else if (filter === 'highcontrast') {
    const factor = 1.5 + (strength / 20) * 1.5
    for (let i = 0; i < src.length; i += 4) {
      out[i]   = Math.min(255, Math.max(0, Math.round((src[i]   - 128) * factor + 128)))
      out[i+1] = Math.min(255, Math.max(0, Math.round((src[i+1] - 128) * factor + 128)))
      out[i+2] = Math.min(255, Math.max(0, Math.round((src[i+2] - 128) * factor + 128)))
      out[i+3] = src[i+3]
    }
  } else if (filter === 'soften') {
    const r = Math.max(1, strength)
    const tmp = new Uint8ClampedArray(src.length)
    // horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rS = 0, gS = 0, bS = 0, cnt = 0
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= w) continue
          const i = (y * w + nx) * 4
          rS += src[i]; gS += src[i+1]; bS += src[i+2]; cnt++
        }
        const i = (y * w + x) * 4
        tmp[i] = rS / cnt; tmp[i+1] = gS / cnt; tmp[i+2] = bS / cnt; tmp[i+3] = src[i+3]
      }
    }
    // vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rS = 0, gS = 0, bS = 0, cnt = 0
        for (let dy = -r; dy <= r; dy++) {
          const ny = y + dy
          if (ny < 0 || ny >= h) continue
          const i = (ny * w + x) * 4
          rS += tmp[i]; gS += tmp[i+1]; bS += tmp[i+2]; cnt++
        }
        const i = (y * w + x) * 4
        out[i] = Math.round(rS / cnt); out[i+1] = Math.round(gS / cnt)
        out[i+2] = Math.round(bS / cnt); out[i+3] = src[i+3]
      }
    }
  }

  self.postMessage({ out: out.buffer }, [out.buffer])
}
