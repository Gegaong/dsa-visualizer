import { useState } from 'react'

type PseudocodePanelProps = {
  codeText: string
  logicText: string
  codeHighlighted: Set<number>
  logicHighlighted: Set<number>
  varsRows?: string[][] | null
  showLogic: boolean
  onFlip: () => void
}

// Flash-card style pseudocode panel. Click anywhere on the card to flip between Code and Logic.
// varsRows is only shown in Code mode; each inner array is one row of space-separated spans.
export const PseudocodePanel = ({
  codeText,
  logicText,
  codeHighlighted,
  logicHighlighted,
  varsRows,
  showLogic,
  onFlip,
}: PseudocodePanelProps) => {
  const [isFlipping, setIsFlipping] = useState(false)

  const text = showLogic ? logicText : codeText
  const highlighted = showLogic ? logicHighlighted : codeHighlighted

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setTimeout(() => onFlip(), 90)
    setTimeout(() => setIsFlipping(false), 180)
  }

  return (
    <div
      className={`step-explanation step-explanation--pseudocode${isFlipping ? ' pseudocode-card--flipping' : ''}`}
      onClick={handleFlip}
    >
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
    </div>
  )
}
