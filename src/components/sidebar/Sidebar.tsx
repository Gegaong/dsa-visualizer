import { useEffect, useRef } from 'react'

import type { SidebarPage, SidebarProps } from './sidebarTypes'

import { CanvasSetupPage } from './graph/CanvasSetupPage'

import { TraversalPage } from './graph/TraversalPage'

import { AlgorithmsPage } from './graph/AlgorithmsPage'

import { WeightedPathfindingPanel } from './graph/WeightedPathfindingPanel'

export type { SidebarPage, AlgorithmMode } from './sidebarTypes'

const PAGE_CLASS: Record<SidebarPage, string> = {
  canvas: 'is-canvas-setup',
  traversal: 'is-traversal-setup',
  algorithms: 'is-algorithm-setup',
  pathfinder: 'is-pathfinder-setup',
}

// Right-side control panel. A thin shell: owns the page-switch tabs and notifies the
// parent on page changes. All four page panels stay mounted at all times (display:none
// when inactive) so scroll positions are preserved across tab switches.
// In weighted-graph mode, the Traversal and Algorithms tabs are hidden and the sidebar
// is forced to the Canvas setup page.
export const Sidebar = ({
  activePage,
  onActivePage,
  onSidebarSectionChange,
  canvasSetup,
  traversal,
  algorithms,
  pathfinder,
  isWeightedMode,
}: SidebarProps) => {
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
          onClick={() => onActivePage('canvas')}
        >
          Canvas setup
        </button>
        {isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'pathfinder' ? 'is-active' : ''}`}
            type="button"
            onClick={() => onActivePage('pathfinder')}
          >
            Pathfinder setup
          </button>
        )}
        {!isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'traversal' ? 'is-active' : ''}`}
            type="button"
            onClick={() => onActivePage('traversal')}
          >
            Traversal setup
          </button>
        )}
        {!isWeightedMode && (
          <button
            className={`sidebar-page-tab ${effectivePage === 'algorithms' ? 'is-active' : ''}`}
            type="button"
            onClick={() => onActivePage('algorithms')}
          >
            Algorithm setup
          </button>
        )}
      </div>

      <div className="sidebar-page-root" style={{ display: effectivePage === 'canvas' ? undefined : 'none' }}>
        <CanvasSetupPage {...canvasSetup} />
      </div>
      <div className="sidebar-page-root" style={{ display: effectivePage === 'pathfinder' ? undefined : 'none' }}>
        <WeightedPathfindingPanel {...pathfinder} />
      </div>
      <div className="sidebar-page-root" style={{ display: effectivePage === 'traversal' ? undefined : 'none' }}>
        <TraversalPage {...traversal} />
      </div>
      <div className="sidebar-page-root" style={{ display: effectivePage === 'algorithms' ? undefined : 'none' }}>
        <AlgorithmsPage {...algorithms} />
      </div>
    </aside>
  )
}
