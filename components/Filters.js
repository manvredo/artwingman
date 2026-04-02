const FILTERS = [
  { id: null, label: 'None' },
  { id: 'soften', label: 'Soften' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'highcontrast', label: 'High Contrast' },
]

export default function Filters({ activeFilter, onFilterChange, filterStrength, onStrengthChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={String(f.id)}
            onClick={() => onFilterChange(f.id)}
            style={{
              background: activeFilter === f.id ? 'rgba(200,169,110,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeFilter === f.id ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeFilter === f.id ? '#c8a96e' : '#8a8680',
              borderRadius: 5,
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {activeFilter === 'soften' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Radius
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min="1"
              max="20"
              value={filterStrength}
              onChange={e => onStrengthChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
              {filterStrength}px
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
