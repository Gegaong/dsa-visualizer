import { useLayoutEffect, useRef, useState } from 'react'

type GridCanvasProps = {
  rows: number
  onZoomIn: () => void
  onZoomOut: () => void
  canZoomIn: boolean
  canZoomOut: boolean
}

export const GridCanvas = ({ rows, onZoomIn, onZoomOut, canZoomIn, canZoomOut }: GridCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Derive cols from the container's aspect ratio so cells are visually square.
  // Each axis divides evenly into the container, so the grid fills the area exactly.
  const cols = containerSize.height > 0
    ? Math.max(1, Math.round(containerSize.width / containerSize.height * rows))
    : rows
  const cellW = containerSize.width > 0 ? containerSize.width / cols : 0
  const cellH = containerSize.height > 0 ? containerSize.height / rows : 0

  return (
    <section className="canvas-panel">
      <div className="canvas-header">
        <div className="canvas-copy">
          <h2>Grid Canvas</h2>
          <p>Draw islands, then run BFS or DFS to locate them.</p>
        </div>
        <div className="canvas-actions">
          <div className="grid-zoom-inline">
            <button
              className="canvas-zoom-btn"
              type="button"
              onClick={onZoomOut}
              disabled={!canZoomOut}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="canvas-zoom-value">{cols}×{rows}</span>
            <button
              className="canvas-zoom-btn"
              type="button"
              onClick={onZoomIn}
              disabled={!canZoomIn}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="grid-canvas-area">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: `${cellW}px ${cellH}px`,
          }}
        />
      </div>
    </section>
  )
}
