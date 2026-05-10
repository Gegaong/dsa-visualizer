import type { GraphNode } from '../types'

// Pick the right text + size class for a node's value.
// 'empty' renders as a blank circle, null renders as the word "null",
// and numbers shrink (or get truncated to "...") so they fit inside the circle.
const formatNodeValue = (value: number | null | 'empty') => {
  if (value === 'empty') {
    return { text: '', sizeClass: '' }
  }

  if (value === null) {
    return { text: 'null', sizeClass: 'node-value--small' }
  }

  const text = String(value)

  if (text.length <= 3) {
    return { text, sizeClass: '' }
  }

  if (text.length <= 5) {
    return { text, sizeClass: 'node-value--small' }
  }

  return { text: '...', sizeClass: 'node-value--tiny' }
}

type GraphNodeLayerProps = {
  nodes: GraphNode[]
  isConnectMode: boolean
  isDeleteMode: boolean
  isDeleteEdgeMode: boolean
  selectedNodeIds: string[]
  connectionSource: string | null
  draggingNodeId: string | null
  editingNodeId: string | null
  draftValue: string
  traversalVisitedNodeIds: string[]
  traversalCurrentNodeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
  onNodeMouseDown: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onConnectNodeClick: (nodeId: string) => void
  onToggleNodeSelection: (nodeId: string) => void
  onStartEditingNode: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onNodeContextMenu: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onValueChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onValueKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, nodeId: string) => void
  onCommitNodeValue: (nodeId: string, rawValue: string) => void
}

// Renders every node circle on the canvas.
// Click behavior depends on the active mode: connect-mode picks edge endpoints,
// delete-mode toggles selection, otherwise a click starts inline value editing.
export const GraphNodeLayer = ({
  nodes,
  isConnectMode,
  isDeleteMode,
  isDeleteEdgeMode,
  selectedNodeIds,
  connectionSource,
  draggingNodeId,
  editingNodeId,
  draftValue,
  traversalVisitedNodeIds,
  traversalCurrentNodeId,
  traversalStartNodeId,
  traversalGoalNodeIds,
  onNodeMouseDown,
  onConnectNodeClick,
  onToggleNodeSelection,
  onStartEditingNode,
  onNodeContextMenu,
  onValueChange,
  onValueKeyDown,
  onCommitNodeValue,
}: GraphNodeLayerProps) => (
  <>
    {nodes.map((node) => {
      const display = formatNodeValue(node.value)
      const valueClass = display.sizeClass
        ? `node-value ${display.sizeClass}`
        : 'node-value'
      const isSelected = selectedNodeIds.includes(node.id)
      const isConnectionSource = connectionSource === node.id
      const isVisited = traversalVisitedNodeIds.includes(node.id)
      const isCurrent = traversalCurrentNodeId === node.id
      const isStart = traversalStartNodeId === node.id
      const isGoal = traversalGoalNodeIds.includes(node.id)
      // Long values are truncated inside the circle; reveal the full value on hover.
      const showHoverValue = typeof node.value === 'number' && String(node.value).length > 5

      return (
        <div
          key={node.id}
          className={`node-wrap ${isConnectMode ? 'is-connect' : ''} ${isDeleteMode ? 'is-select' : ''} ${isSelected ? 'is-selected' : ''} ${isConnectionSource ? 'is-source' : ''} ${draggingNodeId === node.id ? 'is-dragging' : ''} ${editingNodeId === node.id ? 'is-editing' : ''} ${isVisited ? 'is-traversal-visited' : ''} ${isCurrent ? 'is-traversal-current' : ''} ${isStart ? 'is-traversal-start' : ''} ${isGoal ? 'is-traversal-goal' : ''}`}
          style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
        >
          <div
            className="node"
            onMouseDown={(event) => onNodeMouseDown(event, node)}
            onClick={(event) => {
              if (isConnectMode) {
                event.stopPropagation()
                onConnectNodeClick(node.id)
                return
              }

              if (isDeleteMode) {
                event.stopPropagation()
                onToggleNodeSelection(node.id)
                return
              }

              // Edge-delete mode owns its own clicks; swallow node clicks so they
              // don't fall through and accidentally add a node to the canvas.
              if (isDeleteEdgeMode) {
                event.stopPropagation()
                return
              }

              onStartEditingNode(event, node)
            }}
            onContextMenu={
              isConnectMode || isDeleteMode || isDeleteEdgeMode
                ? undefined
                : (event) => onNodeContextMenu(event, node)
            }
          >
            {editingNodeId === node.id ? (
              <input
                className="node-input"
                inputMode="numeric"
                value={draftValue}
                onChange={onValueChange}
                onKeyDown={(event) => onValueKeyDown(event, node.id)}
                onBlur={(event) => onCommitNodeValue(node.id, event.currentTarget.value)}
                autoFocus
              />
            ) : (
              <span className={valueClass}>{display.text}</span>
            )}
          </div>
          <span className="node-label">{node.label}</span>
          {showHoverValue && <span className="node-hover-value">{node.value}</span>}
        </div>
      )
    })}
  </>
)
