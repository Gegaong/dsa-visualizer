import { useEffect, useRef, useState } from 'react'

import type { SidebarPage, SidebarProps } from './sidebarTypes'

import { CanvasSetupPage } from './CanvasSetupPage'

import { TraversalPage } from './TraversalPage'

import { AlgorithmsPage } from './AlgorithmsPage'

export type { SidebarPage, AlgorithmMode } from './sidebarTypes'

const PAGE_CLASS: Record<SidebarPage, string> = {
  canvas: 'is-canvas-setup',
  traversal: 'is-traversal-setup',
  algorithms: 'is-algorithm-setup',
}

// Right-side control panel. A thin shell: owns the page-switch tabs and notifies the
// parent on page changes. CanvasSetupPage and TraversalPage mount only while active;
// AlgorithmsPage stays mounted at all times (display:none when inactive) so that
// algorithmMode state and the hooks' sidebarAlgorithmModeRef stay in sync.
export const Sidebar = ({
  onSidebarSectionChange,
  canvasSetup,
  traversal,
  algorithms,
}: SidebarProps) => {
  const [activePage, setActivePage] = useState<SidebarPage>('canvas')
  const prevPageRef = useRef<SidebarPage>(activePage)

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
          Traversal mode
        </button>
        <button
          className={`sidebar-page-tab ${activePage === 'algorithms' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('algorithms')}
        >
          Algorithms
        </button>
      </div>

      {activePage === 'canvas' && <CanvasSetupPage {...canvasSetup} />}
      {activePage === 'traversal' && <TraversalPage {...traversal} />}
      <div
        className="sidebar-page-root"
        style={{ display: activePage === 'algorithms' ? undefined : 'none' }}
      >
        <AlgorithmsPage {...algorithms} />
      </div>
    </aside>
  )
}
