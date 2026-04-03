import { useEffect, useRef } from 'react'

const HUE_NAMES = ['R','YR','Y','GY','G','BG','B','PB','P','RP']
const HUE_ANGLES = [25, 55, 85, 115, 165, 210, 245, 280, 315, 355]

export default function HueWheel({ hueAngle, hueName, color, active, onHueClick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = 90, cy = 90, r = 78, inner = 32

    ctx.clearRect(0, 0, 180, 180)

    for (let deg = 0; deg < 360; deg++) {
      const angle = (deg - 90) * Math.PI / 180
      ctx.beginPath()
      ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle))
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      ctx.strokeStyle = `hsl(${deg}, 65%, 55%)`
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
      const ix = cx + ((inner + r) / 2) * Math.cos(angle)
      const iy = cy + ((inner + r) / 2) * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(ix, iy, 7, 0, Math.PI * 2)
      ctx.fillStyle = color || '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [hueAngle, hueName, color, active])

  const handleClick = (e) => {
    if (!onHueClick) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (180 / rect.width)
    const y = (e.clientY - rect.top) * (180 / rect.height)
    const cx = 90, cy = 90, inner = 32, r = 78
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < inner || dist > r) return
    let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90
    deg = ((deg % 360) + 360) % 360
    onHueClick(deg)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas ref={canvasRef} width={180} height={180}
        style={{ borderRadius: '50%', cursor: onHueClick ? 'crosshair' : 'default' }}
        onClick={handleClick}
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