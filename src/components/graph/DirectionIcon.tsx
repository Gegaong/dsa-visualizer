import type { GraphEdge } from '../../types'

// Visual cue for an edge's direction:
// - forward: dot then arrow away (outbound)
// - backward: arrow toward dot (inbound)
// - both: arrows both ways with the dot in the center (bidirectional)
export const DirectionIcon = ({ direction }: { direction: GraphEdge['direction'] }) => {
  return (
    <svg className="direction-icon" viewBox="0 0 24 24" aria-hidden="true">
      {direction === 'forward' && (
        <>
          <circle cx="7" cy="12" r="2.7" />
          <path
            d="M10 12h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M16 9l3 3-3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {direction === 'backward' && (
        <>
          <path
            d="M14 12H6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 9l-3 3 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="12" r="2.7" />
        </>
      )}
      {direction === 'both' && (
        <>
          <path
            d="M6 12h12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 9l-3 3 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 9l3 3-3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.9" />
        </>
      )}
    </svg>
  )
}
