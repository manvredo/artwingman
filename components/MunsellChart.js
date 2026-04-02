const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
const VALUES  = [9, 8, 7, 6, 5, 4, 3, 2, 1]

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color, active }) {
  if (!active) return null

  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  const cellW = 52
  const cellH = 36
  const padL  = 28
  const padB  = 22
  const svgW  = padL + CHROMAS.length * cellW
  const svgH  = VALUES.length * cellH + padB

  return (
    <div style={{
      background: '#161616',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '16px 24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>

      {/* Header: swatch + notation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 6, flexShrink: 0,
          background: color || '#2a2a2a',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
        <div>
          <div style={{ fontSize: 15, color: '#f0ece4', fontFamily: 'monospace', lineHeight: 1.3 }}>
            {hasColor ? `${hue} ${value.toFixed(1)}/${chroma.toFixed(1)}` : '— / —'}
          </div>
          <div style={{ fontSize: 11, color: '#555250', marginTop: 2 }}>
            {hueName || 'Pick a color from the image'}
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <div style={{ overflowX: 'auto' }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>

          {/* Y-axis labels */}
          {VALUES.map((v, row) => (
            <text
              key={v}
              x={padL - 6}
              y={row * cellH + cellH / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fontFamily="monospace"
              fill="#555250"
            >{v}</text>
          ))}

          {/* X-axis labels */}
          {CHROMAS.map((c, col) => (
            <text
              key={c}
              x={padL + col * cellW + cellW / 2}
              y={VALUES.length * cellH + 14}
              textAnchor="middle"
              fontSize={10}
              fontFamily="monospace"
              fill="#555250"
            >{c}</text>
          ))}

          {/* Cells */}
          {VALUES.map((v, row) =>
            CHROMAS.map((c, col) => {
              const isActive = hasColor && v === activeValue && c === activeChroma
              return (
                <g key={`${v}-${c}`}>
                  <rect
                    x={padL + col * cellW}
                    y={row * cellH}
                    width={cellW - 2}
                    height={cellH - 2}
                    fill={`hsl(${hueAngle}, ${c * 5}%, ${v * 10}%)`}
                    rx={2}
                  />
                  {isActive && (
                    <rect
                      x={padL + col * cellW}
                      y={row * cellH}
                      width={cellW - 2}
                      height={cellH - 2}
                      fill="none"
                      stroke="#c8a96e"
                      strokeWidth={2.5}
                      rx={2}
                    />
                  )}
                </g>
              )
            })
          )}

          {/* Axis titles */}
          <text
            x={padL + (CHROMAS.length * cellW) / 2}
            y={svgH}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fill="#3a3835"
          >Chroma</text>
          <text
            x={0}
            y={VALUES.length * cellH / 2}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fill="#3a3835"
            transform={`rotate(-90, 8, ${VALUES.length * cellH / 2})`}
          >Value</text>
        </svg>
      </div>
    </div>
  )
}
