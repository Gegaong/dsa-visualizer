import { useLayoutEffect, useRef, useState } from 'react'

const N_MIN = 4
const N_MAX = 10

const SOLUTION_COUNTS: Record<number, number> = {
  4: 2, 5: 10, 6: 4, 7: 40, 8: 92,
  9: 352, 10: 724,
}

type NQueensCanvasProps = {
  n: number
  onNChange: (n: number) => void
}

export const NQueensCanvas = ({ n, onNChange }: NQueensCanvasProps) => {
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
              one by one using backtracking, placing queens row by row and undoing
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
                  disabled={n <= N_MIN}
                  onClick={() => onNChange(n - 1)}
                  aria-label="Decrease N"
                >
                  −
                </button>
                <span className="nqueens-n-value">{n}</span>
                <button
                  className="nqueens-n-btn"
                  type="button"
                  disabled={n >= N_MAX}
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
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: (r + c) % 2 === 0 ? '#EEEED2' : '#769656',
                }}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
