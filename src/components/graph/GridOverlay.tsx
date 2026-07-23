// Always cover at least this many pixels so the grid fills any realistic canvas size.
const COVER_W = 2000
const COVER_H = 1400

type GridOverlayProps = {
  cellSize: number
}

export const GridOverlay = ({ cellSize }: GridOverlayProps) => {
  const cols = Math.ceil(COVER_W / cellSize)
  const rows = Math.ceil(COVER_H / cellSize)
  const W = cols * cellSize
  const H = rows * cellSize

  // Only label every N units so labels stay at least ~50px apart.
  const labelEvery = Math.max(1, Math.ceil(50 / cellSize))

  // Pattern id must include cellSize so the browser doesn't reuse a stale cached pattern.
  const patternId = `grid-cell-${cellSize}`

  return (
    <svg className="canvas-grid" width={W} height={H} aria-hidden="true">
      <defs>
        <pattern id={patternId} width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="none"
            stroke="var(--grid-line)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width={W} height={H} fill={`url(#${patternId})`} />
      <line x1={W} y1={0} x2={W} y2={H} stroke="var(--grid-line)" strokeWidth="1" />
      <line x1={0} y1={H} x2={W} y2={H} stroke="var(--grid-line)" strokeWidth="1" />

      {Array.from({ length: Math.floor(cols / labelEvery) + 1 }, (_, i) => {
        const unit = i * labelEvery
        return (
          <text
            key={`x${unit}`}
            x={unit === 0 ? 4 : unit * cellSize}
            y={15}
            className="canvas-grid-label"
            textAnchor={unit === 0 ? 'start' : 'middle'}
          >
            {unit}
          </text>
        )
      })}

      {Array.from({ length: Math.floor(rows / labelEvery) + 1 }, (_, i) => {
        const unit = i * labelEvery
        if (unit === 0) return null
        return (
          <text
            key={`y${unit}`}
            x={8}
            y={unit * cellSize + 5}
            className="canvas-grid-label"
          >
            {unit}
          </text>
        )
      })}
    </svg>
  )
}
