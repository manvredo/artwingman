import { useEffect, useRef, useState } from 'react'
import { labToRgb } from '../lib/munsell'

const HUE_NAMES = ['R','YR','Y','GY','G','BG','B','PB','P','RP']
const HUE_ANGLES = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]

export default function HueWheel({ hueAngle, hueName, color, active, onHueClick }) {
  const canvasRef = useRef(null)
  const dragging = useRef(false)
  const [markerR, setMarkerR] = useState(55) // default midpoint of ring

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = 90, cy = 90, r = 78, inner = 32

    ctx.clearRect(0, 0, 180, 180)

    for (let deg = 0; deg < 360; deg++) {
      const angle = (deg - 90) * Math.PI / 180
      const rad = deg * Math.PI / 180
      const { r: cr, g: cg, b: cb } = labToRgb(55, 40 * Math.cos(rad), 40 * Math.sin(rad))
      ctx.beginPath()
      ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle))
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      ctx.strokeStyle = `rgb(${cr},${cg},${cb})`
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(cx, cy, inner - 1, 0, Math.PI * 2)
    ctx.fillStyle = '#161616'
    ctx.fill()

    HUE_NAMES.forEach((name, i) => {
      const angle = (HUE_ANGLES[i] - 90) * Math.PI / 180
      const tx = cx + (r + 14) * Math.cos(angle)
      const ty = cy + (r + 14) * Math.sin(angle)
      ctx.font = '500 9px monospace'
      ctx.fillStyle = '#555250'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, tx, ty)
    })

    if (active && hueAngle !== null) {
      const angle = (hueAngle - 90) * Math.PI / 180
      const ix = cx + markerR * Math.cos(angle)
      const iy = cy + markerR * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(ix, iy, 7, 0, Math.PI * 2)
      ctx.fillStyle = color || '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [hueAngle, hueName, color, active, markerR])

  const getHitInfo = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const cx = 90, cy = 90, inner = 32, r = 78
    const x = (e.clientX - rect.left) * (180 / rect.width)
    const y = (e.clientY - rect.top) * (180 / rect.height)
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < inner) return null
    let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90
    deg = ((deg % 360) + 360) % 360
    const clampedR = Math.min(r, Math.max(inner, dist))
    return { deg, r: clampedR }
  }

  const handleMouseDown = (e) => {
    if (!onHueClick) return
    dragging.current = true
    const hit = getHitInfo(e)
    if (hit) { onHueClick(hit.deg); setMarkerR(hit.r) }

    const onMove = (ev) => {
      if (!dragging.current) return
      const hit = getHitInfo(ev)
      if (hit) { onHueClick(hit.deg); setMarkerR(hit.r) }
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas ref={canvasRef} width={180} height={180}
        style={{ borderRadius: '50%', cursor: onHueClick ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
      />
      <div style={{
        fontFamily: 'monospace',
        fontSize: 12,
        color: active ? '#c8a96e' : '#555250',
        background: active ? 'rgba(200,169,110,0.1)' : 'transparent',
        border: `1px solid ${active ? 'rgba(200,169,110,0.2)' : 'transparent'}`,
        borderRadius: 5,
        padding: '5px 12px',
        textAlign: 'center',
        transition: 'all 0.2s'
      }}>
        {active ? `${hueName} — ${Math.round(hueAngle)}°` : 'Click image to analyze'}
      </div>
    </div>
  )
}
