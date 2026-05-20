import type { EdgeContextMenuState, GraphEdge, GraphNode } from '../types'

import { DirectionIcon } from './DirectionIcon'

type EdgeContextMenuProps = {
  contextMenu: EdgeContextMenuState | null
  edges: GraphEdge[]
  nodes: GraphNode[]
  isUndirectedMode: boolean
  isWeightedMode: boolean
  onClose: () => void
  onEditWeight: (edgeId: string) => void
  onDelete: (edgeId: string) => void
  onChangeDirection: (edgeId: string, direction: GraphEdge['direction']) => void
}

// Right-click context menu for a single edge.
// Header shows the connection (and weight when weighted). Direction picker hidden in
// undirected mode. Edit-weight action only appears in weighted mode; Delete always shows.
export const EdgeContextMenu = ({
  contextMenu,
  edges,
  nodes,
  isUndirectedMode,
  isWeightedMode,
  onClose,
  onEditWeight,
  onDelete,
  onChangeDirection,
}: EdgeContextMenuProps) => {
  if (!contextMenu) return null

  const edge = edges.find((e) => e.id === contextMenu.edgeId) ?? null
  if (!edge) return null

  const fromNode = nodes.find((n) => n.id === edge.fromNodeId) ?? null
  const toNode = nodes.find((n) => n.id === edge.toNodeId) ?? null
  if (!fromNode || !toNode) return null

  let connectionLabel: string
  if (isUndirectedMode || edge.direction === 'both') {
    connectionLabel = `${fromNode.label} — ${toNode.label}`
  } else if (edge.direction === 'forward') {
    connectionLabel = `${fromNode.label} → ${toNode.label}`
  } else {
    connectionLabel = `${toNode.label} → ${fromNode.label}`
  }

  const weightDisplay = edge.weight !== undefined ? edge.weight : 1

  return (
    <div
      className="context-backdrop"
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div
        className="context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="context-header">
          <span className="context-title">{connectionLabel}</span>
          {isWeightedMode && (
            <span className="context-value">w: {weightDisplay}</span>
          )}
        </div>
        {!isUndirectedMode && (
          <div className="context-direction-picker">
            {(['forward', 'both', 'backward'] as GraphEdge['direction'][]).map((dir) => (
              <button
                key={dir}
                className={`btn btn-pill edge-direction-option ${edge.direction === dir ? 'btn-active' : ''}`}
                type="button"
                onClick={() => onChangeDirection(edge.id, dir)}
              >
                <DirectionIcon direction={dir} />
              </button>
            ))}
          </div>
        )}

        {isWeightedMode && (
          <button
            className="context-action"
            type="button"
            onClick={() => onEditWeight(edge.id)}
          >
            Edit weight
          </button>
        )}
        <button
          className="context-action context-action--danger"
          type="button"
          onClick={() => {
            onDelete(edge.id)
            onClose()
          }}
        >
          Delete edge
        </button>
      </div>
    </div>
  )
}
