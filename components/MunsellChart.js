import { useState, useRef, useEffect } from 'react'
import { munsellHvcToRgb } from '../lib/munsell'

const VALUES = [9, 8, 7, 6, 5, 4, 3, 2, 1]
const PAD_L = 40
const PAD_T = 36
const GAP = 1
const DETAIL_W = 120
const CELL = 36

// Hue number (0-100 system) to family
function hueToFamily(hueNum) {
  if (hueNum === null || hueNum === undefined || hueNum === 0) return 'N'
  if (hueNum < 10) return 'R'
  if (hueNum < 20) return 'YR'
  if (hueNum < 30) return 'Y'
  if (hueNum < 40) return 'GY'
  if (hueNum < 50) return 'G'
  if (hueNum < 60) return 'BG'
  if (hueNum < 70) return 'B'
  if (hueNum < 80) return 'PB'
  if (hueNum < 90) return 'P'
  return 'RP'
}

const FAMILY_MAX_CHROMA = {
  N:  { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 },
  R:  { 1:16, 2:20, 3:26, 4:28, 5:28, 6:26, 7:22, 8:14, 9:10 },
  YR: { 1:16, 2:20, 3:26, 4:28, 5:28, 6:26, 7:22, 8:14, 9:10 },
  Y:  { 1:16, 2:20, 3:26, 4:28, 5:28, 6:26, 7:22, 8:14, 9:10 },
  GY: { 1:14, 2:18, 3:22, 4:26, 5:26, 6:24, 7:20, 8:12, 9:8 },
  G:  { 1:12, 2:16, 3:20, 4:24, 5:24, 6:22, 7:18, 8:10, 9:6 },
  BG: { 1:10, 2:14, 3:18, 4:22, 5:22, 6:20, 7:16, 8:8, 9:6 },
  B:  { 1:10, 2:14, 3:18, 4:22, 5:22, 6:20, 7:16, 8:8, 9:6 },
  PB: { 1:12, 2:16, 3:20, 4:24, 5:24, 6:22, 7:18, 8:10, 9:6 },
  P:  { 1:12, 2:16, 3:20, 4:24, 5:24, 6:22, 7:18, 8:10, 9:6 },
  RP: { 1:14, 2:18, 3:22, 4:26, 5:26, 6:24, 7:20, 8:12, 9:8 },
}

function getChromasForHue(hueNum) {
  const family = hueToFamily(hueNum || 0)
  const maxC = FAMILY_MAX_CHROMA[family]?.[3] ?? 12  // use value 3 as reference for chroma columns
  const chromaList = []
  for (let c = 0; c <= 30; c += 2) {
    if (c <= maxC) chromaList.push(c)
    else if (c > maxC && c <= maxC + 6) chromaList.push(c)  // include up to 6 above max for transition
    else if (c > maxC + 6) break
  }
  return chromaList
}

function getMaxChroma(hueNum, value) {
  if (value === null || value === undefined) return 0
  const family = hueToFamily(hueNum || 0)
  return FAMILY_MAX_CHROMA[family]?.[value] ?? 0
}

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, compact, onCellOpen }) {
  const containerRef = useRef(null)
  const [sz, setSz] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(null)
  const [popup, setPopup] = useState(null)

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

  const effectiveHue = hueAngle || 0
  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue = value !== null ? Math.round(value) : null
  const hasColor = value !== null && chroma !== null

  // Build chroma list centered around active chroma if available, otherwise full range
  const family = hueToFamily(effectiveHue)
  const familyMaxC = FAMILY_MAX_CHROMA[family]?.[3] ?? 12
  const centerC = activeChroma !== null ? activeChroma : Math.min(familyMaxC, 10)
  const window = 10  // how far from center in each direction
  const chromaList = []
  for (let c = Math.max(0, centerC - window); c <= 30; c += 2) {
    if (c > familyMaxC + 6) break
    chromaList.push(c)
  }

  const cellW = CELL
  const cellH = CELL
  const svgW = PAD_L + chromaList.length * cellW
  const svgH = PAD_T + VALUES.length * cellH

  const hueLabel = hue && hue !== '—' ? hue : '—'

  const cellColor = (v, c) => {
    const rgb = munsellHvcToRgb(effectiveHue, v, c)
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

            {/* Chroma axis label */}
            <text
              x={PAD_L + (chromaList.length * cellW) / 2} y={11}
              textAnchor="middle" fontSize={12} fontFamily="monospace" fill="#a8a4a0"
            >CHROMA</text>

            {/* Value axis label — rotated */}
            <text
              x={9} y={PAD_T + (VALUES.length * cellH) / 2}
              textAnchor="middle" fontSize={12} fontFamily="monospace" fill="#a8a4a0"
              transform={`rotate(-90, 9, ${PAD_T + (VALUES.length * cellH) / 2})`}
            >VALUE</text>

            {/* X-axis numbers */}
            {chromaList.map((c, col) => (
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

            {/* Grid background */}
            <rect x={PAD_L} y={PAD_T} width={chromaList.length * cellW} height={VALUES.length * cellH} fill="rgb(70,70,70)" />

            {/* Cells */}
            {VALUES.map((v, row) =>
              chromaList.map((c, col) => {
                const x = PAD_L + col * cellW
                const y = PAD_T + row * cellH
                const maxC = getMaxChroma(effectiveHue, v)
                const inRange = c <= maxC
                const isActive = hasColor && v === activeValue && c === activeChroma && inRange
                const gx = x + GAP / 2, gy = y + GAP / 2
                const gw = cellW - GAP, gh = cellH - GAP

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
                      fill={inRange ? cellColor(v, c) : 'rgb(60,60,60)'}
                      rx={2}
                    />
                    {isActive && (
                      <>
                        <rect x={gx} y={gy} width={gw} height={gh}
                          fill="none" stroke={v >= 8 ? "#ff2222" : "#ffffff"} strokeWidth={1.5} rx={2} />
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
              const rgb = munsellHvcToRgb(effectiveHue, popup.v, popup.c)
              if (rgb) onCellOpen({ r: rgb.r, g: rgb.g, b: rgb.b, hue: hueLabel, hueName, value: popup.v, chroma: popup.c })
            }
            setPopup(null)
          }}
          style={{
            position: 'fixed',
            left: popup.x + 10,
            top: popup.y - 38,
            width: 60, height: 60,
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
          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: textColor }}>{hueLabel}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: textColor }}>{popup.v}/{popup.c}</div>
        </div>
      )
    })()}
    </>
  )
}