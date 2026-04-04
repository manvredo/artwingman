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

  } else if (filter === 'contour') {
    const gray = new Uint8ClampedArray(w * h)
    for (let i = 0; i < src.length; i += 4) {
      gray[i >> 2] = Math.round(0.2126 * src[i] + 0.7152 * src[i+1] + 0.0722 * src[i+2])
    }
    const g = (x, y) => gray[Math.max(0, Math.min(h-1, y)) * w + Math.max(0, Math.min(w-1, x))]
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = -g(x-1,y-1) - 2*g(x-1,y) - g(x-1,y+1) + g(x+1,y-1) + 2*g(x+1,y) + g(x+1,y+1)
        const gy = -g(x-1,y-1) - 2*g(x,y-1) - g(x+1,y-1) + g(x-1,y+1) + 2*g(x,y+1) + g(x+1,y+1)
        const mag = Math.min(255, Math.round(Math.sqrt(gx*gx + gy*gy)))
        const i = (y * w + x) * 4
        out[i] = out[i+1] = out[i+2] = mag
        out[i+3] = src[i+3]
      }
    }

  } else if (filter === 'posterize') {
    const levels = Math.max(2, Math.min(10, Math.round(strength)))
    const step = 255 / (levels - 1)
    for (let i = 0; i < src.length; i += 4) {
      out[i]   = Math.round(Math.round(src[i]   / step) * step)
      out[i+1] = Math.round(Math.round(src[i+1] / step) * step)
      out[i+2] = Math.round(Math.round(src[i+2] / step) * step)
      out[i+3] = src[i+3]
    }

  } else if (filter === 'warm') {
    const s = strength * 3
    for (let i = 0; i < src.length; i += 4) {
      out[i]   = Math.min(255, src[i]   + s)
      out[i+1] = Math.min(255, src[i+1] + Math.round(s * 0.2))
      out[i+2] = Math.max(0,   src[i+2] - s)
      out[i+3] = src[i+3]
    }

  } else if (filter === 'cool') {
    const s = strength * 3
    for (let i = 0; i < src.length; i += 4) {
      out[i]   = Math.max(0,   src[i]   - s)
      out[i+1] = Math.min(255, src[i+1] + Math.round(s * 0.1))
      out[i+2] = Math.min(255, src[i+2] + s)
      out[i+3] = src[i+3]
    }

  } else if (filter === 'kmeans') {
    const k = Math.max(2, Math.min(10, strength))
    const pixelCount = w * h

    // Sample up to 8000 pixels for training
    const sampleStep = Math.max(1, Math.floor(pixelCount / 8000))
    const samples = []
    for (let i = 0; i < pixelCount; i += sampleStep) {
      const idx = i * 4
      samples.push([src[idx], src[idx+1], src[idx+2]])
    }
    const sampleCount = samples.length

    // K-Means++ init
    const centers = [[...samples[Math.floor(Math.random() * sampleCount)]]]
    for (let c = 1; c < k; c++) {
      const dists = samples.map(s => {
        let minD = Infinity
        for (const ct of centers) {
          const d = (s[0]-ct[0])**2 + (s[1]-ct[1])**2 + (s[2]-ct[2])**2
          if (d < minD) minD = d
        }
        return minD
      })
      const total = dists.reduce((a, b) => a + b, 0)
      let rand = Math.random() * total, chosen = 0
      for (let i = 0; i < dists.length; i++) { rand -= dists[i]; if (rand <= 0) { chosen = i; break } }
      centers.push([...samples[chosen]])
    }

    // K-Means iterations
    const assign = new Int32Array(sampleCount)
    for (let iter = 0; iter < 12; iter++) {
      for (let i = 0; i < sampleCount; i++) {
        const [r, g, b] = samples[i]
        let minD = Infinity, minC = 0
        for (let c = 0; c < k; c++) {
          const d = (r-centers[c][0])**2 + (g-centers[c][1])**2 + (b-centers[c][2])**2
          if (d < minD) { minD = d; minC = c }
        }
        assign[i] = minC
      }
      const sums = Array.from({ length: k }, () => [0,0,0,0])
      for (let i = 0; i < sampleCount; i++) {
        const c = assign[i]
        sums[c][0] += samples[i][0]; sums[c][1] += samples[i][1]
        sums[c][2] += samples[i][2]; sums[c][3]++
      }
      for (let c = 0; c < k; c++) {
        if (sums[c][3] > 0) {
          centers[c][0] = sums[c][0] / sums[c][3]
          centers[c][1] = sums[c][1] / sums[c][3]
          centers[c][2] = sums[c][2] / sums[c][3]
        }
      }
    }

    // Apply to all pixels
    const clusterCounts = new Int32Array(k)
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      const r = src[idx], g = src[idx+1], b = src[idx+2]
      let minD = Infinity, minC = 0
      for (let c = 0; c < k; c++) {
        const d = (r-centers[c][0])**2 + (g-centers[c][1])**2 + (b-centers[c][2])**2
        if (d < minD) { minD = d; minC = c }
      }
      out[idx]   = Math.round(centers[minC][0])
      out[idx+1] = Math.round(centers[minC][1])
      out[idx+2] = Math.round(centers[minC][2])
      out[idx+3] = src[idx+3]
      clusterCounts[minC]++
    }

    const clusters = centers.map((c, i) => ({
      r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]), count: clusterCounts[i]
    }))
    self.postMessage({ out: out.buffer, clusters }, [out.buffer])
    return
  }

  self.postMessage({ out: out.buffer }, [out.buffer])
}
