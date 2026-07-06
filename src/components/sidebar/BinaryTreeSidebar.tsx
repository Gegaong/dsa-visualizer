import { BinaryTreeCanvasSetupPage } from './BinaryTreeCanvasSetupPage'
import type { BinaryTreeCanvasSetupPageProps } from './BinaryTreeCanvasSetupPage'

type BinaryTreeSidebarProps = {
  canvasSetup: BinaryTreeCanvasSetupPageProps
}

// "Traversal setup" tab is shown but disabled — traversal algorithms haven't been implemented
// yet, so the page always stays on Canvas setup. The tab comes alive once that lands.
export const BinaryTreeSidebar = ({ canvasSetup }: BinaryTreeSidebarProps) => (
  <aside className="sidebar is-canvas-setup">
    <div className="sidebar-page-switch">
      <button className="sidebar-page-tab is-active" type="button">
        Canvas setup
      </button>
      <button
        className="sidebar-page-tab"
        type="button"
        disabled
        title="Traversal algorithms haven't been added yet"
      >
        Traversal setup
      </button>
    </div>

    <div className="sidebar-page-root">
      <BinaryTreeCanvasSetupPage {...canvasSetup} />
    </div>
  </aside>
)
