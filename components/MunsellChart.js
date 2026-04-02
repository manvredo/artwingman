import { useState } from 'react'

const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
const VALUES  = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const MAX_CHROMA = {
  1: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 22,
  7: 18,
  8: 12,
  9: 8,
}

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color }) {
  const [selectedCell, setSelectedCell] = useState(null)

  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  const cellW = 52
  const cellH = 26
  const gap   = 2

  const padLeft = 46   // rotated "Value" label + number labels
  const padTop  = 34   // "Chroma" label + number labels

  const svgW = padLeft + CHROMAS.length * cellW + gap
  const svgH = padTop  + VALUES.length  * cellH + gap

  const handleCellClick = (v, c, inRange) => {
    if (!inRange) return
    setSelectedCell(prev =>
      prev && prev.value === v && prev.chroma === c ? null : { value: v, chroma: c }
    )
  }

  const selectedColor = selectedCell
    ? `hsl(${hueAngle}, ${selectedCell.chroma * 4.5}%, ${selectedCell.value * 11}%)`
    : null

  const hueLabel = hue && hue !== '—' ? hue : null

  return (
    <div style={{ background: '#161616', overflow: 'auto', lineHeight: 0, flexShrink: 0 }}>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>

        {/* "Chroma" axis label */}
        <text
          x={padLeft + (CHROMAS.length * cellW) / 2}
          y={12}
          textAnchor="middle"
          fontSize={10}
          fontFamily="monospace"
          fill="#555250"
          letterSpacing="0.06em"
        >Chroma</text>

        {/* "Value" axis label — rotated */}
        <text
          x={9}
          y={padTop + (VALUES.length * cellH) / 2}
          textAnchor="middle"
          fontSize={10}
          fontFamily="monospace"
          fill="#555250"
          letterSpacing="0.06em"
          transform={`rotate(-90, 9, ${padTop + (VALUES.length * cellH) / 2})`}
        >Value</text>

        {/* X-axis numbers */}
        {CHROMAS.map((c, col) => (
          <text
            key={`x${c}`}
            x={padLeft + col * cellW + cellW / 2}
            y={padTop - 5}
            textAnchor="middle"
            fontSize={10}
            fontFamily="monospace"
            fill="#555250"
          >{c}</text>
        ))}

        {/* Y-axis numbers */}
        {VALUES.map((v, row) => (
          <text
            key={`y${v}`}
            x={padLeft - 7}
            y={padTop + row * cellH + cellH / 2 + 4}
            textAnchor="end"
            fontSize={10}
            fontFamily="monospace"
            fill="#555250"
          >{v}</text>
        ))}

        {/* Cells */}
        {VALUES.map((v, row) =>
          CHROMAS.map((c, col) => {
            const x = padLeft + col * cellW
            const y = padTop  + row  * cellH
            const inRange = c <= MAX_CHROMA[v]
            const isActive   = hasColor && v === activeValue && c === activeChroma && inRange
            const isSelected = selectedCell && selectedCell.value === v && selectedCell.chroma === c && inRange

            const gx = x + gap / 2
            const gy = y + gap / 2
            const gw = cellW - gap
            const gh = cellH - gap

            // Border: gold for canvas-analyzed color, white for chart selection
            const borderColor = isActive ? '#c8a96e' : isSelected ? 'rgba(255,255,255,0.8)' : null

            return (
              <g
                key={`${v}-${c}`}
                onClick={() => handleCellClick(v, c, inRange)}
                style={{ cursor: inRange ? 'pointer' : 'default' }}
              >
                <rect
                  x={gx} y={gy} width={gw} height={gh}
                  fill={inRange ? `hsl(${hueAngle}, ${c * 4.5}%, ${v * 11}%)` : '#1a1a1a'}
                  rx={1}
                />
                {borderColor && (
                  <rect
                    x={gx} y={gy} width={gw} height={gh}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={2}
                    rx={1}
                  />
                )}
                {isActive && (
                  <circle
                    cx={x + cellW / 2}
                    cy={y + cellH / 2}
                    r={2.5}
                    fill="white"
                  />
                )}
              </g>
            )
          })
        )}
      </svg>

      {/* Selected cell info panel */}
      {selectedCell && (
        <div style={{
          lineHeight: 'normal',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#161616',
          width: svgW,
          boxSizing: 'border-box',
        }}>
          <div style={{
            height: 40,
            borderRadius: 5,
            background: selectedColor,
            border: '1px solid rgba(255,255,255,0.08)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: 13,
              color: '#c8a96e',
              fontFamily: 'monospace',
              fontWeight: 500,
              background: 'rgba(200,169,110,0.1)',
              border: '1px solid rgba(200,169,110,0.15)',
              borderRadius: 4,
              padding: '4px 10px',
            }}>
              {hueLabel
                ? `${hueLabel} ${selectedCell.value}/${selectedCell.chroma}`
                : `— ${selectedCell.value}/${selectedCell.chroma}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: '#222', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hue</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{hueLabel || '—'}</div>
            </div>
            <div style={{ flex: 1, background: '#222', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{selectedCell.value}</div>
            </div>
            <div style={{ flex: 1, background: '#222', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chroma</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{selectedCell.chroma}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
