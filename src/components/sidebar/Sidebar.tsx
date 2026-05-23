import { useEffect, useRef, useState } from 'react'

import type { SidebarPage, SidebarProps } from './sidebarTypes'

import { CanvasSetupPage } from './CanvasSetupPage'

import { TraversalPage } from './TraversalPage'

import { AlgorithmsPage } from './AlgorithmsPage'

import { WeightedPathfindingPanel } from './WeightedPathfindingPanel'

export type { SidebarPage, AlgorithmMode } from './sidebarTypes'

const PAGE_CLASS: Record<SidebarPage, string> = {
  canvas: 'is-canvas-setup',
  traversal: 'is-traversal-setup',
  algorithms: 'is-algorithm-setup',
  pathfinder: 'is-pathfinder-setup',
}

// Right-side control panel. A thin shell: owns the page-switch tabs and notifies the
// parent on page changes. CanvasSetupPage and TraversalPage mount only while active;
// AlgorithmsPage stays mounted at all times (display:none when inactive) so that
// algorithmMode state and the hooks' sidebarAlgorithmModeRef stay in sync.
// In weighted-graph mode, the Traversal and Algorithms tabs are hidden and the sidebar
// is forced to the Canvas setup page.
export const Sidebar = ({
  onSidebarSectionChange,
  canvasSetup,
  traversal,
  algorithms,
  pathfinder,
  isWeightedMode,
}: SidebarProps) => {
  const [activePage, setActivePage] = useState<SidebarPage>('canvas')
  const prevPageRef = useRef<SidebarPage>(activePage)

  // In weighted mode the only valid pages are 'canvas' and 'pathfinder'.
  // Map any leftover non-weighted page to 'canvas' when entering weighted mode.
  const effectivePage: SidebarPage = isWeightedMode
    ? activePage === 'pathfinder' ? 'pathfinder' : 'canvas'
    : activePage === 'pathfinder' ? 'canvas' : activePage

  useEffect(() => {
    const prev = prevPageRef.current
    if (prev !== effectivePage) {
      onSidebarSectionChange?.({ from: prev, to: effectivePage })
      prevPageRef.current = effectivePage
    }
  }, [effectivePage, onSidebarSectionChange])

  return (
    <aside className={`sidebar ${PAGE_CLASS[effectivePage]}${isWeightedMode ? ' is-weighted-mode' : ''}`}>
      <div className="sidebar-page-switch">
        <button
          className={`sidebar-page-tab ${effectivePage === 'canvas' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('canvas')}
        >
          Canvas setup
        </button>
        {isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'pathfinder' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActivePage('pathfinder')}
          >
            Pathfinder setup
          </button>
        )}
        {!isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'traversal' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActivePage('traversal')}
          >
            Traversal setup
          </button>
        )}
        {!isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'algorithms' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActivePage('algorithms')}
          >
            Algorithm setup
          </button>
        )}
      </div>

      {effectivePage === 'canvas' && <CanvasSetupPage {...canvasSetup} />}
      {effectivePage === 'pathfinder' && <WeightedPathfindingPanel {...pathfinder} />}
      {effectivePage === 'traversal' && <TraversalPage {...traversal} />}
      <div
        className="sidebar-page-root"
        style={{ display: effectivePage === 'algorithms' ? undefined : 'none' }}
      >
        <AlgorithmsPage {...algorithms} />
      </div>
    </aside>
  )
}
