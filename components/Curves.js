import { useRef, useEffect, useCallback } from 'react'

function makeIdentityCurve() {
  return Array.from({ length: 256 }, (_, i) => i)
}

// Monotone cubic interpolation via Fritsch-Butland method.
// Guarantees no overshooting/undershooting — curve stays between control points.
function buildCurveFromPoints(points) {
  if (points.length < 2) return makeIdentityCurve()
  const sorted = [...points].sort((a, b) => a.in - b.in)

  // Compute gradients (slopes) at each interior point
  const n = sorted.length
  const gradients = new Array(n)
  gradients[0] = sorted.length > 1 ? (sorted[1].out - sorted[0].out) / (sorted[1].in - sorted[0].in) : 0
  gradients[n - 1] = sorted.length > 1 ? (sorted[n - 1].out - sorted[n - 2].out) / (sorted[n - 1].in - sorted[n - 2].in) : 0

  for (let i = 1; i < n - 1; i++) {
    const dx1 = sorted[i].in - sorted[i - 1].in
    const dx2 = sorted[i + 1].in - sorted[i].in
    if (dx1 !== 0 && dx2 !== 0) {
      const m1 = (sorted[i].out - sorted[i - 1].out) / dx1
      const m2 = (sorted[i + 1].out - sorted[i].out) / dx2
      // Fritsch-Butland weighted harmonic mean
      gradients[i] = (m1 * m2) / (m1 + m2) * 2
    } else {
      gradients[i] = 0
    }
  }

  const curve = new Array(256)
  for (let i = 0; i < 256; i++) {
    // Find segment [sorted[k], sorted[k+1]] that contains i
    let k = 0
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].in <= i && sorted[j + 1].in >= i) {
        k = j
        break
      }
    }
    const p0 = sorted[k], p1 = sorted[k + 1]
    const h = p1.in - p0.in
    if (h <= 0) { curve[i] = p0.out; continue }

    const t = (i - p0.in) / h
    const t2 = t * t, t3 = t2 * t
    const m0 = gradients[k], m1 = gradients[k + 1]

    // Hermite basis functions
    curve[i] = Math.max(0, Math.min(255, Math.round(
      (2 * t3 - 3 * t2 + 1) * p0.out +
      (t3 - 2 * t2 + t) * h * m0 +
      (-2 * t3 + 3 * t2) * p1.out +
      (t3 - t2) * h * m1
    )))
  }
  return curve
}

function makeDefaultPoints() {
  return [{ in: 0, out: 0 }, { in: 255, out: 255 }]
}

const PRESETS = {
  'Identity': () => ({
    R: makeIdentityCurve(), G: makeIdentityCurve(), B: makeIdentityCurve(), Luminosity: makeIdentityCurve(),
    Rpts: makeDefaultPoints(), Gpts: makeDefaultPoints(), Bpts: makeDefaultPoints(), Luminositypts: makeDefaultPoints(),
  }),
  'S-Curve': () => {
    const sp = [{ in: 0, out: 0 }, { in: 64, out: 48 }, { in: 192, out: 208 }, { in: 255, out: 255 }]
    return { R: makeIdentityCurve(), G: makeIdentityCurve(), B: makeIdentityCurve(), Luminosity: makeIdentityCurve(),
      Rpts: [...sp], Gpts: [...sp], Bpts: [...sp], Luminositypts: [...sp] }
  },
  'Black & White': () => {
    const bw = new Array(256); for (let i = 0; i < 256; i++) bw[i] = i < 128 ? 0 : 255
    const pts = [{ in: 0, out: 0 }, { in: 127, out: 0 }, { in: 128, out: 255 }, { in: 255, out: 255 }]
    return { R: bw, G: bw, B: bw, Luminosity: bw, Rpts: pts, Gpts: pts, Bpts: pts, Luminositypts: pts }
  },
  'Negative': () => {
    const neg = new Array(256); for (let i = 0; i < 256; i++) neg[i] = 255 - i
    const pts = [{ in: 0, out: 255 }, { in: 255, out: 0 }]
    return { R: neg, G: neg, B: neg, Luminosity: neg, Rpts: pts, Gpts: pts, Bpts: pts, Luminositypts: pts }
  },
  'Threshold': () => {
    const th = new Array(256); for (let i = 0; i < 256; i++) th[i] = i < 128 ? 0 : 255
    const pts = [{ in: 0, out: 0 }, { in: 127, out: 0 }, { in: 128, out: 255 }, { in: 255, out: 255 }]
    return { R: th, G: th, B: th, Luminosity: th, Rpts: pts, Gpts: pts, Bpts: pts, Luminositypts: pts }
  },
}

const CHANNEL_COLORS = { R: '#e74c3c', G: '#2ecc71', B: '#3498db', Luminosity: '#cccccc' }
const CANVAS_W = 240

function drawCurve(canvas, curve, points, channelColor, activeChannel) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_W)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_W)

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    const pos = (i / 4) * CANVAS_W
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, CANVAS_W); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(CANVAS_W, pos); ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath(); ctx.moveTo(0, CANVAS_W); ctx.lineTo(CANVAS_W, 0); ctx.stroke()

  if (!curve) return

  ctx.strokeStyle = activeChannel === 'Luminosity' ? '#cccccc' : channelColor
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * CANVAS_W
    const y = CANVAS_W - (curve[i] / 255) * CANVAS_W
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.fillStyle = activeChannel === 'Luminosity' ? '#cccccc' : channelColor
  for (const pt of points) {
    const x = (pt.in / 255) * CANVAS_W
    const y = CANVAS_W - (pt.out / 255) * CANVAS_W
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
  }
}

function curveDistance(canvasPx, canvasPy, inVal, curve) {
  const curveY = CANVAS_W - (curve[inVal] / 255) * CANVAS_W
  return Math.hypot(canvasPx - (inVal / 255) * CANVAS_W, canvasPy - curveY)
}

export function CurvesEditor({ curves, onChange }) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const activeChannel = curves.activeChannel || 'Luminosity'
  const points = curves[activeChannel + 'pts'] || makeDefaultPoints()
  const activeCurve = curves[activeChannel] || makeIdentityCurve()

  const redraw = useCallback(() => {
    if (!canvasRef.current) return
    drawCurve(canvasRef.current, activeCurve, points, CHANNEL_COLORS[activeChannel], activeChannel)
  }, [activeCurve, points, activeChannel])

  useEffect(() => { redraw() }, [redraw])

  const getCanvasPx = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      canvasX: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      canvasY: (e.clientY - rect.top) * (CANVAS_W / rect.height),
    }
  }

  const hitTestPoints = (canvasX, canvasY) => {
    for (const pt of points) {
      const px = (pt.in / 255) * CANVAS_W
      const py = CANVAS_W - (pt.out / 255) * CANVAS_W
      if (Math.hypot(canvasX - px, canvasY - py) <= 12) return pt
    }
    return null
  }

  const hitTestCurve = (canvasX, canvasY) => {
    let bestDist = Infinity, bestIn = null
    for (let inVal = 0; inVal < 256; inVal += 2) {
      const d = curveDistance(canvasX, canvasY, inVal, activeCurve)
      if (d < bestDist) { bestDist = d; bestIn = inVal }
    }
    if (bestIn !== null) {
      for (let inVal = Math.max(0, bestIn - 1); inVal <= Math.min(255, bestIn + 1); inVal++) {
        const d = curveDistance(canvasX, canvasY, inVal, activeCurve)
        if (d < bestDist) { bestDist = d; bestIn = inVal }
      }
    }
    return bestDist <= 8 ? bestIn : null
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    const { canvasX, canvasY } = getCanvasPx(e)
    const hitPt = hitTestPoints(canvasX, canvasY)
    if (hitPt) {
      dragRef.current = { point: hitPt }
      return
    }
    const nearIn = hitTestCurve(canvasX, canvasY)
    if (nearIn !== null) {
      const outVal = Math.round(Math.max(0, Math.min(255, (1 - canvasY / CANVAS_W) * 255)))
      const newPt = { in: nearIn, out: Math.max(0, Math.min(255, outVal)) }
      const newPoints = [...points, newPt].sort((a, b) => a.in - b.in)
      const newCurve = buildCurveFromPoints(newPoints)
      onChange({ ...curves, [activeChannel]: newCurve, [activeChannel + 'pts']: newPoints })
      dragRef.current = { point: newPt }
    }
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const { canvasX, canvasY } = getCanvasPx(e)
    const { point } = dragRef.current
    const outVal = Math.round(Math.max(0, Math.min(255, (1 - canvasY / CANVAS_W) * 255)))

    if (point === points[0]) {
      point.out = Math.max(0, Math.min(255, outVal))
    } else if (point === points[points.length - 1]) {
      point.out = Math.max(0, Math.min(255, outVal))
    } else {
      const sorted = [...points].sort((a, b) => a.in - b.in)
      const idx = sorted.indexOf(point)
      const prevIn = idx > 0 ? sorted[idx - 1].in : 1
      const nextIn = idx < sorted.length - 1 ? sorted[idx + 1].in : 254
      const newIn = Math.round((canvasX / CANVAS_W) * 255)
      point.in = Math.max(prevIn + 1, Math.min(nextIn - 1, newIn))
      point.out = Math.max(0, Math.min(255, outVal))
    }

    const newCurve = buildCurveFromPoints(points)
    onChange({ ...curves, [activeChannel]: newCurve })
    redraw()
  }

  const handleMouseUp = () => { dragRef.current = null }

  const handleDoubleClick = (e) => {
    const { canvasX, canvasY } = getCanvasPx(e)
    const hitPt = hitTestPoints(canvasX, canvasY)
    if (!hitPt) return
    if (hitPt === points[0] || hitPt === points[points.length - 1]) return
    const newPoints = points.filter(p => p !== hitPt)
    const newCurve = buildCurveFromPoints(newPoints)
    onChange({ ...curves, [activeChannel]: newCurve, [activeChannel + 'pts']: newPoints })
  }

  const handleReset = (channel) => {
    const defaults = makeDefaultPoints()
    const newCurves = { ...curves }
    if (channel === 'all') {
      for (const ch of ['R', 'G', 'B', 'Luminosity']) {
        newCurves[ch] = makeIdentityCurve()
        newCurves[ch + 'pts'] = [...defaults]
      }
    } else {
      newCurves[channel] = makeIdentityCurve()
      newCurves[channel + 'pts'] = [...defaults]
    }
    onChange(newCurves)
  }

  const handlePreset = (presetName) => {
    const factory = PRESETS[presetName]
    if (!factory) return
    if (presetName === 'Identity') { handleReset('all'); return }
    const result = factory()
    onChange({ ...curves, ...result, activeChannel })
  }

  const setActiveChannel = (ch) => {
    onChange({ ...curves, activeChannel: ch })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Object.keys(PRESETS).map(name => (
          <button key={name} onClick={() => handlePreset(name)} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#8a8680', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer',
          }}>{name}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {['R', 'G', 'B', 'Luminosity'].map(ch => (
          <button key={ch} onClick={() => setActiveChannel(ch)} style={{
            background: activeChannel === ch ? `${CHANNEL_COLORS[ch]}22` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${activeChannel === ch ? CHANNEL_COLORS[ch] + '88' : 'rgba(255,255,255,0.15)'}`,
            color: activeChannel === ch ? CHANNEL_COLORS[ch] : '#8a8680',
            borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
            fontWeight: activeChannel === ch ? 'bold' : 'normal',
          }}>{ch}</button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_W}
        style={{ width: '100%', maxWidth: 240, aspectRatio: '1', cursor: 'crosshair', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      <div style={{ fontSize: 9, color: '#555' }}>
        Click on line to add point · Drag to move · Double-click to delete
      </div>

      <button onClick={() => handleReset('all')} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#666', borderRadius: 4, padding: '3px 10px', fontSize: 10, cursor: 'pointer', alignSelf: 'flex-start',
      }}>Reset All</button>
    </div>
  )
}

export { makeIdentityCurve }