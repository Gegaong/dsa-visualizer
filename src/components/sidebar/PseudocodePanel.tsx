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
function PseudocodeBody({ text, highlighted, varsRows, showLogic }: PseudocodeBodyProps) {
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
        {text.split('\n').map((line, i) => {
          const indent = line.match(/^ */)?.[0].length ?? 0
          const isActive = highlighted.has(i)
          const style = indent > 0
            ? {
                paddingLeft: isActive ? `calc(12px + ${indent}ch)` : `${indent}ch`,
                textIndent: `-${indent}ch`,
              }
            : undefined
          return (
            <span
              key={i}
              className={`pseudocode-line${isActive ? ' pseudocode-line--active' : ''}`}
              style={style}
            >
              {line}
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
  const [pos, setPos] = useState({ x: 96, y: 96 })
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const text = showLogic ? logicText : codeText
  const highlighted = showLogic ? logicHighlighted : codeHighlighted

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setTimeout(() => onFlip(), 90)
    setTimeout(() => setIsFlipping(false), 180)
  }

  // Open the floating copy directly on top of the inline card; toggle it shut if already open.
  const toggleDetached = () => {
    if (!isDetached && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setPos({ x: rect.left, y: rect.top })
    }
    setIsDetached((v) => !v)
  }

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }
  const onHeaderPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragOffset.current = null
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
            title="Pop out pseudocode"
            aria-label="Pop out pseudocode"
            onClick={toggleDetached}
          >
            {POP_OUT_ICON}
          </button>
        )}
      </div>

      <PseudocodeBody text={text} highlighted={highlighted} varsRows={varsRows} showLogic={showLogic} />

      {isDetached && createPortal(
        <div className="pseudocode-detached" style={{ left: pos.x, top: pos.y }}>
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
