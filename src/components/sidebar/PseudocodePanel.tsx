import { useState } from 'react'

type PseudocodePanelProps = {
  codeText: string
  logicText: string
  codeHighlighted: Set<number>
  logicHighlighted: Set<number>
  varsRows?: string[][] | null
}

// Renders a pseudocode block with a Code/Logic toggle and an optional live variable state panel.
// varsRows is only shown in Code mode; each inner array is one row of space-separated spans.
export const PseudocodePanel = ({
  codeText,
  logicText,
  codeHighlighted,
  logicHighlighted,
  varsRows,
}: PseudocodePanelProps) => {
  const [showLogic, setShowLogic] = useState(false)

  const text = showLogic ? logicText : codeText
  const highlighted = showLogic ? logicHighlighted : codeHighlighted

  return (
    <div className="step-explanation step-explanation--pseudocode">
      <button
        className="pseudocode-toggle-btn"
        type="button"
        onClick={() => setShowLogic(v => !v)}
      >
        {showLogic ? 'Logic' : 'Code'}
      </button>
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
