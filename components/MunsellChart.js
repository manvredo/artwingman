import { useState, useRef, useEffect } from 'react'

const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
const VALUES  = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const MAX_CHROMA = {
  1: 6, 2: 8, 3: 12, 4: 16, 5: 20,
  6: 22, 7: 18, 8: 12, 9: 8,
}

const PAD_L = 44   // "Value" rotated label + number labels
const PAD_T = 28   // "Chroma" label + number labels
const GAP   = 2
const DETAIL_W = 120

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, compact }) {
  const containerRef = useRef(null)
  const [sz, setSz] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(null)

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

  const chartW = sz.w - DETAIL_W
  const cellWFromW = chartW > 0 ? (chartW - PAD_L) / CHROMAS.length : 0
  const cellWFromH = sz.h > 0 ? ((sz.h - PAD_T) / VALUES.length) * 2 : cellWFromW
  const cellW = Math.max(1, Math.min(cellWFromW, cellWFromH))
  const cellH = cellW / 2

  const svgW = chartW
  const svgH = PAD_T + VALUES.length * cellH

  const hueLabel = hue && hue !== '—' ? hue : '—'

  const hoveredColor = hovered
    ? `hsl(${hueAngle}, ${hovered.c * 4.5}%, ${hovered.v * 11}%)`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, alignSelf: 'stretch', overflow: 'hidden', background: '#161616' }}>

      {/* Chart */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', lineHeight: 0 }}
        onMouseLeave={() => setHovered(null)}
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
                    onMouseEnter={() => inRange && setHovered({ v, c })}
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
      </div>

      {/* Detail panel */}
      <div style={{
        width: DETAIL_W,
        flexShrink: 0,
        alignSelf: 'stretch',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        lineHeight: 'normal',
        transition: 'all 0.15s',
      }}>
        <div style={{
          width: '100%',
          height: 60,
          borderRadius: 5,
          background: hoveredColor ?? '#2a2a2a',
          border: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          transition: 'background 0.15s',
        }} />
        {hovered ? (
          <>
            <div style={{ fontSize: 13, color: '#c8a96e', fontFamily: 'monospace', fontWeight: 500, textAlign: 'left' }}>
              {hueLabel} {hovered.v}/{hovered.c}
            </div>
            <div style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', textAlign: 'left' }}>Value: {hovered.v}</div>
            <div style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', textAlign: 'left' }}>Chroma: {hovered.c}</div>
            <div style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', textAlign: 'left' }}>Hue: {hueLabel}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#555250', fontFamily: 'monospace', textAlign: 'left' }}>—</div>
        )}
      </div>

    </div>
  )
}
