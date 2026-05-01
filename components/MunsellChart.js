import { useState, useRef, useEffect, useCallback } from 'react'
import { munsellHvcToRgb } from '../lib/munsell'

const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
const VALUES  = [9, 8, 7, 6, 5, 4, 3, 2, 1]

const MAX_CHROMA = {
  1: 14, 2: 18, 3: 22, 4: 24, 5: 26,
  6: 28, 7: 26, 8: 20, 9: 12,
}

const PAD_L = 44   // "Value" rotated label + number labels
const PAD_T = 44   // "Chroma" label + number labels
const GAP   = 1
const DETAIL_W = 120

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, compact, onCellOpen }) {
  const containerRef = useRef(null)
  const [sz, setSz] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(null)
  const [popup, setPopup] = useState(null) // { v, c, x, y }

  useEffect(() => {
    if (!popup) return
    const close = () => setPopup(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [popup])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSz({ w: Math.max(1, Math.floor(width)), h: Math.max(1, Math.floor(height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  const cellWFromH = sz.h > 0 ? (sz.h - PAD_T) / VALUES.length * 2 : 1
  const cellWFromW = sz.w > 0 ? (sz.w - PAD_L) / CHROMAS.length : 80
  const cellW = Math.max(40, Math.min(cellWFromH, cellWFromW))
  const cellH = cellW / 2

  const svgW = PAD_L + CHROMAS.length * cellW
  const svgH = PAD_T + VALUES.length * cellH

  const hueLabel = hue && hue !== '—' ? hue : '—'

  const cellColor = (v, c) => {
    const rgb = munsellHvcToRgb(hue, v, c)
    if (!rgb) return '#1a1a1a'
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`
  }
  const hoveredColor = hovered ? cellColor(hovered.v, hovered.c) : null

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, alignSelf: 'stretch', overflow: 'hidden', background: '#161616' }}>

      {/* Chart */}
      <div
        ref={containerRef}
        style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', lineHeight: 0 }}
        onMouseLeave={() => setHovered(null)}
      >
        {sz.w > 0 && sz.h > 0 && (
          <svg width={svgW} height={svgH} style={{ display: 'block' }}>

            {/* "Chroma" axis label */}
            <text
              x={PAD_L + (CHROMAS.length * cellW) / 2} y={11}
              textAnchor="middle" fontSize={13} fontFamily="monospace" fill="#a8a4a0"
            >CHROMA</text>

            {/* "Value" axis label — rotated */}
            <text
              x={9} y={PAD_T + (VALUES.length * cellH) / 2}
              textAnchor="middle" fontSize={13} fontFamily="monospace" fill="#a8a4a0"
              transform={`rotate(-90, 9, ${PAD_T + (VALUES.length * cellH) / 2})`}
            >VALUE</text>

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

            {/* Grid separator background */}
            <rect x={PAD_L} y={PAD_T} width={CHROMAS.length * cellW} height={VALUES.length * cellH} fill="#2a2a2a" />

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
                    onClick={(e) => {
                      if (!inRange) return
                      e.stopPropagation()
                      setPopup({ v, c, x: e.clientX, y: e.clientY })
                    }}
                    style={{ cursor: inRange ? 'pointer' : 'default' }}
                  >
                    <rect
                      x={gx} y={gy} width={gw} height={gh}
                      fill={inRange ? cellColor(v, c) : '#1a1a1a'}
                      rx={1}
                    />
                    {isActive && (
                      <>
                        <rect x={gx} y={gy} width={gw} height={gh}
                          fill="none" stroke={v >= 8 ? "#ff2222" : "#ffffff"} strokeWidth={2} rx={1} />
                        <circle cx={x + cellW / 2} cy={y + cellH / 2} r={2} fill={v >= 8 ? "#ff2222" : "white"} />
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
        {hovered ? (
          <>
            <div style={{ fontSize: 15, color: '#c8a96e', fontFamily: 'monospace', fontWeight: 500, textAlign: 'left' }}>
              {hueLabel} {hovered.v}/{hovered.c}
            </div>
            <div style={{ fontSize: 13, color: '#a8a4a0', fontFamily: 'monospace', textAlign: 'left' }}>Value: {hovered.v}</div>
            <div style={{ fontSize: 13, color: '#a8a4a0', fontFamily: 'monospace', textAlign: 'left' }}>Chroma: {hovered.c}</div>
            <div style={{ fontSize: 13, color: '#a8a4a0', fontFamily: 'monospace', textAlign: 'left' }}>Hue: {hueLabel}</div>
          </>
        ) : (
          <div style={{ fontSize: 15, color: '#706c68', fontFamily: 'monospace', textAlign: 'left' }}>—</div>
        )}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 5,
          background: hoveredColor ?? '#2a2a2a',
          border: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          transition: 'background 0.15s',
        }} />
      </div>

    </div>

    {/* Cell click popup */}
    {popup && (() => {
      const bg = cellColor(popup.v, popup.c)
      const light = popup.v >= 5
      const textColor = light ? '#1a1a1a' : '#c8a96e'
      return (
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={() => {
            if (onCellOpen) {
              const rgb = munsellHvcToRgb(hue, popup.v, popup.c)
              if (rgb) onCellOpen({ r: rgb.r, g: rgb.g, b: rgb.b, hue: hueLabel, hueName, value: popup.v, chroma: popup.c })
            }
            setPopup(null)
          }}
          style={{
            position: 'fixed',
            left: popup.x + 10,
            top: popup.y - 38,
            width: 76, height: 76,
            background: bg,
            borderRadius: 8,
            cursor: 'pointer',
            zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            userSelect: 'none',
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: textColor }}>{hueLabel}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: textColor }}>{popup.v}/{popup.c}</div>
        </div>
      )
    })()}
    </>
  )
}
