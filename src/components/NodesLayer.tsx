import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import type { GraphNode } from '../types'
import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'

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
  // Full weak-CC outline color (HSL per component); applied when enabled and visited.
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  onNodeMouseDown: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onConnectNodeClick: (nodeId: string) => void
  onToggleNodeSelection: (nodeId: string) => void
  onStartEditingNode: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onNodeContextMenu: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onValueChange: (event: ChangeEvent<HTMLInputElement>) => void
  onValueKeyDown: (event: KeyboardEvent<HTMLInputElement>, nodeId: string) => void
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
  weakCCOutlineHslByNodeId,
  weakCCOutlineActive,
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
      const weakCcColored =
        weakCCOutlineHslByNodeId !== null && weakCCOutlineHslByNodeId.has(node.id)
      const ccHsl = weakCCOutlineHslByNodeId?.get(node.id)
      const ccOutline =
        weakCCOutlineActive &&
        ccHsl !== undefined &&
        isVisited &&
        !isConnectMode &&
        !isDeleteMode &&
        !isDeleteEdgeMode
      const isCcCurrent = ccOutline && isCurrent
      // Long values are truncated inside the circle; reveal the full value on hover.
      const showHoverValue = typeof node.value === 'number' && String(node.value).length > 5

      const ccNodeStyle: CSSProperties | undefined =
        ccOutline && ccHsl
          ? {
              borderColor: `hsl(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}%)`,
              borderWidth: isCcCurrent ? 3 : 2,
              background: `hsla(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}% / 0.22)`,
              boxShadow: isCcCurrent
                ? `0 0 0 6px hsla(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}% / 0.3), 0 0 0 12px hsla(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}% / 0.14), 0 14px 24px rgba(46, 32, 23, 0.2)`
                : `0 0 0 4px hsla(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}% / 0.26), 0 12px 22px rgba(46, 32, 23, 0.2)`,
              transform: isCcCurrent ? 'scale(1.06)' : undefined,
            }
          : undefined

      return (
        <div
          key={node.id}
          className={`node-wrap ${isConnectMode ? 'is-connect' : ''} ${isDeleteMode ? 'is-select' : ''} ${isSelected ? 'is-selected' : ''} ${isConnectionSource ? 'is-source' : ''} ${draggingNodeId === node.id ? 'is-dragging' : ''} ${editingNodeId === node.id ? 'is-editing' : ''} ${isVisited && !ccOutline && !weakCcColored ? 'is-traversal-visited' : ''} ${isCurrent && !isCcCurrent ? 'is-traversal-current' : ''} ${isStart && !ccOutline ? 'is-traversal-start' : ''} ${isGoal && !ccOutline ? 'is-traversal-goal' : ''}`}
          style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
        >
          <div
            className="node"
            style={ccNodeStyle}
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
