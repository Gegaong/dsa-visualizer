import type { BinaryTree, BinaryTreeContextMenuState } from '../../types'

type BinaryTreeNodeContextMenuProps = {
  contextMenu: BinaryTreeContextMenuState | null
  tree: BinaryTree
  isDeleteMode: boolean
  onClose: () => void
  onEditValue: (nodeId: string) => void
  onDelete: (nodeId: string) => void
}

// Right-click menu for a single binary tree node — mirrors the graph canvas's NodeContextMenu
// (same header/label/value layout, same Edit/Delete actions).
export const BinaryTreeNodeContextMenu = ({
  contextMenu,
  tree,
  isDeleteMode,
  onClose,
  onEditValue,
  onDelete,
}: BinaryTreeNodeContextMenuProps) => {
  if (!contextMenu) return null
  const node = tree.nodesById[contextMenu.nodeId]
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
          <span className="context-value">
            {node.value === 'empty' ? 'empty' : node.value}
          </span>
        </div>
        {!isDeleteMode && (
          <>
            <button
              className="context-action"
              type="button"
              onClick={() => {
                onEditValue(node.id)
                onClose()
              }}
            >
              Edit value
            </button>
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
