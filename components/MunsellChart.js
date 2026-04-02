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

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, compact }) {
  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  const cellW   = compact ? 22 : 26
  const cellH   = compact ? 20 : 26
  const padLeft = 26
  const padTop  = 16
  const gap     = 1

  const svgW = padLeft + CHROMAS.length * cellW
  const svgH = padTop  + VALUES.length  * cellH

  return (
    <div style={{ background: '#161616', overflow: 'auto', lineHeight: 0 }}>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>

        {/* X-axis labels — Chroma (top) */}
        {CHROMAS.map((c, col) => (
          <text
            key={`x${c}`}
            x={padLeft + col * cellW + cellW / 2}
            y={padTop - 4}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fill="#555250"
          >{c}</text>
        ))}

        {/* Y-axis labels — Value (left) */}
        {VALUES.map((v, row) => (
          <text
            key={`y${v}`}
            x={padLeft - 4}
            y={padTop + row * cellH + cellH / 2 + 3}
            textAnchor="end"
            fontSize={9}
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
            const isActive = hasColor && v === activeValue && c === activeChroma && inRange

            return (
              <g key={`${v}-${c}`}>
                <rect
                  x={x + gap / 2} y={y + gap / 2}
                  width={cellW - gap} height={cellH - gap}
                  fill={inRange ? `hsl(${hueAngle}, ${c * 4.5}%, ${v * 11}%)` : '#1a1a1a'}
                  rx={1}
                />
                {isActive && (
                  <>
                    <rect
                      x={x + gap / 2} y={y + gap / 2}
                      width={cellW - gap} height={cellH - gap}
                      fill="none"
                      stroke="#c8a96e"
                      strokeWidth={2}
                      rx={1}
                    />
                    <circle
                      cx={x + cellW / 2}
                      cy={y + cellH / 2}
                      r={2}
                      fill="white"
                    />
                  </>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}
