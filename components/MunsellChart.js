const CHROMAS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
const VALUES = [9, 8, 7, 6, 5, 4, 3, 2, 1]

export default function MunsellChart({ hueAngle, hueName, hue, value, chroma, color }) {
  const activeChroma = chroma !== null ? Math.round(chroma / 2) * 2 : null
  const activeValue  = value  !== null ? Math.round(value)         : null
  const hasColor = value !== null && chroma !== null

  const cellW = 18
  const cellH = 14
  const padL = 22
  const padB = 18
  const svgW = padL + CHROMAS.length * cellW
  const svgH = VALUES.length * cellH + padB

  return (
    <div style={{ padding: '12px 12px 8px', background: '#161616' }}>

      {/* Swatch + notation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
          background: color || '#2a2a2a',
          border: '1px solid rgba(255,255,255,0.08)'
        }} />
        <div>
          <div style={{ fontSize: 13, color: '#f0ece4', fontFamily: 'monospace', lineHeight: 1.3 }}>
            {hasColor ? `${hue} ${value.toFixed(1)}/${chroma.toFixed(1)}` : '— / —'}
          </div>
          <div style={{ fontSize: 10, color: '#555250', marginTop: 1 }}>
            {hueName || 'Pick a color'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>

        {/* Y-axis labels (Value) */}
        {VALUES.map((v, row) => (
          <text
            key={v}
            x={padL - 4}
            y={row * cellH + cellH / 2 + 4}
            textAnchor="end"
            fontSize={8}
            fontFamily="monospace"
            fill="#555250"
          >{v}</text>
        ))}

        {/* X-axis labels (Chroma) */}
        {CHROMAS.map((c, col) => (
          <text
            key={c}
            x={padL + col * cellW + cellW / 2}
            y={VALUES.length * cellH + 11}
            textAnchor="middle"
            fontSize={8}
            fontFamily="monospace"
            fill="#555250"
          >{c}</text>
        ))}

        {/* Cells */}
        {VALUES.map((v, row) =>
          CHROMAS.map((c, col) => {
            const lightness = v * 10
            const saturation = c * 5
            const fill = `hsl(${hueAngle}, ${saturation}%, ${lightness}%)`
            const isActive = hasColor && v === activeValue && c === activeChroma
            return (
              <g key={`${v}-${c}`}>
                <rect
                  x={padL + col * cellW}
                  y={row * cellH}
                  width={cellW - 1}
                  height={cellH - 1}
                  fill={fill}
                  rx={1}
                />
                {isActive && (
                  <rect
                    x={padL + col * cellW}
                    y={row * cellH}
                    width={cellW - 1}
                    height={cellH - 1}
                    fill="none"
                    stroke="#c8a96e"
                    strokeWidth={2}
                    rx={1}
                  />
                )}
              </g>
            )
          })
        )}

        {/* Axis titles */}
        <text x={padL + (CHROMAS.length * cellW) / 2} y={svgH} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="#3a3835">Chroma</text>
        <text
          x={0} y={VALUES.length * cellH / 2}
          textAnchor="middle"
          fontSize={8}
          fontFamily="monospace"
          fill="#3a3835"
          transform={`rotate(-90, 6, ${VALUES.length * cellH / 2})`}
        >Value</text>
      </svg>
    </div>
  )
}
