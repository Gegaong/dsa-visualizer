import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent } from 'react'

import type { GraphNode } from '../types'

import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'

// Pick the right text + size class for a node's value.
// 'empty' renders as a blank circle; numbers shrink (or get truncated to "...") to fit.
const formatNodeValue = (value: number | 'empty') => {
  if (value === 'empty') {
    return { text: '', sizeClass: '' }
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
  isWeightedMode: boolean
  selectedNodeIds: string[]
  connectionSource: string | null
  draggingNodeId: string | null
  editingNodeId: string | null
  draftValue: string
  traversalVisitedNodeIds: string[]
  traversalCurrentNodeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
  // Intermediate nodes on the shortest path (excludes start and goal); styled with lighter blue.
  shortestPathNodeIds: string[]
  // Full connected-component outline color (HSL per component); applied when enabled and visited.
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  weakCCVisitedNodeIds: string[]
  // Bipartite 2-coloring groups; yellow = group A, blue = group B.
  bipartiteGroupANodeIds: string[]
  bipartiteGroupBNodeIds: string[]
  // Weighted pathfinding visual state (null = inactive).
  wpSettledNodeIds: string[]
  wpTentativeNodeIds: string[]
  wpAssumedNodeIds: string[]
  wpCurrentNodeId: string | null
  wpStartNodeId: string | null
  wpGoalNodeId: string | null
  wpPathNodeIds: string[]
  wpPathGuaranteed: boolean
  wpCostByNodeId: Map<string, number>
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
  isWeightedMode,
  selectedNodeIds,
  connectionSource,
  draggingNodeId,
  editingNodeId,
  draftValue,
  traversalVisitedNodeIds,
  traversalCurrentNodeId,
  traversalStartNodeId,
  traversalGoalNodeIds,
  shortestPathNodeIds,
  weakCCOutlineHslByNodeId,
  weakCCOutlineActive,
  weakCCVisitedNodeIds,
  bipartiteGroupANodeIds,
  bipartiteGroupBNodeIds,
  wpSettledNodeIds,
  wpTentativeNodeIds,
  wpAssumedNodeIds,
  wpCurrentNodeId,
  wpStartNodeId,
  wpGoalNodeId,
  wpPathNodeIds,
  wpPathGuaranteed,
  wpCostByNodeId,
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
      const isShortestPath = shortestPathNodeIds.includes(node.id)
      const weakCcColored =
        weakCCOutlineActive &&
        weakCCOutlineHslByNodeId !== null &&
        weakCCOutlineHslByNodeId.has(node.id)
      const ccHsl = weakCCOutlineHslByNodeId?.get(node.id)
      const ccVisited = weakCCVisitedNodeIds.includes(node.id)
      const ccOutline = weakCCOutlineActive && ccHsl !== undefined && ccVisited
      const isCcCurrent = ccOutline && isCurrent
      const isBipartiteGroupA = bipartiteGroupANodeIds.includes(node.id)
      const isBipartiteGroupB = bipartiteGroupBNodeIds.includes(node.id)
      const isBipartiteColored = isBipartiteGroupA || isBipartiteGroupB
      const isBipartiteCurrent = isCurrent && isBipartiteColored
      // Long values are truncated inside the circle; reveal the full value on hover.
      const showHoverValue = typeof node.value === 'number' && String(node.value).length > 5

      // Weighted pathfinding visual state
      const wpActive = wpStartNodeId !== null || wpGoalNodeId !== null
      const isWpSettled = wpSettledNodeIds.includes(node.id)
      const isWpCurrent = wpCurrentNodeId === node.id
      const isWpStart = wpStartNodeId === node.id
      const isWpGoal = wpGoalNodeId === node.id
      const isWpPath = wpPathNodeIds.includes(node.id)
      const isWpAssumed = !isWpSettled && wpAssumedNodeIds.includes(node.id)
      const isWpTentative = !isWpSettled && !isWpAssumed && wpTentativeNodeIds.includes(node.id)
      const wpCost = wpCostByNodeId.get(node.id)

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

      // Show "?" when cost is unproven, but not on guaranteed path nodes (avoids ? on BFS/DFS goal).
      const wpCostLabel =
        wpActive && wpCost !== undefined
          ? (isWpTentative || isWpAssumed) && !(isWpPath && wpPathGuaranteed)
            ? `${wpCost}?`
            : String(wpCost)
          : null

      const wpCostLabelSizeClass =
        wpCostLabel !== null && wpCostLabel.length > 5
          ? 'node-value--tiny'
          : wpCostLabel !== null && wpCostLabel.length > 3
            ? 'node-value--small'
            : ''

      return (
        <div
          key={node.id}
          className={`node-wrap ${isConnectMode ? 'is-connect' : ''} ${isDeleteMode ? 'is-select' : ''} ${isSelected ? 'is-selected' : ''} ${isConnectionSource ? 'is-source' : ''} ${draggingNodeId === node.id ? 'is-dragging' : ''} ${editingNodeId === node.id ? 'is-editing' : ''} ${isVisited && !ccOutline && !weakCcColored && !isShortestPath && !isGoal && !isBipartiteColored ? 'is-traversal-visited' : ''} ${isCurrent && !isCcCurrent && !isBipartiteCurrent ? 'is-traversal-current' : ''} ${isStart && !ccOutline && !isBipartiteColored ? 'is-traversal-start' : ''} ${isGoal && !ccOutline ? 'is-traversal-goal' : ''} ${isShortestPath && !isGoal ? 'is-shortest-path' : ''} ${isBipartiteGroupA ? 'is-bipartite-group-a' : ''} ${isBipartiteGroupB ? 'is-bipartite-group-b' : ''} ${isBipartiteCurrent ? 'is-bipartite-current' : ''} ${wpActive && !isWpStart && !isWpGoal && !isWpSettled && !isWpAssumed && !isWpTentative && !isWpPath ? 'is-wp-undiscovered' : ''} ${isWpTentative ? 'is-wp-tentative' : ''} ${isWpAssumed ? 'is-wp-assumed' : ''} ${isWpSettled && !isWpPath ? 'is-wp-settled' : ''} ${isWpPath ? (wpPathGuaranteed ? 'is-wp-path' : 'is-wp-path-greedy') : ''} ${isWpCurrent ? 'is-wp-current' : ''} ${isWpStart ? 'is-traversal-start' : ''} ${isWpGoal ? 'is-traversal-goal' : ''}`}
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

              if (isDeleteEdgeMode || isWeightedMode) {
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
            {!isWeightedMode && (editingNodeId === node.id ? (
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
            ))}
            {isWeightedMode && wpCostLabel !== null && (
              <span className={`node-value${wpCostLabelSizeClass ? ` ${wpCostLabelSizeClass}` : ''}`}>
                {wpCostLabel}
              </span>
            )}
          </div>
          <span className="node-label">{node.label}</span>
          {!isWeightedMode && showHoverValue && <span className="node-hover-value">{node.value}</span>}
        </div>
      )
    })}
  </>
)
