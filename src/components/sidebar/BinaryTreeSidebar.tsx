import type { BinaryTree } from '../../types'
import { getNodeCount, getTreeHeight } from '../../algorithms/binaryTreeShared'

type BinaryTreeSidebarProps = {
  tree: BinaryTree
}

// The binary tree canvas has no algorithm playback yet, so the sidebar only reports tree shape.
export const BinaryTreeSidebar = ({ tree }: BinaryTreeSidebarProps) => {
  const nodeCount = getNodeCount(tree)
  const height = getTreeHeight(tree)

  return (
    <aside className="sidebar is-binary-tree">
      <div className="sidebar-page-body sidebar-page-body--grid">
        <div className="sidebar-section">
          <h3>Stats</h3>
          <div className="algorithm-output">
            <div className="output-row">
              <span className="output-label">Nodes</span>
              <span className="output-value">{nodeCount}</span>
            </div>
            <div className="output-row">
              <span className="output-label">Height</span>
              <span className="output-value">{height}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
