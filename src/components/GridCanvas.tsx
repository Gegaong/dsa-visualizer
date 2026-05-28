import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ConfirmModal } from './Modals'
import type { IslandHSL } from '../utils/gridIslandColors'

type GridCanvasProps = {
  rows: number
  islands: Set<string>
  onIslandsChange: (s: Set<string>) => void
  connectivity: 4 | 8
  onConnectivityChange: (c: 4 | 8) => void
  onColsChange: (cols: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  canZoomIn: boolean
  canZoomOut: boolean
  isBlocked: boolean
  visitedCells: string[]
  frontierCells: string[]
  currentCell: string | null
  currentPhase: 'inner' | 'outer' | null
  islandColorByCellKey: Map<string, IslandHSL> | null
  startMarkers: string[]
  isPickingStart: boolean
  onCellPick: (key: string) => void
  onRemoveStartMarker: (key: string) => void
  onClearStartMarkers: () => void
}

export const GridCanvas = ({
  rows,
  islands,
  onIslandsChange,
  connectivity,
  onConnectivityChange,
  onColsChange,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  isBlocked,
  visitedCells,
  frontierCells,
  currentCell,
  currentPhase,
  islandColorByCellKey,
  startMarkers,
  isPickingStart,
  onCellPick,
  onRemoveStartMarker,
  onClearStartMarkers,
}: GridCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [removeMode, setRemoveMode] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearStartConfirmOpen, setClearStartConfirmOpen] = useState(false)
  const isPainting = useRef(false)
  const paintMode = useRef<'add' | 'remove'>('add')

  const onColsChangeRef = useRef(onColsChange)
  useLayoutEffect(() => { onColsChangeRef.current = onColsChange })

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

  useEffect(() => {
    if (cols > 0) onColsChangeRef.current(cols)
  }, [cols])

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
    onIslandsChange((() => {
      if (mode === 'add' && islands.has(key)) return islands
      if (mode === 'remove' && !islands.has(key)) return islands
      const next = new Set(islands)
      if (mode === 'add') next.add(key)
      else next.delete(key)
      return next
    })())
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const key = getCellKey(e)
    if (!key) return

    if (isPickingStart) {
      onCellPick(key)
      return
    }

    if (isBlocked) return

    // Remove mode on start markers: clicking a marker removes it instead of painting
    if (removeMode && startMarkersSet.has(key)) {
      onRemoveStartMarker(key)
      return
    }

    isPainting.current = true
    paintMode.current = removeMode ? 'remove' : 'add'
    applyPaint(key)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPainting.current) return
    const key = getCellKey(e)
    if (key) applyPaint(key)
  }

  const handleClearClick = () => {
    if (islands.size === 0) return
    setClearConfirmOpen(true)
  }

  const handleClearConfirm = () => {
    onIslandsChange(new Set())
    setClearConfirmOpen(false)
  }

  const { visitedWater, visitedIsland } = useMemo(() => {
    const visitedWater: string[] = []
    const visitedIsland: string[] = []
    for (const k of visitedCells) {
      if (islands.has(k)) visitedIsland.push(k)
      else visitedWater.push(k)
    }
    return { visitedWater, visitedIsland }
  }, [visitedCells, islands])

  const startMarkersSet = useMemo(() => new Set(startMarkers), [startMarkers])

  const cellStyle = (r: number, c: number, bg: string) => ({
    position: 'absolute' as const,
    left: c * cellW,
    top: r * cellH,
    width: cellW,
    height: cellH,
    background: bg,
    pointerEvents: 'none' as const,
  })

  const parseKey = (key: string) => {
    const [r, c] = key.split(',').map(Number)
    return { r, c, valid: r < rows && c < cols }
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
      <ConfirmModal
        open={clearStartConfirmOpen}
        title="Clear start points"
        body="All selected start points will be removed. This can't be undone."
        confirmLabel="Clear"
        onConfirm={() => { onClearStartMarkers(); setClearStartConfirmOpen(false) }}
        onCancel={() => setClearStartConfirmOpen(false)}
      />
      <section className="canvas-panel">
        <div className="canvas-header">
          <div className="canvas-copy">
            <h2>Grid Canvas</h2>
            <p>Draw islands, then pick a search strategy to locate them.</p>
          </div>
          <div className="canvas-actions">
            <div className="grid-connectivity-toggle">
              <button
                className={connectivity === 4 ? 'active' : ''}
                type="button"
                disabled={isBlocked || isPickingStart}
                onClick={() => onConnectivityChange(4)}
                title="4-directional (up, down, left, right)"
              >
                4-dir
              </button>
              <button
                className={connectivity === 8 ? 'active' : ''}
                type="button"
                disabled={isBlocked || isPickingStart}
                onClick={() => onConnectivityChange(8)}
                title="8-directional (includes diagonals)"
              >
                8-dir
              </button>
            </div>
            <div className={`grid-zoom-inline${isBlocked || isPickingStart ? ' is-dim' : ''}`}>
              <button className="canvas-zoom-btn" type="button" onClick={onZoomOut} disabled={isBlocked || isPickingStart || !canZoomOut} aria-label="Zoom out">−</button>
              <span className="canvas-zoom-value">{cols}×{rows}</span>
              <button className="canvas-zoom-btn" type="button" onClick={onZoomIn} disabled={isBlocked || isPickingStart || !canZoomIn} aria-label="Zoom in">+</button>
            </div>
            <button
              className={`btn btn-pill connect-toggle-btn ${removeMode ? 'btn-active' : ''}`}
              type="button"
              disabled={isBlocked || isPickingStart}
              onClick={() => setRemoveMode(r => !r)}
            >
              {removeMode ? 'Cancel remove' : 'Remove'}
            </button>
            <div className="delete-stack" role="group" aria-label="Clear controls">
              <button
                className="btn delete-stack-btn"
                type="button"
                disabled={isBlocked || isPickingStart}
                onClick={handleClearClick}
              >
                Clear islands
              </button>
              <button
                className="btn delete-stack-btn"
                type="button"
                disabled={isBlocked || isPickingStart}
                onClick={() => { if (startMarkers.length > 0) setClearStartConfirmOpen(true) }}
              >
                Clear start points
              </button>
            </div>
          </div>
        </div>
        <div
          ref={containerRef}
          className="grid-canvas-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          {[...islands].map(key => {
            const { r, c, valid } = parseKey(key)
            if (!valid) return null
            return <div key={key} style={cellStyle(r, c, '#4CAF50')} />
          })}

          {visitedWater.map(key => {
            const { r, c, valid } = parseKey(key)
            if (!valid) return null
            return <div key={`vw-${key}`} style={cellStyle(r, c, '#FACC15')} />
          })}

          {visitedIsland.map(key => {
            const { r, c, valid } = parseKey(key)
            if (!valid) return null
            const hsl = islandColorByCellKey?.get(key)
            if (!hsl) return null
            return <div key={`vi-${key}`} style={cellStyle(r, c, `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`)} />
          })}

          {frontierCells.map(key => {
            const { r, c, valid } = parseKey(key)
            if (!valid) return null
            // Island frontier cells: semi-transparent orange so the island color underneath blends through.
            const bg = islands.has(key) ? 'rgba(251,146,60,0.58)' : '#FB923C'
            return <div key={`f-${key}`} style={cellStyle(r, c, bg)} />
          })}

          {currentCell && (currentPhase === 'inner' || !islands.has(currentCell)) && (() => {
            const { r, c, valid } = parseKey(currentCell)
            if (!valid) return null
            return <div style={cellStyle(r, c, '#1e40af')} />
          })()}

          {startMarkers.map(key => {
            const { r, c, valid } = parseKey(key)
            if (!valid) return null
            const dotSize = Math.min(cellW, cellH) * 0.42
            return (
              <div
                key={`sm-${key}`}
                style={{
                  position: 'absolute',
                  left: c * cellW + (cellW - dotSize) / 2,
                  top: r * cellH + (cellH - dotSize) / 2,
                  width: dotSize,
                  height: dotSize,
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
