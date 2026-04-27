import { useState } from 'react'
import './App.css'

type GraphNode = {
  id: string
  label: string
  x: number
  y: number
}

const CANVAS_SIZE = { width: 720, height: 420 }

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])

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
      <header className="header">
        <h1>DSA Visualizer Sandbox</h1>
        <p>Step 1: create nodes. Drag, edges, and algorithms come next.</p>
      </header>

      <div className="toolbar">
        <button type="button" onClick={addNode}>
          Add node
        </button>
        <span className="meta">{nodes.length} nodes</span>
      </div>

      <div
        className="canvas"
        style={{ width: CANVAS_SIZE.width, height: CANVAS_SIZE.height }}
      >
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
    </div>
  )
}

export default App