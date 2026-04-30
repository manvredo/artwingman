self.addEventListener('message', function (e) {
  if (e.data.filter === 'develop') return
  const { filter, strength, soften=0, buffer, width, height } = e.data
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

  } else if (filter === 'kmeans' || filter === 'kmeans-analyze') {
    const k = Math.max(2, Math.min(24, strength))

    // Apply box blur (soften) before k-means if soften > 0
    let srcForKmeans = src
    if (soften > 0) {
      const r = Math.max(1, Math.min(20, soften))
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
          srcForKmeans[i]   = Math.round(rS / cnt)
          srcForKmeans[i+1] = Math.round(gS / cnt)
          srcForKmeans[i+2] = Math.round(bS / cnt)
          srcForKmeans[i+3] = src[i+3]
        }
      }
    }
    const pixelCount = w * h

    // Sample up to 8000 pixels for training
    const sampleStep = Math.max(1, Math.floor(pixelCount / 8000))
    const samples = []
    for (let i = 0; i < pixelCount; i += sampleStep) {
      const idx = i * 4
      samples.push([srcForKmeans[idx], srcForKmeans[idx+1], srcForKmeans[idx+2]])
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
      const r = srcForKmeans[idx], g = srcForKmeans[idx+1], b = srcForKmeans[idx+2]
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
    if (filter === 'kmeans-analyze') {
      self.postMessage({ clusters })
      return
    }
    self.postMessage({ out: out.buffer, clusters }, [out.buffer])
    return
  }

  self.postMessage({ out: out.buffer }, [out.buffer])
})

self.addEventListener('message', function(e) {
  if (e.data.filter !== 'develop') return
  const {
    temperature=0, tint=0,
    exposure=0, contrast=0,
    highlights=0, shadows=0, whites=0, blacks=0,
    texture=0, clarity=0, dehaze=0,
    vibrance=0, saturation=0,
    buffer, width: w, height: h
  } = e.data

  const src = new Uint8ClampedArray(buffer)
  const out = new Uint8ClampedArray(src.length)
  const cl = v => Math.max(0, Math.min(255, v))
  const lum = (r,g,b) => 0.2126*r + 0.7152*g + 0.0722*b

  // Pass 1 — pixel-wise adjustments
  for (let i = 0; i < src.length; i += 4) {
    let r = src[i], g = src[i+1], b = src[i+2]

    // Temperature (warm/cool)
    if (temperature !== 0) {
      const t = temperature / 100
      r = cl(r + t * 40); g = cl(g + t * 8); b = cl(b - t * 40)
    }

    // Tint (magenta↔green)
    if (tint !== 0) {
      const t = tint / 100
      r = cl(r - t * 12); g = cl(g + t * 30); b = cl(b - t * 12)
    }

    // Exposure (-5 to +5 EV directly)
    if (exposure !== 0) {
      const ef = Math.pow(2, exposure)
      r = cl(r * ef); g = cl(g * ef); b = cl(b * ef)
    }

    // Contrast
    if (contrast !== 0) {
      const cf = contrast > 0 ? 1 + contrast / 100 * 2 : 1 + contrast / 100
      r = cl(128 + (r-128)*cf); g = cl(128 + (g-128)*cf); b = cl(128 + (b-128)*cf)
    }

    // Highlights (lum > 128)
    if (highlights !== 0) {
      const L = lum(r,g,b), mask = Math.max(0,(L-128)/127)
      const adj = highlights/100 * 60 * mask
      r = cl(r+adj); g = cl(g+adj); b = cl(b+adj)
    }

    // Shadows (lum < 128)
    if (shadows !== 0) {
      const L = lum(r,g,b), mask = Math.max(0,(128-L)/128)
      const adj = shadows/100 * 60 * mask
      r = cl(r+adj); g = cl(g+adj); b = cl(b+adj)
    }

    // Whites (lum > 192)
    if (whites !== 0) {
      const L = lum(r,g,b), mask = Math.max(0,(L-192)/63)
      const adj = whites/100 * 40 * mask
      r = cl(r+adj); g = cl(g+adj); b = cl(b+adj)
    }

    // Blacks (lum < 64)
    if (blacks !== 0) {
      const L = lum(r,g,b), mask = Math.max(0,(64-L)/64)
      const adj = blacks/100 * 40 * mask
      r = cl(r+adj); g = cl(g+adj); b = cl(b+adj)
    }

    // Dehaze (simplified: contrast + saturation boost)
    if (dehaze !== 0) {
      const dh = dehaze/100
      r = cl(128+(r-128)*(1+dh*0.5)); g = cl(128+(g-128)*(1+dh*0.5)); b = cl(128+(b-128)*(1+dh*0.5))
      const gray = lum(r,g,b)
      r = cl(gray+(r-gray)*(1+dh*0.4)); g = cl(gray+(g-gray)*(1+dh*0.4)); b = cl(gray+(b-gray)*(1+dh*0.4))
    }

    // Vibrance (saturation boost, protects already-saturated colors)
    if (vibrance !== 0) {
      const gray = lum(r,g,b)
      const maxC = Math.max(r,g,b), minC = Math.min(r,g,b)
      const sat = maxC > 0 ? (maxC-minC)/maxC : 0
      const vf = 1 + (vibrance/100) * (1-sat)
      r = cl(gray+(r-gray)*vf); g = cl(gray+(g-gray)*vf); b = cl(gray+(b-gray)*vf)
    }

    // Saturation
    if (saturation !== 0) {
      const gray = lum(r,g,b), sf = 1 + saturation/100
      r = cl(gray+(r-gray)*sf); g = cl(gray+(g-gray)*sf); b = cl(gray+(b-gray)*sf)
    }

    out[i]=r; out[i+1]=g; out[i+2]=b; out[i+3]=src[i+3]
  }

  // Pass 2 — Clarity (box blur r=10, unsharp with midtone mask)
  if (clarity !== 0) {
    const r2 = 10
    const tmp = new Uint8ClampedArray(out.length)
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        let rS=0,gS=0,bS=0,cnt=0
        for (let dx=-r2; dx<=r2; dx++) {
          const nx=Math.max(0,Math.min(w-1,x+dx)), idx=(y*w+nx)*4
          rS+=out[idx]; gS+=out[idx+1]; bS+=out[idx+2]; cnt++
        }
        const i=(y*w+x)*4
        tmp[i]=rS/cnt; tmp[i+1]=gS/cnt; tmp[i+2]=bS/cnt; tmp[i+3]=out[i+3]
      }
    }
    const blur=new Uint8ClampedArray(out.length)
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        let rS=0,gS=0,bS=0,cnt=0
        for (let dy=-r2; dy<=r2; dy++) {
          const ny=Math.max(0,Math.min(h-1,y+dy)), idx=(ny*w+x)*4
          rS+=tmp[idx]; gS+=tmp[idx+1]; bS+=tmp[idx+2]; cnt++
        }
        const i=(y*w+x)*4
        blur[i]=rS/cnt; blur[i+1]=gS/cnt; blur[i+2]=bS/cnt; blur[i+3]=out[i+3]
      }
    }
    const cf=clarity/100
    for (let i=0; i<out.length; i+=4) {
      const r=out[i],g=out[i+1],b=out[i+2]
      const L=lum(r,g,b), mid=1-Math.abs(L-128)/128
      out[i]  =cl(r+(r-blur[i]  )*cf*mid)
      out[i+1]=cl(g+(g-blur[i+1])*cf*mid)
      out[i+2]=cl(b+(b-blur[i+2])*cf*mid)
    }
  }

  // Pass 3 — Texture (3×3 unsharp mask, fine detail)
  if (texture !== 0) {
    const tf=texture/100
    const tex=new Uint8ClampedArray(out.length)
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        let rS=0,gS=0,bS=0
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
          const nx=Math.max(0,Math.min(w-1,x+dx)), ny=Math.max(0,Math.min(h-1,y+dy))
          const idx=(ny*w+nx)*4
          rS+=out[idx]; gS+=out[idx+1]; bS+=out[idx+2]
        }
        const i=(y*w+x)*4
        tex[i]=rS/9; tex[i+1]=gS/9; tex[i+2]=bS/9
      }
    }
    for (let i=0; i<out.length; i+=4) {
      out[i]  =cl(out[i]  +(out[i]  -tex[i]  )*tf)
      out[i+1]=cl(out[i+1]+(out[i+1]-tex[i+1])*tf)
      out[i+2]=cl(out[i+2]+(out[i+2]-tex[i+2])*tf)
    }
  }

  // Pass 4 — LUT (trilinear interpolation)
  const { lutSize=0, lutIntensity=100 } = e.data
  if (lutSize > 1 && e.data.lutBuffer) {
    const lutData = new Float32Array(e.data.lutBuffer)
    const intensity = Math.min(1, Math.max(0, lutIntensity / 100))
    const s1 = lutSize - 1
    for (let i = 0; i < out.length; i += 4) {
      const r = out[i] / 255, g = out[i+1] / 255, b = out[i+2] / 255
      const ri = r * s1, gi = g * s1, bi = b * s1
      const r0 = Math.floor(ri), g0 = Math.floor(gi), b0 = Math.floor(bi)
      const r1 = Math.min(r0+1, s1), g1 = Math.min(g0+1, s1), b1 = Math.min(b0+1, s1)
      const fr = ri - r0, fg = gi - g0, fb = bi - b0
      const li = (rr, gg, bb) => (rr + gg*lutSize + bb*lutSize*lutSize) * 3
      const lerp = (ch) => {
        const v000=lutData[li(r0,g0,b0)+ch], v100=lutData[li(r1,g0,b0)+ch]
        const v010=lutData[li(r0,g1,b0)+ch], v110=lutData[li(r1,g1,b0)+ch]
        const v001=lutData[li(r0,g0,b1)+ch], v101=lutData[li(r1,g0,b1)+ch]
        const v011=lutData[li(r0,g1,b1)+ch], v111=lutData[li(r1,g1,b1)+ch]
        return v000*(1-fr)*(1-fg)*(1-fb) + v100*fr*(1-fg)*(1-fb)
             + v010*(1-fr)*fg*(1-fb)      + v110*fr*fg*(1-fb)
             + v001*(1-fr)*(1-fg)*fb      + v101*fr*(1-fg)*fb
             + v011*(1-fr)*fg*fb          + v111*fr*fg*fb
      }
      out[i]   = cl(lerp(0)*255*intensity + out[i]  *(1-intensity))
      out[i+1] = cl(lerp(1)*255*intensity + out[i+1]*(1-intensity))
      out[i+2] = cl(lerp(2)*255*intensity + out[i+2]*(1-intensity))
    }
  }

  self.postMessage({ out: out.buffer, gen: e.data.gen }, [out.buffer])
})
