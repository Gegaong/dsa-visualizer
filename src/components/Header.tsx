import type { CanvasType } from '../types'

type HeaderProps = {
  activeCanvas: CanvasType
  onCanvasTypeChange: (type: CanvasType) => void
}

// Top bar with brand identity and the structure-type tabs.
export const Header = ({ activeCanvas, onCanvasTypeChange }: HeaderProps) => (
  <header className="topbar">
    <div className="brand">
      <span className="brand-title">DSA Visualizer</span>
      <span className="brand-subtitle">Build structures, then test algorithms.</span>
    </div>
    <nav className="structure-nav">
      <button
        className={`btn btn-pill ${activeCanvas === 'graph' ? 'btn-active' : ''}`}
        type="button"
        onClick={() => onCanvasTypeChange('graph')}
      >
        Graph
      </button>
      <button
        className={`btn btn-pill ${activeCanvas === 'weighted-graph' ? 'btn-active' : ''}`}
        type="button"
        onClick={() => onCanvasTypeChange('weighted-graph')}
      >
        Weighted Graph
      </button>
      <button className="btn btn-pill" type="button" disabled>
        Grid
      </button>
      <button className="btn btn-pill" type="button" disabled>
        Maze
      </button>
    </nav>
  </header>
)
