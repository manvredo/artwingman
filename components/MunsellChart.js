import { useState, useRef, useEffect } from 'react'

const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
const VALUES  = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const MAX_CHROMA = {
  1: 6, 2: 8, 3: 12, 4: 16, 5: 20,
  6: 22, 7: 18, 8: 12, 9: 8,
}

const TOOLTIP_W = 130
const TOOLTIP_H = 110  // 8 pad + 32 swatch + 4 + 15 notation + 4 + 14 value + 4 + 14 chroma + 8 pad + margins

const PAD_L = 44   // "Value" rotated label + number labels
const PAD_T = 28   // "Chroma" label + number labels
const GAP   = 2

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, compact }) {
  const containerRef = useRef(null)
  const [sz, setSz] = useState({ w: 0, h: 0 })
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSz({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  // Cell size: constrained by both width AND height so chart always fits
  const cellWFromW = sz.w > 0 ? (sz.w - PAD_L) / CHROMAS.length : 0
  const cellWFromH = sz.h > 0 ? ((sz.h - PAD_T) / VALUES.length) * 2 : cellWFromW
  const cellW = Math.max(1, Math.min(cellWFromW, cellWFromH))
  const cellH = cellW / 2

  const svgW = sz.w
  const svgH = PAD_T + VALUES.length * cellH

  const hueLabel = hue && hue !== '—' ? hue : '—'

  const handleEnter = (v, c, inRange, col, row) => {
    if (!inRange) return
    const cellX = PAD_L + col * cellW
    const cellY = PAD_T + row * cellH

    // Horizontal: slightly right of cell center, clamped to container
    const tx = Math.max(4, Math.min(cellX + cellW / 2 + 8, sz.w - TOOLTIP_W - 4))

    // Vertical: prefer above cell, fall back to below, always clamp to container
    const aboveY = cellY - TOOLTIP_H - 6
    const belowY = cellY + cellH + 6
    const rawTy  = aboveY >= PAD_T ? aboveY : belowY
    const ty = Math.max(4, Math.min(rawTy, sz.h - TOOLTIP_H - 4))

    setTooltip({
      v, c, tx, ty,
      color: `hsl(${hueAngle}, ${c * 4.5}%, ${v * 11}%)`,
    })
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', lineHeight: 0, background: '#161616' }}
      onMouseLeave={() => setTooltip(null)}
    >
      {sz.w > 0 && sz.h > 0 && (
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>

          {/* "Chroma" axis label */}
          <text
            x={PAD_L + (CHROMAS.length * cellW) / 2} y={11}
            textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#555250"
          >Chroma</text>

          {/* "Value" axis label — rotated */}
          <text
            x={9} y={PAD_T + (VALUES.length * cellH) / 2}
            textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#555250"
            transform={`rotate(-90, 9, ${PAD_T + (VALUES.length * cellH) / 2})`}
          >Value</text>

          {/* X-axis numbers */}
          {CHROMAS.map((c, col) => (
            <text key={`x${c}`}
              x={PAD_L + col * cellW + cellW / 2} y={PAD_T - 5}
              textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#555250"
            >{c}</text>
          ))}

          {/* Y-axis numbers */}
          {VALUES.map((v, row) => (
            <text key={`y${v}`}
              x={PAD_L - 7} y={PAD_T + row * cellH + cellH / 2 + 4}
              textAnchor="end" fontSize={10} fontFamily="monospace" fill="#555250"
            >{v}</text>
          ))}

          {/* Cells */}
          {VALUES.map((v, row) =>
            CHROMAS.map((c, col) => {
              const x = PAD_L + col * cellW
              const y = PAD_T + row * cellH
              const inRange = c <= MAX_CHROMA[v]
              const isActive = hasColor && v === activeValue && c === activeChroma && inRange
              const gx = x + GAP / 2, gy = y + GAP / 2
              const gw = cellW - GAP,  gh = cellH - GAP

              return (
                <g
                  key={`${v}-${c}`}
                  onMouseEnter={() => handleEnter(v, c, inRange, col, row)}
                  style={{ cursor: inRange ? 'crosshair' : 'default' }}
                >
                  <rect
                    x={gx} y={gy} width={gw} height={gh}
                    fill={inRange ? `hsl(${hueAngle}, ${c * 4.5}%, ${v * 11}%)` : '#1a1a1a'}
                    rx={1}
                  />
                  {isActive && (
                    <>
                      <rect x={gx} y={gy} width={gw} height={gh}
                        fill="none" stroke="#c8a96e" strokeWidth={2} rx={1} />
                      <circle cx={x + cellW / 2} cy={y + cellH / 2} r={2} fill="white" />
                    </>
                  )}
                </g>
              )
            })
          )}
        </svg>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.tx,
          top: tooltip.ty,
          width: TOOLTIP_W,
          background: '#222',
          border: '1px solid rgba(200,169,110,0.3)',
          borderRadius: 6,
          padding: 8,
          pointerEvents: 'none',
          zIndex: 100,
          lineHeight: 'normal',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: tooltip.color,
            border: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }} />
          <div style={{ fontSize: 11, color: '#c8a96e', fontFamily: 'monospace', fontWeight: 500 }}>
            {hueLabel} {tooltip.v}/{tooltip.c}
          </div>
          <div style={{ fontSize: 10, color: '#8a8680', fontFamily: 'monospace' }}>
            Value: {tooltip.v}
          </div>
          <div style={{ fontSize: 10, color: '#8a8680', fontFamily: 'monospace' }}>
            Chroma: {tooltip.c}
          </div>
        </div>
      )}
    </div>
  )
}
