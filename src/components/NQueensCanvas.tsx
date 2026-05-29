import { useLayoutEffect, useRef, useState } from 'react'
import type { NQueensStep } from '../algorithms/nqueens'

const N_MIN = 4
const N_MAX = 10

const SOLUTION_COUNTS: Record<number, number> = {
  4: 2, 5: 10, 6: 4, 7: 40, 8: 92,
  9: 352, 10: 724,
}

type NQueensCanvasProps = {
  n: number
  onNChange: (n: number) => void
  isRunning: boolean
  currentStep: NQueensStep | null
}

// Exact canonical cburnett Staunton queen (same silhouette as chess.com Neo): paths fetched
// verbatim from https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg
const QueenPiece = ({ size, opacity = 1, highlight = false }: { size: number; opacity?: number; highlight?: boolean }) => (
  <svg
    viewBox="0 0 45 45"
    width={size * 0.8}
    height={size * 0.8}
    style={{ opacity, display: 'block' }}
    aria-hidden="true"
  >
    <g fill={highlight ? '#5cb85c' : '#fff'} stroke="#000" strokeWidth={1.5} strokeLinejoin="round">
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
      <path d="M 11.5,30 C 15,29 30,29 33.5,30" fill="none" />
      <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" fill="none" />
      <circle cx="6"    cy="12" r="2" />
      <circle cx="14"   cy="9"  r="2" />
      <circle cx="22.5" cy="8"  r="2" />
      <circle cx="31"   cy="9"  r="2" />
      <circle cx="39"   cy="12" r="2" />
    </g>
  </svg>
)

export const NQueensCanvas = ({ n, onNChange, isRunning, currentStep }: NQueensCanvasProps) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(0)

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      setBoardSize(entries[0].contentRect.height)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cellSize = boardSize > 0 ? boardSize / n : 0
  const solutionCount = SOLUTION_COUNTS[n]

  const lockedQueens = currentStep?.lockedQueens ?? []
  const tryingQueen  = currentStep?.tryingQueen  ?? null
  const isSolution   = currentStep?.phase === 'solution'

  const lockedQueenKeys = new Set(lockedQueens.map(q => `${q.row},${q.col}`))
  const tryingKey       = tryingQueen ? `${tryingQueen.row},${tryingQueen.col}` : null

  return (
    <section className="canvas-panel canvas-panel--nqueens">
      <div className="nqueens-body" ref={bodyRef}>
        <div className="nqueens-left">
          <div className="nqueens-title">
            <h2>N-Queens</h2>
            <p>Place N queens on an N×N board so no two queens attack each other.</p>
          </div>
          <div className="nqueens-info-card">
            <span className="nqueens-info-title">How it works</span>
            <p className="nqueens-info-text">
              Two queens attack each other if they share the same row, column, or diagonal.
              The goal is to place exactly N queens so none of them threatens another.
              For an 8×8 board there are 92 distinct solutions — the solver finds them
              one by one using backtracking, placing queens column by column and undoing
              a placement the moment a conflict is detected.
            </p>
          </div>

          <div className="nqueens-stats">
            <div className="nqueens-stat-col">
              <span className="nqueens-n-label">Board size</span>
              <div className="nqueens-n-row">
                <button
                  className="nqueens-n-btn"
                  type="button"
                  disabled={n <= N_MIN || isRunning}
                  onClick={() => onNChange(n - 1)}
                  aria-label="Decrease N"
                >
                  −
                </button>
                <span className="nqueens-n-value">{n}</span>
                <button
                  className="nqueens-n-btn"
                  type="button"
                  disabled={n >= N_MAX || isRunning}
                  onClick={() => onNChange(n + 1)}
                  aria-label="Increase N"
                >
                  +
                </button>
              </div>
              <span className="nqueens-n-sub">{n} × {n} board</span>
            </div>

            <div className="nqueens-stat-divider" />

            <div className="nqueens-stat-col">
              <span className="nqueens-n-label">Solutions</span>
              <span className="nqueens-solutions-count">{solutionCount.toLocaleString()}</span>
              <span className="nqueens-solutions-label">for N = {n}</span>
            </div>
          </div>
        </div>

        <div
          className="nqueens-board"
          style={{ width: boardSize, height: boardSize }}
        >
          {boardSize > 0 && Array.from({ length: n * n }, (_, i) => {
            const r = Math.floor(i / n)
            const c = i % n
            const key = `${r},${c}`
            const isLight       = (r + c) % 2 === 0
            const isLockedQueen = lockedQueenKeys.has(key)
            const isTryingQueen = key === tryingKey

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: isLight ? '#EEEED2' : '#769656',
                }}
              >
                {(isLockedQueen || isTryingQueen) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QueenPiece
                      size={cellSize}
                      opacity={isTryingQueen ? 0.42 : 1}
                      highlight={isSolution && isLockedQueen}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
