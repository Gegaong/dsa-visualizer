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
        {text.split('\n').map((line, i) => (
          <span
            key={i}
            className={`pseudocode-line${highlighted.has(i) ? ' pseudocode-line--active' : ''}`}
          >
            {line}
          </span>
        ))}
      </pre>
    </div>
  )
}
