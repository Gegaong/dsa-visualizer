// Top bar with brand identity and the structure-type tabs.
// The Weighted Graph / Grid / Maze tabs are placeholders for future canvas types.
export const Header = () => (
  <header className="topbar">
    <div className="brand">
      <span className="brand-title">DSA Visualizer</span>
      <span className="brand-subtitle">Build structures, then test algorithms.</span>
    </div>
    <nav className="structure-nav">
      <button className="btn btn-pill btn-active" type="button">
        Graph
      </button>
      <button className="btn btn-pill" type="button">
        Weighted Graph
      </button>
      <button className="btn btn-pill" type="button">
        Grid
      </button>
      <button className="btn btn-pill" type="button">
        Maze
      </button>
    </nav>
  </header>
)
