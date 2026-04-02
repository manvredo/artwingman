import { useState } from 'react'

export default function Palette({ palette, onRemove, onClear, onSelect, selected }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#555250', fontFamily: 'monospace' }}>
          {palette.length}/24 colors
        </span>
        {palette.length > 0 && (
          <button onClick={onClear} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#555250',
            borderRadius: 4,
            padding: '3px 10px',
            fontSize: 11,
            cursor: 'pointer',
          }}>
            Clear all
          </button>
        )}
      </div>

      {palette.length === 0 ? (
        <div style={{ fontSize: 11, color: '#555250', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
          No colors yet — click image then add to palette
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
          {palette.map((c, i) => (
            <div
              key={i}
              onClick={() => onSelect(i)}
              title={`${c.hue} ${c.value.toFixed(1)}/${c.chroma.toFixed(1)}`}
              style={{
                width: '100%',
                aspectRatio: '1',
                background: `rgb(${c.r},${c.g},${c.b})`,
                borderRadius: 4,
                cursor: 'pointer',
                border: selected === i
                  ? '2px solid #c8a96e'
                  : '1px solid rgba(255,255,255,0.1)',
                transition: 'border 0.1s',
              }}
            />
          ))}
        </div>
      )}

      {selected !== null && palette[selected] && (
        <div style={{
          background: '#222',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 4,
              background: `rgb(${palette[selected].r},${palette[selected].g},${palette[selected].b})`,
              border: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 13, color: '#c8a96e', fontFamily: 'monospace', fontWeight: 500 }}>
                {palette[selected].hue} {palette[selected].value.toFixed(1)}/{palette[selected].chroma.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: '#555250', fontFamily: 'monospace' }}>
                RGB {palette[selected].r}, {palette[selected].g}, {palette[selected].b}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: '#1a1a1a', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{palette[selected].value.toFixed(1)}</div>
            </div>
            <div style={{ flex: 1, background: '#1a1a1a', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chroma</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{palette[selected].chroma.toFixed(1)}</div>
            </div>
            <div style={{ flex: 1, background: '#1a1a1a', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555250', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hue</div>
              <div style={{ fontSize: 14, color: '#c8a96e', fontWeight: 500 }}>{palette[selected].hue}</div>
            </div>
          </div>
          <button onClick={() => onRemove(selected)} style={{
            background: 'transparent',
            border: '1px solid rgba(239,68,68,0.3)',
            color: 'rgba(239,68,68,0.7)',
            borderRadius: 4,
            padding: '4px',
            fontSize: 11,
            cursor: 'pointer',
          }}>
            Remove
          </button>
        </div>
      )}
    </div>
  )
}