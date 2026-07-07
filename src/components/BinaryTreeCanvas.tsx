import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'

import type { BinaryTree, BinaryTreeContextMenuState, BinaryTreeSide } from '../types'
import { getNodeCount, getTreeHeight } from '../algorithms/binaryTreeShared'
import { computeBinaryTreeLayout } from '../utils/binaryTreeLayout'
import { TREE_NODE_SIZE } from '../utils/constants'
import { sanitizeNumericInput, parseNumberInput, formatNodeValueDisplay } from '../utils/format'
import type { NodeValueSizeTier } from '../utils/format'
import { BinaryTreeNodeContextMenu } from './BinaryTreeNodeContextMenu'
import { ConfirmModal } from './Modals'

type BinaryTreeCanvasProps = {
  tree: BinaryTree
  onAddNode: (parentId: string | null, side: BinaryTreeSide | null) => void
  onCommitNodeValue: (nodeId: string, value: number | 'empty') => void
  onDeleteNodes: (nodeIds: string[]) => void
  onClearTree: () => void
  isTraversalRunning: boolean
  traversalVisitedNodeIds: string[]
  traversalCurrentNodeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
}

const parseDraftValue = (raw: string): number | 'empty' => {
  const parsed = parseNumberInput(raw)
  return parsed !== null ? parsed : 'empty'
}

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

// Base (unscaled) px sizes per value-size tier — same numbers the graph canvas uses for its
// fixed-size nodes, scaled here to track the tree's current zoom-out level.
const VALUE_FONT_SIZE_BY_TIER: Record<NodeValueSizeTier, number> = {
  normal: 14,
  small: 12,
  tiny: 11,
}
const VALUE_FONT_MIN_PX = 8
const INPUT_FONT_SIZE_BASE = 13

export const BinaryTreeCanvas = ({
  tree,
  onAddNode,
  onCommitNodeValue,
  onDeleteNodes,
  onClearTree,
  isTraversalRunning,
  traversalVisitedNodeIds,
  traversalCurrentNodeId,
  traversalStartNodeId,
  traversalGoalNodeIds,
}: BinaryTreeCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [contextMenu, setContextMenu] = useState<BinaryTreeContextMenuState | null>(null)

  // A running traversal owns the canvas: fall back to these instead of the raw state so any
  // edit mode that was active before the run started stops affecting the UI, without having to
  // reset that state from an effect (which would just fire an extra render for no benefit).
  const effectiveDeleteMode = deleteMode && !isTraversalRunning
  const effectiveSelectedNodeIds = isTraversalRunning ? [] : selectedNodeIds
  const effectiveEditingNodeId = isTraversalRunning ? null : editingNodeId
  const effectiveContextMenu = isTraversalRunning ? null : contextMenu

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const layout = useMemo(
    () => computeBinaryTreeLayout(tree, containerSize.width, containerSize.height),
    [tree, containerSize.width, containerSize.height],
  )

  const nodeCount = getNodeCount(tree)
  const treeHeight = getTreeHeight(tree)

  const commitEditing = (nodeId: string, rawValue: string) => {
    onCommitNodeValue(nodeId, parseDraftValue(rawValue))
    setEditingNodeId(null)
    setDraftValue('')
  }

  const startEditingNode = (nodeId: string) => {
    if (editingNodeId === nodeId) return
    if (editingNodeId) commitEditing(editingNodeId, draftValue)

    const node = tree.nodesById[nodeId]
    setEditingNodeId(nodeId)
    setDraftValue(node && typeof node.value === 'number' ? String(node.value) : '')
  }

  const handleNodeClick = (nodeId: string) => {
    if (isTraversalRunning) return
    if (deleteMode) {
      setSelectedNodeIds((prev) =>
        prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
      )
      return
    }
    startEditingNode(nodeId)
  }

  // Opens the node context menu at a clamped screen position — same bounds as the graph canvas's
  // context menu, so it never renders partly off-screen near a window edge.
  const handleNodeContextMenu = (event: MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (isTraversalRunning) return

    const menuWidth = 220
    const menuHeight = 160
    const padding = 12
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)
    setContextMenu({ nodeId, x, y })
  }

  // Suppresses the default browser context menu on the canvas background and dismisses any open
  // node menu, mirroring the graph canvas's background right-click behavior.
  const handleCanvasContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setContextMenu(null)
  }

  // Toolbar: toggles delete mode; turning it off while nodes are selected deletes them (and their
  // subtrees) all at once, mirroring the graph canvas's multi-select delete flow.
  const handleDeleteModeToggle = () => {
    if (isTraversalRunning) return
    if (deleteMode) {
      if (selectedNodeIds.length > 0) onDeleteNodes(selectedNodeIds)
      setDeleteMode(false)
      setSelectedNodeIds([])
      return
    }
    setEditingNodeId(null)
    setDraftValue('')
    setSelectedNodeIds([])
    setDeleteMode(true)
    setContextMenu(null)
  }

  const handleValueKeyDown = (event: KeyboardEvent<HTMLInputElement>, nodeId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEditing(nodeId, event.currentTarget.value)
    }
    if (event.key === 'Escape') {
      setEditingNodeId(null)
      setDraftValue('')
    }
  }

  const handleClearClick = () => {
    if (nodeCount === 0 || isTraversalRunning) return
    setClearConfirmOpen(true)
  }

  const nodeSize = TREE_NODE_SIZE * layout.scale
  const nodeRadius = nodeSize / 2
  const addSlotIconSize = Math.max(14, nodeSize * 0.4)
  const inputFontSize = Math.max(VALUE_FONT_MIN_PX, INPUT_FONT_SIZE_BASE * layout.scale)

  // Trims each edge to stop right at the node's circle boundary instead of running through its
  // center — otherwise the line would show through a selected node's translucent fill and look
  // like a z-index/stacking bug.
  const trimEdgeToNodeRadius = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.001) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
    const unitX = dx / dist
    const unitY = dy / dist
    return {
      x1: from.x + unitX * nodeRadius,
      y1: from.y + unitY * nodeRadius,
      x2: to.x - unitX * nodeRadius,
      y2: to.y - unitY * nodeRadius,
    }
  }

  // A tree edge has no id of its own — it's uniquely identified by its child node's id, since
  // every node has exactly one incoming edge (or none, for the root).
  const edgeClassName = (childId: string) => {
    if (traversalCurrentNodeId === childId) return 'is-traversal-current'
    if (traversalVisitedNodeIds.includes(childId)) return 'is-traversal-visited'
    return undefined
  }

  return (
    <>
      <ConfirmModal
        open={clearConfirmOpen}
        title="Clear tree"
        body="The entire tree will be removed. This can't be undone."
        confirmLabel="Clear"
        onConfirm={() => { onClearTree(); setClearConfirmOpen(false) }}
        onCancel={() => setClearConfirmOpen(false)}
      />
      <BinaryTreeNodeContextMenu
        contextMenu={effectiveContextMenu}
        tree={tree}
        isDeleteMode={effectiveDeleteMode}
        onClose={() => setContextMenu(null)}
        onEditValue={startEditingNode}
        onDelete={(nodeId) => onDeleteNodes([nodeId])}
      />
      <section className="canvas-panel">
        <div className="canvas-header">
          <div className="canvas-copy">
            <h2>Binary Tree Canvas</h2>
            <p>Click a + indicator to grow the tree, click a node to edit its value.</p>
          </div>
          <div className="canvas-actions">
            <div className="binary-tree-stats">
              <div className="binary-tree-stat">
                <span className="binary-tree-stat-label">Nodes</span>
                <span className="binary-tree-stat-value">{nodeCount}</span>
              </div>
              <div className="binary-tree-stat">
                <span className="binary-tree-stat-label">Height</span>
                <span className="binary-tree-stat-value">{treeHeight}</span>
              </div>
            </div>
            <button
              className={`btn btn-pill connect-toggle-btn ${effectiveDeleteMode ? 'btn-active' : ''}`}
              type="button"
              disabled={isTraversalRunning}
              onClick={handleDeleteModeToggle}
            >
              {effectiveDeleteMode
                ? effectiveSelectedNodeIds.length > 0
                  ? 'Delete selected nodes'
                  : 'Cancel node delete'
                : 'Delete nodes'}
            </button>
            <button
              className="btn"
              type="button"
              disabled={nodeCount === 0 || isTraversalRunning}
              onClick={handleClearClick}
            >
              Clear tree
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="binary-tree-canvas-area"
          onContextMenu={handleCanvasContextMenu}
        >
          <svg className="binary-tree-edges-svg">
            {Object.values(tree.nodesById).map((node) => {
              const from = layout.nodePositions.get(node.id)
              if (!from) return null
              return (
                <g key={node.id}>
                  {node.leftId && layout.nodePositions.has(node.leftId) && (() => {
                    const to = layout.nodePositions.get(node.leftId!)!
                    const { x1, y1, x2, y2 } = trimEdgeToNodeRadius(from, to)
                    return <line x1={x1} y1={y1} x2={x2} y2={y2} className={edgeClassName(node.leftId!)} />
                  })()}
                  {node.rightId && layout.nodePositions.has(node.rightId) && (() => {
                    const to = layout.nodePositions.get(node.rightId!)!
                    const { x1, y1, x2, y2 } = trimEdgeToNodeRadius(from, to)
                    return <line x1={x1} y1={y1} x2={x2} y2={y2} className={edgeClassName(node.rightId!)} />
                  })()}
                </g>
              )
            })}
          </svg>

          {layout.addSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className="binary-tree-add-slot"
              style={{ left: slot.x, top: slot.y, width: nodeSize, height: nodeSize }}
              disabled={effectiveDeleteMode || isTraversalRunning}
              title={slot.parentId === null ? 'Add root node' : `Add ${slot.side} child`}
              aria-label={slot.parentId === null ? 'Add root node' : `Add ${slot.side} child`}
              onClick={() => onAddNode(slot.parentId, slot.side)}
            >
              <span className="binary-tree-add-slot-icon" style={{ width: addSlotIconSize, height: addSlotIconSize }}>
                {PLUS_ICON}
              </span>
            </button>
          ))}

          {Object.values(tree.nodesById).map((node) => {
            const pos = layout.nodePositions.get(node.id)
            if (!pos) return null
            const isEditing = effectiveEditingNodeId === node.id
            const isSelected = effectiveSelectedNodeIds.includes(node.id)
            const { text: displayValue, sizeTier } = formatNodeValueDisplay(node.value)
            const fontSize = Math.max(VALUE_FONT_MIN_PX, VALUE_FONT_SIZE_BY_TIER[sizeTier] * layout.scale)
            const showHoverValue = typeof node.value === 'number'

            const isTraversalCurrent = traversalCurrentNodeId === node.id
            const isTraversalGoal = traversalGoalNodeIds.includes(node.id)
            const isTraversalVisited = !isTraversalCurrent && !isTraversalGoal && traversalVisitedNodeIds.includes(node.id)
            const isTraversalStart = !isTraversalGoal && traversalStartNodeId === node.id
            const traversalWrapClass =
              `${isTraversalVisited ? ' is-traversal-visited' : ''}` +
              `${isTraversalStart ? ' is-traversal-start' : ''}` +
              `${isTraversalGoal ? ' is-traversal-goal' : ''}` +
              `${isTraversalCurrent ? ' is-traversal-current' : ''}`

            return (
              <div
                key={node.id}
                className={`binary-tree-node-wrap${traversalWrapClass}`}
                style={{ left: pos.x - nodeSize / 2, top: pos.y - nodeSize / 2 }}
              >
                <div
                  className={`binary-tree-node${effectiveDeleteMode ? ' is-delete-mode' : ''}${isSelected ? ' is-selected' : ''}${isEditing ? ' is-editing' : ''}`}
                  style={{ width: nodeSize, height: nodeSize }}
                  onClick={() => handleNodeClick(node.id)}
                  onContextMenu={effectiveDeleteMode ? undefined : (e) => handleNodeContextMenu(e, node.id)}
                >
                  {isEditing ? (
                    <input
                      className="binary-tree-node-input"
                      style={{ fontSize: inputFontSize }}
                      inputMode="numeric"
                      value={draftValue}
                      onChange={(e) => setDraftValue(sanitizeNumericInput(e.target.value))}
                      onKeyDown={(e) => handleValueKeyDown(e, node.id)}
                      onBlur={(e) => commitEditing(node.id, e.currentTarget.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="binary-tree-node-value" style={{ fontSize }}>{displayValue}</span>
                  )}
                  {showHoverValue && <span className="binary-tree-node-hover-value">{node.value}</span>}
                </div>
                <span className="binary-tree-node-label">{node.label}</span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
