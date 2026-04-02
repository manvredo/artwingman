export default function GridOverlay({ gridMode, squareGridSize, showDiagonals }) {
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
    preserveAspectRatio = 'xMinYMin meet'
    viewBox = `0 0 ${squareGridSize} ${squareGridSize}`
  }

  const lines = []
  for (let x = 1; x < cols; x++) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={rows} stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />)
  }
  for (let y = 1; y < rows; y++) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={cols} y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />)
  }

  const diagonals = []
  if (showDiagonals) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        diagonals.push(
          <line key={`d1-${row}-${col}`} x1={col} y1={row} x2={col + 1} y2={row + 1} stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" />,
          <line key={`d2-${row}-${col}`} x1={col + 1} y1={row} x2={col} y2={row + 1} stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" />
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
