import { useEffect, useRef, useState } from 'react'

import { BinaryTreeCanvasSetupPage } from './BinaryTreeCanvasSetupPage'
import type { BinaryTreeCanvasSetupPageProps } from './BinaryTreeCanvasSetupPage'
import { BinaryTreeTraversalPage } from './BinaryTreeTraversalPage'
import type { BinaryTreeTraversalPageProps } from './BinaryTreeTraversalPage'

export type BinaryTreeSidebarPage = 'canvas' | 'traversal'

type BinaryTreeSidebarProps = {
  canvasSetup: BinaryTreeCanvasSetupPageProps
  traversal: BinaryTreeTraversalPageProps
  onSidebarSectionChange?: (nav: { from: BinaryTreeSidebarPage; to: BinaryTreeSidebarPage }) => void
}

const PAGE_CLASS: Record<BinaryTreeSidebarPage, string> = {
  canvas: 'is-canvas-setup',
  traversal: 'is-traversal-setup',
}

// Two-tab shell mirroring the graph canvas's Sidebar: a page-switch strip up top, with both
// page panels kept mounted (display:none when inactive) so scroll position survives tab switches.
export const BinaryTreeSidebar = ({ canvasSetup, traversal, onSidebarSectionChange }: BinaryTreeSidebarProps) => {
  const [activePage, setActivePage] = useState<BinaryTreeSidebarPage>('canvas')
  const prevPageRef = useRef<BinaryTreeSidebarPage>(activePage)

  useEffect(() => {
    const prev = prevPageRef.current
    if (prev !== activePage) {
      onSidebarSectionChange?.({ from: prev, to: activePage })
      prevPageRef.current = activePage
    }
  }, [activePage, onSidebarSectionChange])

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
