import { useState } from 'react'

import { ALGORITHM_INFO, type AlgorithmInfoKey } from '../../algorithms/algorithmInfo'

type AlgorithmInfoCardProps = {
  infoKey: AlgorithmInfoKey
}

export const AlgorithmInfoCard = ({ infoKey }: AlgorithmInfoCardProps) => {
  const [expanded, setExpanded] = useState(false)
  const info = ALGORITHM_INFO[infoKey]
  const hasDetails = (info.pros?.length ?? 0) > 0 || (info.cons?.length ?? 0) > 0

  const header = (
    <>
      <div className="algorithm-info-card-title-row">
        <span className="algorithm-info-card-name">{info.name}</span>
        {hasDetails && (
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
        )}
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
    </>
  )

  return (
    <div className={`algorithm-info-card ${expanded ? 'is-expanded' : ''}`}>
      {hasDetails ? (
        <button
          type="button"
          className="algorithm-info-card-header"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {header}
        </button>
      ) : (
        <div className="algorithm-info-card-header">{header}</div>
      )}
      {expanded && hasDetails && (
        <div className="algorithm-info-card-details">
          {info.pros && (
            <ul className="algorithm-info-card-list algorithm-info-card-list--pros">
              {info.pros.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          {info.cons && (
            <ul className="algorithm-info-card-list algorithm-info-card-list--cons">
              {info.cons.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
