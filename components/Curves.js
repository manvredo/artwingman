import { useRef, useEffect, useCallback } from 'react'

function makeIdentityCurve() {
  return Array.from({ length: 256 }, (_, i) => i)
}

function buildCurveFromPoints(points) {
  if (points.length < 2) return makeIdentityCurve()
  const sorted = [...points].sort((a, b) => a.in - b.in)
  const curve = new Array(256)
  for (let i = 0; i < 256; i++) {
    let p0 = sorted[0], p1 = sorted[0], p2 = sorted[1] || sorted[0], p3 = sorted[1] || sorted[0]
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].in <= i && sorted[j + 1].in >= i) {
        p0 = sorted[Math.max(0, j - 1)]
        p1 = sorted[j]
        p2 = sorted[j + 1]
        p3 = sorted[Math.min(sorted.length - 1, j + 2)]
        break
      }
    }
    const t = p1.in === p2.in ? 0 : (i - p1.in) / (p2.in - p1.in)
    const t2 = t * t, t3 = t2 * t
    const val = 0.5 * (
      (2 * p1.out) + (-p0.out + p2.out) * t +
      (2*p0.out - 5*p1.out + 4*p2.out - p3.out) * t2 +
      (-p0.out + 3*p1.out - 3*p2.out + p3.out) * t3
    )
    curve[i] = Math.max(0, Math.min(255, Math.round(val)))
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

// Distance from canvas click (canvasPx, canvasPy) to the curve at input value inVal
function curveDistance(canvasPx, canvasPy, inVal, curve) {
  const curveY = CANVAS_W - (curve[inVal] / 255) * CANVAS_W
  return Math.sqrt((canvasPx - (inVal / 255) * CANVAS_W) ** 2 + (canvasPy - curveY) ** 2)
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

  // Returns { canvasX, canvasY } in canvas pixels from mouse event
  const getCanvasPx = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_W / rect.height
    return {
      canvasX: (e.clientX - rect.left) * scaleX,
      canvasY: (e.clientY - rect.top) * scaleY,
    }
  }

  // Find closest point handle (canvas-pixel distance, threshold ~10px)
  const hitTestPoints = (canvasX, canvasY) => {
    for (const pt of points) {
      const px = (pt.in / 255) * CANVAS_W
      const py = CANVAS_W - (pt.out / 255) * CANVAS_W
      if (Math.hypot(canvasX - px, canvasY - py) <= 12) return pt
    }
    return null
  }

  // Find closest point on the curve (canvas-pixel distance, threshold ~8px)
  // Returns the input value (0-255) if hit, else null
  const hitTestCurve = (canvasX, canvasY) => {
    let bestDist = Infinity, bestIn = null
    // Sample every 2 input steps for performance
    for (let inVal = 0; inVal < 256; inVal += 2) {
      const dist = curveDistance(canvasX, canvasY, inVal, activeCurve)
      if (dist < bestDist) { bestDist = dist; bestIn = inVal }
    }
    // Refine around best
    if (bestIn !== null && bestIn > 0) {
      for (let inVal = Math.max(0, bestIn - 1); inVal <= Math.min(255, bestIn + 1); inVal++) {
        const dist = curveDistance(canvasX, canvasY, inVal, activeCurve)
        if (dist < bestDist) { bestDist = dist; bestIn = inVal }
      }
    }
    return bestDist <= 8 ? bestIn : null
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    const { canvasX, canvasY } = getCanvasPx(e)

    const hitPt = hitTestPoints(canvasX, canvasY)
    if (hitPt) {
      // Start dragging existing point
      dragRef.current = { point: hitPt }
      return
    }

    // Click near the curve → insert new point
    const nearIn = hitTestCurve(canvasX, canvasY)
    if (nearIn !== null) {
      const outVal = Math.round((1 - canvasY / CANVAS_W) * 255)
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
      // Left endpoint: x is pinned to 0
      point.out = outVal
    } else if (point === points[points.length - 1]) {
      // Right endpoint: x is pinned to 255
      point.out = outVal
    } else {
      // Middle point: x follows mouse within [prev_in+1, next_in-1]
      const sorted = [...points].sort((a, b) => a.in - b.in)
      const idx = sorted.indexOf(point)
      const prevIn = idx > 0 ? sorted[idx - 1].in : 1
      const nextIn = idx < sorted.length - 1 ? sorted[idx + 1].in : 254

      const newIn = Math.round((canvasX / CANVAS_W) * 255)
      point.in = Math.max(prevIn + 1, Math.min(nextIn - 1, newIn))
      point.out = outVal
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
    // Don't delete endpoints
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