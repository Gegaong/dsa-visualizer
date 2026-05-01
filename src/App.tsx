import { useState } from 'react'
import './App.css'

type GraphNode = {
  id: string
  label: string
  x: number
  y: number
}

type GoalType =
  | 'target-node'
  | 'target-value'
  | 'over-value'
  | 'under-value'
  | 'max-value'
  | 'min-value'

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')

  const addNode = () => {
    setNodes((prev) => {
      const nextIndex = prev.length + 1
      const col = (nextIndex - 1) % 6
      const row = Math.floor((nextIndex - 1) / 6)

      return [
        ...prev,
        {
          id: `n${nextIndex}`,
          label: `N${nextIndex}`,
          x: 24 + col * 110,
          y: 24 + row * 90,
        },
      ]
    })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-title">DSA Visualizer</span>
          <span className="brand-subtitle">Build structures, then run algorithms.</span>
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

      <div className="workspace">
        <section className="canvas-panel">
          <div className="canvas-header">
            <div>
              <h2>Graph Canvas</h2>
              <p>Place nodes and edges, then pick an algorithm on the right.</p>
            </div>
            <div className="canvas-actions">
              <button className="btn btn-primary" type="button" onClick={addNode}>
                Add node
              </button>
              <span className="meta">{nodes.length} nodes</span>
            </div>
          </div>

          <div className="canvas">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="node"
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
              >
                {node.label}
              </div>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Algorithm</h3>
            <div className="pill-group">
              <button className="btn btn-pill btn-active" type="button">
                BFS
              </button>
              <button className="btn btn-pill" type="button">
                DFS
              </button>
              <button className="btn btn-pill" type="button">
                Dijkstra
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Inputs</h3>
            <label className="field">
              <span>Start node</span>
              <input type="text" placeholder="A" />
            </label>
            <label className="field">
              <span>Goal type</span>
              <select
                value={goalType}
                onChange={(event) => setGoalType(event.target.value as GoalType)}
              >
                <option value="target-node">Target node</option>
                <option value="target-value">Target value</option>
                <option value="over-value">Over value</option>
                <option value="under-value">Under value</option>
                <option value="max-value">Find max value</option>
                <option value="min-value">Find min value</option>
              </select>
            </label>
            {goalType === 'target-node' && (
              <label className="field">
                <span>Goal node</span>
                <input type="text" placeholder="F" />
              </label>
            )}
            {(goalType === 'target-value' ||
              goalType === 'over-value' ||
              goalType === 'under-value') && (
              <label className="field">
                <span>Goal value</span>
                <input type="number" placeholder="10" />
              </label>
            )}
            {(goalType === 'max-value' || goalType === 'min-value') && (
              <p className="hint">No extra input needed for this goal.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Playback</h3>
            <div className="playback">
              <button className="btn btn-ghost" type="button">
                Play
              </button>
              <button className="btn btn-ghost" type="button">
                Pause
              </button>
              <button className="btn btn-ghost" type="button">
                Step
              </button>
            </div>
            <input className="slider" type="range" min="0" max="10" />
          </div>

          <div className="sidebar-section">
            <h3>Presets</h3>
            <button className="btn btn-ghost" type="button">
              Default graph
            </button>
            <button className="btn btn-ghost" type="button">
              Random small
            </button>
            <button className="btn btn-ghost" type="button">
              Random medium
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App