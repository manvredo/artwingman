import styles from '../styles/Home.module.css'

const FILTERS = [
  { id: 'contour',   label: 'Contour',   min: 1, max: 20, unit: '',  sliderLabel: 'Strength', def: 5 },
  { id: 'posterize', label: 'Posterize', min: 2, max: 10, unit: 'lvl', sliderLabel: 'Levels', def: 5 },
]

export { FILTERS }

export default function Filters({ activeFilter, onFilterChange, filterStrength, onStrengthChange }) {
  const activeCfg = FILTERS.find(f => f.id === activeFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* None button */}
      <button
        onClick={() => onFilterChange(null)}
        style={{
          background: activeFilter === null ? 'rgba(200,169,110,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${activeFilter === null ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: activeFilter === null ? '#c8a96e' : '#8a8680',
          borderRadius: 5,
          padding: '5px 10px',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        None
      </button>

      {FILTERS.map(f => (
        <div key={f.id}>
          <button
            onClick={() => onFilterChange(f.id)}
            style={{
              background: activeFilter === f.id ? 'rgba(200,169,110,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeFilter === f.id ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeFilter === f.id ? '#c8a96e' : '#8a8680',
              borderRadius: 5,
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            {f.label}
          </button>

          {activeFilter === f.id && f.min !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 2 }}>
              <input
                type="range"
                min={f.min}
                max={f.max}
                value={Math.min(f.max, Math.max(f.min, filterStrength))}
                onChange={e => onStrengthChange(Number(e.target.value))}
                className={styles.filterSlider}
                style={{ flex: 1 }}
              />
              <span
                style={{ fontSize: 11, color: '#8a8680', fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>
                {Math.min(f.max, Math.max(f.min, filterStrength))}{f.unit}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
