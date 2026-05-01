import { useRef, useEffect } from 'react'

// Default to identity curve (flat diagonal)
function makeIdentityCurve() {
  return Array.from({ length: 256 }, (_, i) => i)
}

const PRESETS = {
  'Identity': null,
  'S-Curve': (ch) => {
    const curve = makeIdentityCurve()
    for (let i = 0; i < 256; i++) {
      const t = i / 255
      curve[i] = Math.round(128 + (t - 0.5) * Math.sin(t * Math.PI) * 128)
    }
    return curve
  },
  'Black & White': (ch) => {
    const curve = makeIdentityCurve()
    for (let i = 0; i < 256; i++) {
      curve[i] = i < 128 ? 0 : 255
    }
    return curve
  },
  'Negative': (ch) => {
    const curve = makeIdentityCurve()
    for (let i = 0; i < 256; i++) curve[i] = 255 - i
    return curve
  },
  'Threshold': (ch) => {
    const curve = makeIdentityCurve()
    for (let i = 0; i < 256; i++) curve[i] = i < 128 ? 0 : 255
    return curve
  },
}

const CHANNEL_COLORS = {
  R: '#e74c3c',
  G: '#2ecc71',
  B: '#3498db',
  Luminosity: '#cccccc',
}

const CANVAS_W = 240
const CANVAS_H = 240

function drawCurve(canvas, curve, channelColor, activeChannel) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // Background
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_W)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    const pos = (i / 4) * CANVAS_W
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, CANVAS_W); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(CANVAS_W, pos); ctx.stroke()
  }

  // Diagonal reference
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_W); ctx.lineTo(CANVAS_W, 0)
  ctx.stroke()

  if (!curve) return

  // Draw curve
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

  // Control points (every 32 steps)
  ctx.fillStyle = activeChannel === 'Luminosity' ? '#cccccc' : channelColor
  for (let i = 0; i < 256; i += 32) {
    if (i === 0 || i === 255) continue
    const x = (i / 255) * CANVAS_W
    const y = CANVAS_W - (curve[i] / 255) * CANVAS_W
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function CurvesEditor({ curves, onChange }) {
  const canvasRef = useRef(null)

  const activeChannel = curves.activeChannel || 'Luminosity'
  const activeCurve = curves[activeChannel] || makeIdentityCurve()

  useEffect(() => {
    if (!canvasRef.current) return
    drawCurve(canvasRef.current, activeCurve, CHANNEL_COLORS[activeChannel], activeChannel)
  }, [activeCurve, activeChannel])

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_W / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const inX = Math.round((x / CANVAS_W) * 255)
    const outX = Math.round((1 - y / CANVAS_W) * 255)
    const clampedOut = Math.max(0, Math.min(255, outX))

    // Build new curve with point interpolated
    const newCurve = makeIdentityCurve()
    for (let i = 0; i < 256; i++) {
      if (i <= inX) {
        newCurve[i] = Math.round((i / inX) * clampedOut)
      } else {
        newCurve[i] = Math.round(clampedOut + ((i - inX) / (255 - inX)) * (255 - clampedOut))
      }
    }

    const newCurves = { ...curves, [activeChannel]: newCurve }
    onChange(newCurves)
  }

  const handleCanvasClick = (e) => {
    handleCanvasMouseDown(e)
  }

  const handleReset = (channel) => {
    const newCurves = { ...curves }
    if (channel === 'all') {
      newCurves.R = makeIdentityCurve()
      newCurves.G = makeIdentityCurve()
      newCurves.B = makeIdentityCurve()
      newCurves.Luminosity = makeIdentityCurve()
    } else {
      newCurves[channel] = makeIdentityCurve()
    }
    onChange(newCurves)
  }

  const handlePreset = (presetName) => {
    if (presetName === 'Identity') {
      handleReset('all')
      return
    }
    const factory = PRESETS[presetName]
    if (!factory) return
    const newCurves = { ...curves }
    newCurves.R = factory('R')
    newCurves.G = factory('G')
    newCurves.B = factory('B')
    newCurves.Luminosity = factory('Luminosity')
    onChange(newCurves)
  }

  const setActiveChannel = (ch) => {
    onChange({ ...curves, activeChannel: ch })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Object.keys(PRESETS).map(name => (
          <button
            key={name}
            onClick={() => handlePreset(name)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#8a8680',
              borderRadius: 4,
              padding: '3px 7px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Channel tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {['R', 'G', 'B', 'Luminosity'].map(ch => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            style={{
              background: activeChannel === ch ? `${CHANNEL_COLORS[ch]}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeChannel === ch ? CHANNEL_COLORS[ch] + '88' : 'rgba(255,255,255,0.15)'}`,
              color: activeChannel === ch ? CHANNEL_COLORS[ch] : '#8a8680',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: activeChannel === ch ? 'bold' : 'normal',
            }}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Curve canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_W}
        style={{
          width: '100%',
          maxWidth: 240,
          aspectRatio: '1',
          cursor: 'crosshair',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={handleCanvasClick}
      />

      {/* Reset */}
      <button
        onClick={() => handleReset('all')}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#666',
          borderRadius: 4,
          padding: '3px 10px',
          fontSize: 10,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        Reset All
      </button>
    </div>
  )
}

export { CurvesEditor, makeIdentityCurve }