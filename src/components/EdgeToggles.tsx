import type { GraphNode, GraphEdge } from '../types'

import { MIN_TOGGLE_EDGE_LENGTH } from '../utils/constants'

import { getEdgeGeometry, toDegrees } from '../utils/geometry'

import { DirectionIcon } from './DirectionIcon'

type EdgeTogglesProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isDeleteEdgeMode: boolean
  selectedEdgeIds: string[]
  isUndirectedMode: boolean
  onToggleEdgeDirection: (edgeId: string) => void
  onToggleEdgeSelection: (edgeId: string) => void
  onEdgeRightClick: (edgeId: string, x: number, y: number) => void
}

// Midpoint pill rendered on top of each edge.
// Outside delete-edge mode: clicking cycles the edge's direction.
// In delete-edge mode: it becomes an × badge that toggles deletion-selection,
// and we render it even on very short edges (where it would otherwise be hidden)
// so the user always has a clickable target for selection.
// In undirected mode the direction pill is hidden; the × badge still shows for deletion.
export const EdgeToggles = ({
  nodes,
  edges,
  isDeleteEdgeMode,
  selectedEdgeIds,
  isUndirectedMode,
  onToggleEdgeDirection,
  onToggleEdgeSelection,
  onEdgeRightClick,
}: EdgeTogglesProps) => (
  <>
    {edges.map((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
      const toNode = nodes.find((n) => n.id === edge.toNodeId)

      if (!fromNode || !toNode) return null

      const geometry = getEdgeGeometry(fromNode, toNode)
      const isSelected = selectedEdgeIds.includes(edge.id)

      // Hide the pill on tiny edges in normal mode, but always show in delete mode.
      // In undirected mode also hide the pill unless in delete-edge mode.
      if (!geometry || (!isDeleteEdgeMode && geometry.edgeLength < MIN_TOGGLE_EDGE_LENGTH)) {
        return null
      }
      if (isUndirectedMode && !isDeleteEdgeMode) return null

      const { x1, y1, x2, y2 } = geometry
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2

      const baseAngle = toDegrees(Math.atan2(y2 - y1, x2 - x1))
      const angle =
        edge.direction === 'backward'
          ? baseAngle + 180
          : baseAngle

      return (
        <button
          key={`toggle-${edge.id}`}
          className={`edge-toggle ${isSelected ? 'is-selected' : ''} ${isDeleteEdgeMode ? 'is-delete-edge-mode' : ''}`}
          onClick={(e) => {
            e.stopPropagation()

            if (isDeleteEdgeMode) {
              onToggleEdgeSelection(edge.id)
              return
            }

            onToggleEdgeDirection(edge.id)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdgeRightClick(edge.id, e.clientX, e.clientY)
          }}
          type="button"
          title={
            isDeleteEdgeMode
              ? isSelected
                ? 'Remove edge from delete selection'
                : 'Select edge for deletion'
              : 'Toggle edge direction'
          }
          aria-label={
            isDeleteEdgeMode
              ? isSelected
                ? 'Remove edge from delete selection'
                : 'Select edge for deletion'
              : 'Toggle edge direction'
          }
          style={{
            left: midX,
            top: midY,
            ['--edge-angle' as never]: `${angle}deg`,
          }}
        >
          <span className="edge-toggle-icon">
            {isDeleteEdgeMode ? <span className="edge-delete-badge">×</span> : <DirectionIcon direction={edge.direction === 'both' ? 'both' : 'forward'} />}
          </span>
        </button>
      )
    })}
  </>
)
