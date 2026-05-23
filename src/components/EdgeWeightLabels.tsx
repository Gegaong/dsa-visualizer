import type { GraphNode, GraphEdge } from '../types'

import { getEdgeGeometry } from '../utils/geometry'

// Badge base dimensions (full-size).
const BADGE_W = 38
const BADGE_H = 22
const BADGE_FONT = 11
const INPUT_W = 50
// Minimum gap (px) between badge edge and arrowhead before scaling kicks in.
const ARROW_GAP = 8
const MIN_BADGE_SCALE = 0.25

type EdgeWeightLabelsProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  editingEdgeId: string | null
  draftWeight: string
  onWeightClick: (edgeId: string) => void
  onWeightChange: (value: string) => void
  onWeightKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, edgeId: string) => void
  onCommitWeight: (edgeId: string, rawValue: string) => void
  onEdgeRightClick: (edgeId: string, x: number, y: number) => void
  distanceMode?: boolean
}

// Absolutely-positioned weight badges rendered over each edge in weighted graph mode.
// Clicking a badge opens an inline input; right-clicking opens the edge context menu.
export const EdgeWeightLabels = ({
  nodes,
  edges,
  editingEdgeId,
  draftWeight,
  onWeightClick,
  onWeightChange,
  onWeightKeyDown,
  onCommitWeight,
  onEdgeRightClick,
  distanceMode = false,
}: EdgeWeightLabelsProps) => (
  <>
    {edges.map((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
      const toNode = nodes.find((n) => n.id === edge.toNodeId)

      if (!fromNode || !toNode) return null

      const geometry = getEdgeGeometry(fromNode, toNode)

      if (!geometry) return null

      const { x1, y1, x2, y2, edgeLength } = geometry
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2

      // Scale down only once the badge would otherwise reach within ARROW_GAP of the arrows.
      // Formula: badge_half_width + ARROW_GAP ≤ edgeLength / 2  →  scale = (edgeLength - 2*ARROW_GAP) / BADGE_W
      const scale = Math.min(1, Math.max(MIN_BADGE_SCALE, (edgeLength - ARROW_GAP * 2) / BADGE_W))

      const badgeH = Math.round(BADGE_H * scale)
      const badgeStyle = {
        left: midX,
        top: midY,
        width: `${Math.round(BADGE_W * scale)}px`,
        height: `${badgeH}px`,
        lineHeight: `${badgeH}px`,
        fontSize: `${Math.round(BADGE_FONT * scale)}px`,
      }
      const inputStyle = {
        left: midX,
        top: midY,
        width: `${INPUT_W}px`,
        height: `${BADGE_H}px`,
        fontSize: `${BADGE_FONT}px`,
      }

      const weightStr = edge.weight !== undefined ? String(edge.weight) : '1'
      const dotIdx = weightStr.indexOf('.')
      let displayWeight: string
      if (dotIdx === -1) {
        displayWeight = weightStr.length > 5 ? '...' : weightStr
      } else {
        displayWeight = dotIdx > 3 ? '...' : weightStr.slice(0, 5)
      }

      const isEditing = editingEdgeId === edge.id

      if (isEditing) {
        return (
          <input
            key={`weight-input-${edge.id}`}
            className="edge-weight-input"
            style={inputStyle}
            value={draftWeight}
            autoFocus
            inputMode="decimal"
            onChange={(e) => onWeightChange(e.target.value)}
            onKeyDown={(e) => onWeightKeyDown(e, edge.id)}
            onBlur={() => onCommitWeight(edge.id, draftWeight)}
            onClick={(e) => e.stopPropagation()}
          />
        )
      }

      return (
        <button
          key={`weight-badge-${edge.id}`}
          className={`edge-weight-badge${distanceMode ? ' is-distance-mode' : ''}`}
          style={badgeStyle}
          type="button"
          disabled={distanceMode}
          onClick={(e) => {
            e.stopPropagation()
            onWeightClick(edge.id)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdgeRightClick(edge.id, e.clientX, e.clientY)
          }}
        >
          {displayWeight}
          <span className="edge-weight-tooltip">{weightStr}</span>
        </button>
      )
    })}
  </>
)
