import { useState } from 'react'

import { BinaryTreeCanvasSetupPage } from './BinaryTreeCanvasSetupPage'
import type { BinaryTreeCanvasSetupPageProps } from './BinaryTreeCanvasSetupPage'
import { BinaryTreeTraversalPage } from './BinaryTreeTraversalPage'
import type { BinaryTreeTraversalPageProps } from './BinaryTreeTraversalPage'

type BinaryTreeSidebarPage = 'canvas' | 'traversal'

type BinaryTreeSidebarProps = {
  canvasSetup: BinaryTreeCanvasSetupPageProps
  traversal: BinaryTreeTraversalPageProps
}

const PAGE_CLASS: Record<BinaryTreeSidebarPage, string> = {
  canvas: 'is-canvas-setup',
  traversal: 'is-traversal-setup',
}

// Two-tab shell mirroring the graph canvas's Sidebar: a page-switch strip up top, with both
// page panels kept mounted (display:none when inactive) so scroll position survives tab switches.
export const BinaryTreeSidebar = ({ canvasSetup, traversal }: BinaryTreeSidebarProps) => {
  const [activePage, setActivePage] = useState<BinaryTreeSidebarPage>('canvas')

  return (
    <aside className={`sidebar ${PAGE_CLASS[activePage]}`}>
      <div className="sidebar-page-switch">
        <button
          className={`sidebar-page-tab ${activePage === 'canvas' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('canvas')}
        >
          Canvas setup
        </button>
        <button
          className={`sidebar-page-tab ${activePage === 'traversal' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('traversal')}
        >
          Traversal setup
        </button>
      </div>

      <div className="sidebar-page-root" style={{ display: activePage === 'canvas' ? undefined : 'none' }}>
        <BinaryTreeCanvasSetupPage {...canvasSetup} />
      </div>
      <div className="sidebar-page-root" style={{ display: activePage === 'traversal' ? undefined : 'none' }}>
        <BinaryTreeTraversalPage {...traversal} />
      </div>
    </aside>
  )
}
