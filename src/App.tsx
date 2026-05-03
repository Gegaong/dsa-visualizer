import { useRef, useState } from 'react'
import './App.css'

type GraphNode = {
  id: string
  label: string
  value: number | null
  x: number
  y: number
}

type GoalType =
  | 'target-node'
  | 'target-value'
  | 'max-value'
  | 'min-value'

type ContextMenuState = {
  nodeId: string
  x: number
  y: number
}

const NODE_SIZE = 48
const NODE_RADIUS = NODE_SIZE / 2

const indexToLabel = (index: number) => {
  let label = ''
  let remaining = index + 1

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    remaining = Math.floor((remaining - 1) / 26)
  }

  return label
}

const reindexNodes = (list: GraphNode[]) =>
  list.map((node, index) => ({
    ...node,
    label: indexToLabel(index),
  }))

const formatNodeValue = (value: number | null) => {
  if (value === null) {
    return { text: '', sizeClass: '' }
  }

  const text = String(value)

  if (text.length <= 3) {
    return { text, sizeClass: '' }
  }

  if (text.length <= 5) {
    return { text, sizeClass: 'node-value--small' }
  }

  return { text: '...', sizeClass: 'node-value--tiny' }
}

const isOverlapping = (x: number, y: number, list: GraphNode[]) => {
  const newCenterX = x + NODE_RADIUS
  const newCenterY = y + NODE_RADIUS
  const minDistance = NODE_SIZE

  return list.some((node) => {
    const existingCenterX = node.x + NODE_RADIUS
    const existingCenterY = node.y + NODE_RADIUS
    const dx = existingCenterX - newCenterX
    const dy = existingCenterY - newCenterY

    return dx * dx + dy * dy < minDistance * minDistance
  })
}

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const nextId = useRef(1)

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => reindexNodes(prev.filter((node) => node.id !== nodeId)))
  }

  const deleteSelectedNodes = (nodeIds: string[]) => {
    if (nodeIds.length === 0) {
      return
    }

    const idSet = new Set(nodeIds)
    setNodes((prev) => reindexNodes(prev.filter((node) => !idSet.has(node.id))))
  }

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  const clearSelection = () => {
    setSelectedNodeIds([])
  }

  const beginEditingNode = (node: GraphNode) => {
    setIsDeleteMode(false)
    clearSelection()
    setEditingNodeId(node.id)
    setDraftValue(node.value === null ? '' : String(node.value))
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (contextMenu) {
      closeContextMenu()
    }

    if (isDeleteMode) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top
    const clampedX = Math.min(Math.max(0, rawX - NODE_RADIUS), rect.width - NODE_SIZE)
    const clampedY = Math.min(Math.max(0, rawY - NODE_RADIUS), rect.height - NODE_SIZE)

    setNodes((prev) => {
      if (isOverlapping(clampedX, clampedY, prev)) {
        return prev
      }

      const newNode: GraphNode = {
        id: `node-${nextId.current}`,
        label: '',
        value: null,
        x: clampedX,
        y: clampedY,
      }

      nextId.current += 1
      return reindexNodes([...prev, newNode])
    })
  }

  const startEditingNode = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (isDeleteMode) {
      return
    }

    event.stopPropagation()
    beginEditingNode(node)
  }

  const handleNodeContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    node: GraphNode,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 220
    const menuHeight = 160
    const padding = 12
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)

    setContextMenu({ nodeId: node.id, x, y })
  }

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/[^0-9]/g, '')
    setDraftValue(nextValue)
  }

  const commitNodeValue = (nodeId: string) => {
    const trimmed = draftValue.trim()
    const nextValue = trimmed === '' ? null : Number(trimmed)

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              value: nextValue,
            }
          : node,
      ),
    )

    setEditingNodeId(null)
    setDraftValue('')
  }

  const cancelEditing = () => {
    setEditingNodeId(null)
    setDraftValue('')
  }

  const handleValueKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    nodeId: string,
  ) => {
    if (event.key === 'Enter') {
      commitNodeValue(nodeId)
    }

    if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  const handleClearCanvas = () => {
    if (nodes.length === 0) {
      return
    }

    setShowClearConfirm(true)
  }

  const confirmClearCanvas = () => {
    nextId.current = 1
    setNodes([])
    cancelEditing()
    setShowClearConfirm(false)
    closeContextMenu()
    setIsDeleteMode(false)
    clearSelection()
  }

  const cancelClearCanvas = () => {
    setShowClearConfirm(false)
  }

  const handleDeleteAction = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true)
      clearSelection()
      closeContextMenu()
      return
    }

    if (selectedNodeIds.length === 0) {
      setIsDeleteMode(false)
      return
    }

    deleteSelectedNodes(selectedNodeIds)
    setIsDeleteMode(false)
    clearSelection()
  }

  const contextNode = contextMenu
    ? nodes.find((node) => node.id === contextMenu.nodeId) ?? null
    : null

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
              <p className="canvas-hint">
                {isDeleteMode
                  ? 'Select nodes below to delete, then press Delete selected.'
                  : 'Click on the canvas to place nodes.'}
              </p>
            </div>
            <div className="canvas-actions">
              <button className="btn btn-pill" type="button" onClick={handleDeleteAction}>
                {isDeleteMode
                  ? selectedNodeIds.length > 0
                    ? 'Delete selected'
                    : 'Cancel delete'
                  : 'Delete nodes'}
              </button>
              <button className="btn btn-clear" type="button" onClick={handleClearCanvas}>
                Clear canvas
              </button>
            </div>
          </div>

          <div
            className={`canvas ${isDeleteMode ? 'is-select' : 'is-place'}`}
            onClick={handleCanvasClick}
          >
            {nodes.map((node) => (
              (() => {
                const display = formatNodeValue(node.value)
                const valueClass = display.sizeClass
                  ? `node-value ${display.sizeClass}`
                  : 'node-value'
                const isSelected = selectedNodeIds.includes(node.id)
                const showHoverValue =
                  node.value !== null && String(node.value).length > 5

                return (
              <div
                key={node.id}
                className={`node-wrap ${isDeleteMode ? 'is-select' : ''} ${
                  isSelected ? 'is-selected' : ''
                }`}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
              >
                <div
                  className="node"
                  onClick={(event) => {
                    if (isDeleteMode) {
                      event.stopPropagation()
                      toggleNodeSelection(node.id)
                      return
                    }

                    startEditingNode(event, node)
                  }}
                  onContextMenu={
                    isDeleteMode ? undefined : (event) => handleNodeContextMenu(event, node)
                  }
                >
                  {editingNodeId === node.id ? (
                    <input
                      className="node-input"
                      inputMode="numeric"
                      value={draftValue}
                      onChange={handleValueChange}
                      onKeyDown={(event) => handleValueKeyDown(event, node.id)}
                      onBlur={() => commitNodeValue(node.id)}
                      autoFocus
                    />
                  ) : (
                    <span className={valueClass}>{display.text}</span>
                  )}
                  {isDeleteMode && <span className="node-select-indicator" />}
                </div>
                <span className="node-label">{node.label}</span>
                {showHoverValue && (
                  <span className="node-hover-value">{node.value}</span>
                )}
              </div>
                )
              })()
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
            {goalType === 'target-value' && (
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

      {showClearConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Clear canvas?</h3>
            <p>This will remove all nodes from the canvas.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={confirmClearCanvas}>
                Clear
              </button>
              <button className="btn" type="button" onClick={cancelClearCanvas}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && contextNode && (
        <div className="context-backdrop" onClick={closeContextMenu}>
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="context-header">
              <span className="context-title">Node {contextNode.label}</span>
              <span className="context-value">
                {contextNode.value === null ? 'Empty' : contextNode.value}
              </span>
            </div>
            {!isDeleteMode && (
              <>
                <button
                  className="context-action"
                  type="button"
                  onClick={() => {
                    beginEditingNode(contextNode)
                    closeContextMenu()
                  }}
                >
                  Edit value
                </button>
                <button
                  className="context-action context-action--danger"
                  type="button"
                  onClick={() => {
                    deleteNode(contextNode.id)
                    closeContextMenu()
                  }}
                >
                  Delete node
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App