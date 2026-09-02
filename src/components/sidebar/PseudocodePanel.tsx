import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

type PseudocodePanelProps = {
  codeText: string
  logicText: string
  codeHighlighted: Set<number>
  logicHighlighted: Set<number>
  varsRows?: string[][] | null
  showLogic: boolean
  onFlip: () => void
  // Controls the pop-out icon. The detached window keeps live-updating regardless; only the
  // icon that opens it is hidden (callers pass false while the algorithm is actively playing).
  canDetach?: boolean
}

type PseudocodeBodyProps = {
  text: string
  highlighted: Set<number>
  varsRows?: string[][] | null
  showLogic: boolean
}

// Renders the variable rows + highlighted pseudocode lines. Shared by the inline card and the
// detached floating window so the two stay a pixel-identical copy of each other.
// Code view shows 1-based line numbers in a gutter; logic view stays unnumbered prose.
function PseudocodeBody({ text, highlighted, varsRows, showLogic }: PseudocodeBodyProps) {
  const lines = text.split('\n')
  const gutterDigits = Math.max(2, String(lines.length).length)

  return (
    <>
      {!showLogic && varsRows && (
        <div className="pseudocode-vars">
          {varsRows.map((row, i) => (
            <div key={i} className="pseudocode-vars-row">
              {row.map((cell, j) => (
                <span key={j}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      )}
      <pre className="pseudocode-pre">
        {lines.map((line, i) => {
          const isActive = highlighted.has(i)
          const content = line.length === 0 ? '\u00A0' : line

          if (showLogic) {
            return (
              <span
                key={i}
                className={`pseudocode-line${isActive ? ' pseudocode-line--active' : ''}`}
              >
                {content}
              </span>
            )
          }

          return (
            <span
              key={i}
              className={`pseudocode-line-row${isActive ? ' pseudocode-line-row--active' : ''}`}
            >
              <span
                className="pseudocode-line-gutter"
                style={{ minWidth: `${gutterDigits + 1}ch` }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="pseudocode-line pseudocode-line--code">
                {content}
              </span>
            </span>
          )
        })}
      </pre>
    </>
  )
}

const POP_OUT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
)

const FLIP_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h13l-4-4" />
    <path d="M21 16H8l4 4" />
  </svg>
)

const ZOOM_OUT_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)

const ZOOM_IN_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)

const MIN_SCALE = 0.8
const MAX_SCALE = 2.2
const SCALE_STEP = 0.15

// Pseudocode panel. The flip button toggles between Code and Logic; varsRows is only shown in
// Code mode (each inner array is one row of space-separated spans). The pop-out button detaches a
// draggable, always-on-top copy that live-mirrors the same content + highlighting.
export const PseudocodePanel = ({
  codeText,
  logicText,
  codeHighlighted,
  logicHighlighted,
  varsRows,
  showLogic,
  onFlip,
  canDetach = true,
}: PseudocodePanelProps) => {
  const [isFlipping, setIsFlipping] = useState(false)
  const [isDetached, setIsDetached] = useState(false)
  const [fontScale, setFontScale] = useState(1)
  const [pos, setPos] = useState({ x: 96, y: 96 })
  const [size, setSize] = useState<{ width: number; height?: number }>({ width: 400 })
  const [isResizing, setIsResizing] = useState(false)

  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const resizeRef = useRef<{
    direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
    startX: number
    startY: number
    startPosX: number
    startPosY: number
    startWidth: number
    startHeight: number
  } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const detachedRef = useRef<HTMLDivElement>(null)

  const text = showLogic ? logicText : codeText
  const highlighted = showLogic ? logicHighlighted : codeHighlighted

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setTimeout(() => onFlip(), 90)
    setTimeout(() => setIsFlipping(false), 180)
  }

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFontScale((prev) => Math.min(MAX_SCALE, Math.round((prev + SCALE_STEP) * 100) / 100))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFontScale((prev) => Math.max(MIN_SCALE, Math.round((prev - SCALE_STEP) * 100) / 100))
  }

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFontScale(1)
  }

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        setFontScale((prev) => Math.min(MAX_SCALE, Math.round((prev + 0.1) * 100) / 100))
      } else if (e.deltaY > 0) {
        setFontScale((prev) => Math.max(MIN_SCALE, Math.round((prev - 0.1) * 100) / 100))
      }
    }
  }

  // Open the floating copy directly on top of the inline card; toggle it shut if already open.
  const toggleDetached = () => {
    if (!isDetached && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const initialWidth = Math.max(380, Math.min(rect.width + 40, window.innerWidth - 32))
      const initialX = Math.max(16, Math.min(rect.left - 20, window.innerWidth - initialWidth - 24))
      const initialY = Math.max(16, Math.min(rect.top, window.innerHeight - 280))
      setPos({ x: initialX, y: initialY })
      setSize((prev) => ({
        width: Math.max(prev.width || 380, initialWidth),
        height: prev.height,
      }))
    }
    setIsDetached((v) => !v)
  }

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return
    const currentWidth = size.width || 380
    const rawX = e.clientX - dragOffset.current.x
    const rawY = e.clientY - dragOffset.current.y
    const clampedX = Math.max(8, Math.min(window.innerWidth - currentWidth - 8, rawX))
    const clampedY = Math.max(8, Math.min(window.innerHeight - 60, rawY))
    setPos({ x: clampedX, y: clampedY })
  }
  const onHeaderPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragOffset.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const MIN_WIDTH = 260
  const MIN_HEIGHT = 140

  const onResizePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!detachedRef.current) return

    const rect = detachedRef.current.getBoundingClientRect()
    resizeRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      startWidth: rect.width,
      startHeight: rect.height,
    }
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return
    const { direction, startX, startY, startPosX, startPosY, startWidth, startHeight } = resizeRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startPosX
    let newY = startPosY

    // Horizontal resizing (sides)
    if (direction.includes('e')) {
      const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - startPosX - 12)
      newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + dx))
    } else if (direction.includes('w')) {
      const maxExpansion = startPosX - 12
      const maxAllowedWidth = startWidth + maxExpansion
      const targetWidth = startWidth - dx
      newWidth = Math.min(maxAllowedWidth, Math.max(MIN_WIDTH, targetWidth))
      const deltaW = newWidth - startWidth
      newX = startPosX - deltaW
    }

    // Vertical resizing
    if (direction.includes('s')) {
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - startPosY - 12)
      newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + dy))
    } else if (direction.includes('n')) {
      const maxExpansion = startPosY - 12
      const maxAllowedHeight = startHeight + maxExpansion
      const targetHeight = startHeight - dy
      newHeight = Math.min(maxAllowedHeight, Math.max(MIN_HEIGHT, targetHeight))
      const deltaH = newHeight - startHeight
      newY = startPosY - deltaH
    }

    setPos({ x: Math.max(8, newX), y: Math.max(8, newY) })
    setSize({ width: Math.round(newWidth), height: Math.round(newHeight) })
  }

  const onResizePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeRef.current = null
    setIsResizing(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      ref={cardRef}
      className={`step-explanation step-explanation--pseudocode${isFlipping ? ' pseudocode-card--flipping' : ''}`}
    >
      <div className="pseudocode-card-actions">
        <button
          type="button"
          className="pseudocode-card-btn"
          title="Flip code / logic"
          aria-label="Flip code / logic"
          onClick={handleFlip}
        >
          {FLIP_ICON}
        </button>
        {canDetach && (
          <button
            type="button"
            className="pseudocode-card-btn"
            title="Expand / pop out pseudocode"
            aria-label="Expand / pop out pseudocode"
            onClick={toggleDetached}
          >
            {POP_OUT_ICON}
          </button>
        )}
      </div>

      <PseudocodeBody text={text} highlighted={highlighted} varsRows={varsRows} showLogic={showLogic} />

      {isDetached && createPortal(
        <div
          ref={detachedRef}
          className={`pseudocode-detached${isResizing ? ' pseudocode-detached--resizing' : ''}`}
          style={{
            left: pos.x,
            top: pos.y,
            width: size.width,
            height: size.height ? `${size.height}px` : undefined,
            '--pseudo-font-scale': fontScale,
          } as React.CSSProperties}
          onWheel={handleWheelZoom}
        >
          {/* Side & corner resize handles */}
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--w"
            title="Drag side to resize width"
            onPointerDown={(e) => onResizePointerDown(e, 'w')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--e"
            title="Drag side to resize width"
            onPointerDown={(e) => onResizePointerDown(e, 'e')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--n"
            title="Drag top to resize height"
            onPointerDown={(e) => onResizePointerDown(e, 'n')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--s"
            title="Drag bottom to resize height"
            onPointerDown={(e) => onResizePointerDown(e, 's')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--nw"
            onPointerDown={(e) => onResizePointerDown(e, 'nw')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--ne"
            onPointerDown={(e) => onResizePointerDown(e, 'ne')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--sw"
            onPointerDown={(e) => onResizePointerDown(e, 'sw')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
          <div
            className="pseudocode-resize-handle pseudocode-resize-handle--se"
            title="Drag corner to resize"
            onPointerDown={(e) => onResizePointerDown(e, 'se')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          >
            <svg className="pseudocode-resize-grip-icon" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M8 2L2 8M8 5L5 8M8 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div
            className="pseudocode-detached-header"
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
          >
            <span className="pseudocode-detached-title">
              {POP_OUT_ICON}
              Pseudocode
            </span>
            <div className="pseudocode-detached-actions">
              <div className="pseudocode-zoom-group">
                <button
                  type="button"
                  className="pseudocode-zoom-btn"
                  title="Decrease font size (Ctrl + Scroll Down)"
                  aria-label="Decrease font size"
                  disabled={fontScale <= MIN_SCALE}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleZoomOut}
                >
                  {ZOOM_OUT_ICON}
                </button>
                <button
                  type="button"
                  className={`pseudocode-zoom-badge${fontScale !== 1 ? ' pseudocode-zoom-badge--custom' : ''}`}
                  title="Reset font size to 100%"
                  aria-label="Reset font size to 100%"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleResetZoom}
                >
                  {Math.round(fontScale * 100)}%
                </button>
                <button
                  type="button"
                  className="pseudocode-zoom-btn"
                  title="Increase font size (Ctrl + Scroll Up)"
                  aria-label="Increase font size"
                  disabled={fontScale >= MAX_SCALE}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleZoomIn}
                >
                  {ZOOM_IN_ICON}
                </button>
              </div>
              <button
                type="button"
                title="Flip code / logic"
                aria-label="Flip code / logic"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleFlip}
              >
                {FLIP_ICON}
              </button>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setIsDetached(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className={`pseudocode-detached-body${isFlipping ? ' pseudocode-card--flipping' : ''}`}
          >
            <PseudocodeBody text={text} highlighted={highlighted} varsRows={varsRows} showLogic={showLogic} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
