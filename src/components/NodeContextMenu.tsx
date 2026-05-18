import type { ContextMenuState, GraphNode } from '../types'

type NodeContextMenuProps = {
  contextMenu: ContextMenuState | null
  nodes: GraphNode[]
  isDeleteMode: boolean
  isWeightedMode: boolean
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
  onClose,
  onEditValue,
  onDelete,
}: NodeContextMenuProps) => {
  if (!contextMenu) return null
  const node = nodes.find((n) => n.id === contextMenu.nodeId) ?? null
  if (!node) return null

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
