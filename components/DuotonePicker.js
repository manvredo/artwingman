import { useCallback, useRef, useEffect, useState } from 'react'

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0, s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 }
}

function hsvToHex(h, s, v) {
  s /= 100; v /= 100
  const k = (n) => (n + h / 60) % 6
  const f = (n) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)))
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export function DuotonePicker({ color, onChange, label }) {
  const canvasRef = useRef(null)
  const [hsv, setHsv] = useState(() => hexToHsv(color))
  const isDraggingRef = useRef(false)

  // Always redraw canvas when color changes
  useEffect(() => {
    setHsv(hexToHsv(color))
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const { h: hue, s, v } = hexToHsv(color)
    const gradH = ctx.createLinearGradient(0, 0, w, 0)
    gradH.addColorStop(0, `hsl(${hue},100%,100%)`)
    gradH.addColorStop(1, `hsl(${hue},100%,50%)`)
    ctx.fillStyle = gradH
    ctx.fillRect(0, 0, w, h)
    const gradV = ctx.createLinearGradient(0, 0, 0, h)
    gradV.addColorStop(0, 'rgba(0,0,0,0)')
    gradV.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = gradV
    ctx.fillRect(0, 0, w, h)
  }, [color])

  const handleCanvasMouseDown = useCallback((e) => {
    isDraggingRef.current = true
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const newS = Math.max(0, Math.min(100, x * 100))
    const newV = Math.max(0, Math.min(100, (1 - y) * 100))
    const newHex = hsvToHex(hsv.h, newS, newV)
    setHsv({ h: hsv.h, s: newS, v: newV })
    onChange(newHex)
  }, [hsv, onChange])

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const newS = Math.max(0, Math.min(100, x * 100))
    const newV = Math.max(0, Math.min(100, (1 - y) * 100))
    const newHex = hsvToHex(hsv.h, newS, newV)
    setHsv({ h: hsv.h, s: newS, v: newV })
    onChange(newHex)
  }, [hsv, onChange])

  const handleCanvasMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleHueChange = useCallback((e) => {
    const newH = Number(e.target.value)
    setHsv(prev => {
      const newHex = hsvToHex(newH, prev.s, prev.v)
      onChange(newHex)
      return { ...prev, h: newH }
    })
  }, [onChange])

  const handleHexInput = useCallback((e) => {
    const val = e.target.value
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setHsv(hexToHsv(val))
      onChange(val)
    }
  }, [onChange])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 15, color: '#8a8680', textAlign: 'center' }}>{label}</span>
      <canvas
        ref={canvasRef}
        width={180}
        height={130}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{ borderRadius: 8, cursor: 'crosshair', display: 'block', width: 180, height: 130, margin: '0 auto' }}
      />
      <div style={{ position: 'relative', height: 16, marginTop: 4 }}>
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 8,
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            height: 16,
          }}
        />
        <input
          type="range"
          min="0"
          max="360"
          value={Math.round(hsv.h)}
          onChange={handleHueChange}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0,
            width: '100%',
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: `calc(${(hsv.h / 360) * 100}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: `hsl(${hsv.h},100%,50%)`,
            border: '2px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <input
        type="text"
        value={color}
        onChange={handleHexInput}
        maxLength={7}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          color: '#c8a96e',
          fontSize: 13,
          fontFamily: 'monospace',
          padding: '5px 8px',
          width: '100%',
          textAlign: 'center',
          outline: 'none',
        }}
      />
    </div>
  )
}