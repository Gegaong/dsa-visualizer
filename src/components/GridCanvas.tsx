import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ConfirmModal } from './Modals'

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
  const [islands, setIslands] = useState<Set<string>>(new Set())
  const [startCells, setStartCells] = useState<Set<string>>(new Set())
  const [removeMode, setRemoveMode] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const isPainting = useRef(false)
  const paintMode = useRef<'add' | 'remove'>('add')

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

  useEffect(() => {
    const stop = () => { isPainting.current = false }
    document.addEventListener('mouseup', stop)
    return () => document.removeEventListener('mouseup', stop)
  }, [])

  const cols = containerSize.height > 0
    ? Math.max(1, Math.round(containerSize.width / containerSize.height * rows))
    : rows
  const cellW = containerSize.width > 0 ? containerSize.width / cols : 0
  const cellH = containerSize.height > 0 ? containerSize.height / rows : 0

  const getCellKey = (e: React.MouseEvent<HTMLDivElement>): string | null => {
    const el = containerRef.current
    if (!el || cellW === 0 || cellH === 0) return null
    const rect = el.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellW)
    const row = Math.floor((e.clientY - rect.top) / cellH)
    if (col >= 0 && col < cols && row >= 0 && row < rows) return `${row},${col}`
    return null
  }

  const applyPaint = (key: string) => {
    const mode = paintMode.current
    setIslands(prev => {
      if (mode === 'add' && prev.has(key)) return prev
      if (mode === 'remove' && !prev.has(key)) return prev
      const next = new Set(prev)
      if (mode === 'add') next.add(key)
      else next.delete(key)
      return next
    })
    if (mode === 'remove') {
      setStartCells(prev => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const key = getCellKey(e)
    if (!key) return
    isPainting.current = true
    paintMode.current = removeMode ? 'remove' : 'add'
    applyPaint(key)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPainting.current) return
    const key = getCellKey(e)
    if (key) applyPaint(key)
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const key = getCellKey(e)
    if (!key) return
    setStartCells(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleClearClick = () => {
    if (islands.size === 0 && startCells.size === 0) return
    setClearConfirmOpen(true)
  }

  const handleClearConfirm = () => {
    setIslands(new Set())
    setStartCells(new Set())
    setClearConfirmOpen(false)
  }

  return (
    <>
      <ConfirmModal
        open={clearConfirmOpen}
        title="Clear grid"
        body="All painted islands will be removed. This can't be undone."
        confirmLabel="Clear"
        onConfirm={handleClearConfirm}
        onCancel={() => setClearConfirmOpen(false)}
      />
      <section className="canvas-panel">
        <div className="canvas-header">
          <div className="canvas-copy-with-zoom">
            <div className="canvas-copy">
              <h2>Grid Canvas</h2>
              <p>Draw islands, then run BFS or DFS to locate them.</p>
            </div>
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
          <div className="canvas-actions">
            <button
              className={`btn btn-pill connect-toggle-btn ${removeMode ? 'btn-active' : ''}`}
              type="button"
              onClick={() => setRemoveMode(r => !r)}
            >
              {removeMode ? 'Cancel remove' : 'Remove'}
            </button>
            <button
              className="btn btn-clear"
              style={{ marginLeft: '8px' }}
              type="button"
              onClick={handleClearClick}
            >
              Clear grid
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="grid-canvas-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
        >
          {[...islands].map(key => {
            const [r, c] = key.split(',').map(Number)
            if (r >= rows || c >= cols) return null
            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  left: c * cellW,
                  top: r * cellH,
                  width: cellW,
                  height: cellH,
                  background: '#4CAF50',
                  pointerEvents: 'none',
                }}
              />
            )
          })}
          {[...startCells].map(key => {
            const [r, c] = key.split(',').map(Number)
            if (r >= rows || c >= cols) return null
            const size = Math.min(cellW, cellH) * 0.45
            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  left: c * cellW + cellW / 2 - size / 2,
                  top: r * cellH + cellH / 2 - size / 2,
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: '#FACC15',
                  pointerEvents: 'none',
                }}
              />
            )
          })}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, var(--border) 1px, transparent 1px),
                linear-gradient(to bottom, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: `${cellW}px ${cellH}px`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </section>
    </>
  )
}
