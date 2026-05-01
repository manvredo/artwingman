import styles from '../styles/Home.module.css'

const FILTERS = [
  { id: 'contour',   label: 'Contour',      min: 1, max: 20, unit: '',  sliderLabel: 'Strength',  def: 5 },
  { id: 'posterize', label: 'Posterize',    min: 2, max: 10, unit: 'lvl', sliderLabel: 'Levels',   def: 5 },
  { id: 'emboss',    label: 'Emboss',        min: 1, max: 10, unit: '',  sliderLabel: 'Amount',    def: 5 },
  { id: 'sharpen',   label: 'Sharpen',       min: 1, max: 20, unit: '',  sliderLabel: 'Amount',    def: 5 },
  { id: 'vignette',  label: 'Vignette',      min: -20, max: 20, unit: '', sliderLabel: 'Amount',   def: 5 },
  { id: 'noise',     label: 'Noise',         min: 1, max: 50, unit: '',  sliderLabel: 'Amount',    def: 10 },
  { id: 'bleach',    label: 'Bleach Bypass', min: 1, max: 20, unit: '',  sliderLabel: 'Amount',    def: 5 },
  { id: 'sobel',     label: 'Sobel/Edge',    min: 1, max: 20, unit: '',  sliderLabel: 'Amount',    def: 5 },
  { id: 'duotone',   label: 'Duotone',       colorA: '#ff6b35', colorB: '#2d1b69' },
]

export { FILTERS }

export default function Filters({ activeFilter, onFilterChange, filterStrength, onStrengthChange, onDuotoneColorsChange }) {
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

          {activeFilter === f.id && f.id === 'duotone' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6, paddingLeft: 2, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#8a8680' }}>Dark</span>
                <input
                  type="color"
                  value={f.colorA}
                  onChange={e => onDuotoneColorsChange(e.target.value, null)}
                  style={{ width: 36, height: 30, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'none', display: 'block', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#8a8680' }}>Light</span>
                <input
                  type="color"
                  value={f.colorB}
                  onChange={e => onDuotoneColorsChange(null, e.target.value)}
                  style={{ width: 36, height: 30, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'none', display: 'block', borderRadius: 4 }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
