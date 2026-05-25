import { useState } from 'react'

import { ALGORITHM_INFO, type AlgorithmInfoKey } from '../../algorithms/algorithmInfo'

type AlgorithmInfoCardProps = {
  infoKey: AlgorithmInfoKey
}

export const AlgorithmInfoCard = ({ infoKey }: AlgorithmInfoCardProps) => {
  const [expanded, setExpanded] = useState(false)
  const info = ALGORITHM_INFO[infoKey]

  return (
    <div className={`algorithm-info-card ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="algorithm-info-card-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="algorithm-info-card-title-row">
          <span className="algorithm-info-card-name">{info.name}</span>
          <svg
            className="algorithm-info-card-caret"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <p className="algorithm-info-card-summary">{info.summary}</p>
        <div className="algorithm-info-card-complexity">
          <div className="algorithm-info-card-complexity-item">
            <span className="algorithm-info-card-complexity-label">Time</span>
            <span className="algorithm-info-card-complexity-value">{info.time}</span>
          </div>
          <div className="algorithm-info-card-complexity-item">
            <span className="algorithm-info-card-complexity-label">Space</span>
            <span className="algorithm-info-card-complexity-value">{info.space}</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="algorithm-info-card-details">
          <ul className="algorithm-info-card-list algorithm-info-card-list--pros">
            {info.pros.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <ul className="algorithm-info-card-list algorithm-info-card-list--cons">
            {info.cons.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
