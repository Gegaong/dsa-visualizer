import type { ContextMenuState, GraphNode } from '../../types'

type NodeContextMenuProps = {
  contextMenu: ContextMenuState | null
  nodes: GraphNode[]
  isDeleteMode: boolean
  isWeightedMode: boolean
  blockActions?: boolean
  onClose: () => void
  onEditValue: (node: GraphNode) => void
  onDelete: (nodeId: string) => void
}

// Right-click menu for a single node.
// Shows the node's label and value, plus Edit/Delete actions. The actions are
// hidden in delete-node mode (where node clicks already mean "select"), and the
// whole menu is hidden when there's no active context menu.
export const NodeContextMenu = ({
  contextMenu,
  nodes,
  isDeleteMode,
  isWeightedMode,
  blockActions = false,
  onClose,
  onEditValue,
  onDelete,
}: NodeContextMenuProps) => {
  if (!contextMenu) return null
  const node = nodes.find((n) => n.id === contextMenu.nodeId) ?? null
  if (!node) return null

  const { heuristic } = contextMenu
  let heuristicDisplay: string | null = null
  if (heuristic !== undefined) {
    const rawStr = heuristic.toString()
    const dotIndex = rawStr.indexOf('.')
    const isTruncated = dotIndex !== -1 && rawStr.length - dotIndex - 1 > 4
    heuristicDisplay = parseFloat(heuristic.toFixed(4)).toString() + (isTruncated ? '...' : '')
  }

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
          <span className="context-title">Node {node.label}</span>
          {!isWeightedMode && (
            <span className="context-value">
              {node.value === 'empty' ? 'empty' : node.value}
            </span>
          )}
          {heuristicDisplay !== null && (
            <span className="context-value">h: {heuristicDisplay}</span>
          )}
        </div>
        {!isDeleteMode && (
          <>
            {!isWeightedMode && (
              <button
                className="context-action"
                type="button"
                onClick={() => {
                  onEditValue(node)
                  onClose()
                }}
              >
                Edit value
              </button>
            )}
            <button
              className="context-action context-action--danger"
              type="button"
              disabled={blockActions}
              onClick={() => {
                onDelete(node.id)
                onClose()
              }}
            >
              Delete node
            </button>
          </>
        )}
      </div>
    </div>
  )
}
