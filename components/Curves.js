import { useRef, useEffect, useState, useCallback } from 'react'

function makeIdentityCurve() {
  return Array.from({ length: 256 }, (_, i) => i)
}

// Catmull-Rom spline interpolation through control points
function buildCurveFromPoints(points) {
  if (points.length < 2) return makeIdentityCurve()
  const sorted = [...points].sort((a, b) => a.in - b.in)
  const curve = new Array(256)
  for (let i = 0; i < 256; i++) {
    // Find surrounding control points
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
    // Catmull-Rom
    const t2 = t * t, t3 = t2 * t
    const val = 0.5 * (
      (2 * p1.out) +
      (-p0.out + p2.out) * t +
      (2*p0.out - 5*p1.out + 4*p2.out - p3.out) * t2 +
      (-p0.out + 3*p1.out - 3*p2.out + p3.out) * t3
    )
    curve[i] = Math.max(0, Math.min(255, Math.round(val)))
  }
  return curve
}

// Default control points (diagonal)
function makeDefaultPoints() {
  return [
    { in: 0, out: 0 },
    { in: 255, out: 255 },
  ]
}

const PRESETS = {
  'Identity': () => ({
    R: makeIdentityCurve(), G: makeIdentityCurve(), B: makeIdentityCurve(),
    Luminosity: makeIdentityCurve(),
    Rpts: makeDefaultPoints(), Gpts: makeDefaultPoints(), Bpts: makeDefaultPoints(),
    Luminositypts: makeDefaultPoints(),
  }),
  'S-Curve': () => {
    const makeSCurvePoints = () => [
      { in: 0, out: 0 }, { in: 64, out: 48 }, { in: 192, out: 208 }, { in: 255, out: 255 }
    ]
    return {
      R: makeIdentityCurve(), G: makeIdentityCurve(), B: makeIdentityCurve(),
      Luminosity: makeIdentityCurve(),
      Rpts: makeSCurvePoints(), Gpts: makeSCurvePoints(), Bpts: makeSCurvePoints(),
      Luminositypts: makeSCurvePoints(),
    }
  },
  'Black & White': () => {
    const bw = new Array(256)
    for (let i = 0; i < 256; i++) bw[i] = i < 128 ? 0 : 255
    const pts = [{ in: 0, out: 0 }, { in: 127, out: 0 }, { in: 128, out: 255 }, { in: 255, out: 255 }]
    return { R: bw, G: bw, B: bw, Luminosity: bw, Rpts: pts, Gpts: pts, Bpts: pts, Luminositypts: pts }
  },
  'Negative': () => {
    const neg = new Array(256)
    for (let i = 0; i < 256; i++) neg[i] = 255 - i
    const pts = [{ in: 0, out: 255 }, { in: 255, out: 0 }]
    return { R: neg, G: neg, B: neg, Luminosity: neg, Rpts: pts, Gpts: pts, Bpts: pts, Luminositypts: pts }
  },
  'Threshold': () => {
    const th = new Array(256)
    for (let i = 0; i < 256; i++) th[i] = i < 128 ? 0 : 255
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

  // Control points
  ctx.fillStyle = activeChannel === 'Luminosity' ? '#cccccc' : channelColor
  for (const pt of points) {
    const x = (pt.in / 255) * CANVAS_W
    const y = CANVAS_W - (pt.out / 255) * CANVAS_W
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
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

  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_W / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    return {
      inVal: Math.round(Math.max(0, Math.min(255, (x / CANVAS_W) * 255))),
      outVal: Math.round(Math.max(0, Math.min(255, (1 - y / CANVAS_W) * 255))),
    }
  }

  const hitTest = (e) => {
    const { inVal, outVal } = getCanvasPoint(e)
    for (const pt of points) {
      if (Math.abs(pt.in - inVal) <= 10 && Math.abs(pt.out - outVal) <= 10) return pt
    }
    return null
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    const hit = hitTest(e)
    if (hit) {
      dragRef.current = { point: hit, type: 'move' }
    } else {
      const { inVal, outVal } = getCanvasPoint(e)
      const newPoints = [...points, { in: inVal, out: outVal }]
      const newCurve = buildCurveFromPoints(newPoints)
      const newCurves = { ...curves, [activeChannel]: newCurve, [activeChannel + 'pts']: newPoints }
      onChange(newCurves)
      dragRef.current = { point: newPoints[newPoints.length - 1], type: 'new', newPoints }
    }
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const { inVal, outVal } = getCanvasPoint(e)
    const { point } = dragRef.current

    // Check if endpoint constraint applies
    if (point === points[0]) {
      point.out = outVal
      point.in = 0
    } else if (point === points[points.length - 1]) {
      point.out = outVal
      point.in = 255
    } else {
      point.in = Math.max(1, Math.min(254, inVal))
      point.out = outVal
    }

    const newCurve = buildCurveFromPoints(points)
    const newCurves = { ...curves, [activeChannel]: newCurve }
    onChange(newCurves)
    redraw()
  }

  const handleMouseUp = () => {
    dragRef.current = null
  }

  const handleDoubleClick = (e) => {
    const hit = hitTest(e)
    if (!hit) return
    // Don't delete endpoints
    if (hit === points[0] || hit === points[points.length - 1]) return
    const newPoints = points.filter(p => p !== hit)
    const newCurve = buildCurveFromPoints(newPoints)
    const newCurves = { ...curves, [activeChannel]: newCurve, [activeChannel + 'pts']: newPoints }
    onChange(newCurves)
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
    const newCurves = { ...curves, ...result, activeChannel }
    onChange(newCurves)
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
        Click to add point · Drag to move · Double-click to delete
      </div>

      <button onClick={() => handleReset('all')} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#666', borderRadius: 4, padding: '3px 10px', fontSize: 10, cursor: 'pointer', alignSelf: 'flex-start',
      }}>Reset All</button>
    </div>
  )
}

export { makeIdentityCurve }