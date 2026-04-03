function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function GridOverlay({ gridMode, squareGridSize, showDiagonals, gridColor = '#ffffff', gridOpacity = 0.9 }) {
  if (!gridMode) return null

  let cols, rows, preserveAspectRatio, viewBox

  if (gridMode === '3x3') {
    cols = rows = 3
    preserveAspectRatio = 'none'
    viewBox = '0 0 3 3'
  } else if (gridMode === '4x4') {
    cols = rows = 4
    preserveAspectRatio = 'none'
    viewBox = '0 0 4 4'
  } else {
    cols = rows = squareGridSize
    preserveAspectRatio = 'none'
    viewBox = `0 0 ${squareGridSize} ${squareGridSize}`
  }

  const lines = []
  for (let x = 1; x < cols; x++) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={rows} stroke={hexToRgba(gridColor, gridOpacity)} strokeWidth="1" vectorEffect="non-scaling-stroke" />)
  }
  for (let y = 1; y < rows; y++) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={cols} y2={y} stroke={hexToRgba(gridColor, gridOpacity)} strokeWidth="1" vectorEffect="non-scaling-stroke" />)
  }

  const diagonals = []
  if (showDiagonals) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        diagonals.push(
          <line key={`d1-${row}-${col}`} x1={col} y1={row} x2={col + 1} y2={row + 1} stroke={hexToRgba(gridColor, gridOpacity * 0.65)} strokeWidth="1" vectorEffect="non-scaling-stroke" />,
          <line key={`d2-${row}-${col}`} x1={col + 1} y1={row} x2={col} y2={row + 1} stroke={hexToRgba(gridColor, gridOpacity * 0.65)} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )
      }
    }
  }

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
    >
      {lines}
      {diagonals}
    </svg>
  )
}
