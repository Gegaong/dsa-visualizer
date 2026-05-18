import {
  useCallback,
  useRef,
  useState,
} from 'react'
import './App.css'

import type {
  GraphNode,
  ContextMenuState,
  GraphEdge,
  GraphPreset,
} from './types'

import {
  NODE_SIZE,
  NODE_RADIUS,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  CANVAS_ZOOM_MIN,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_STEP,
} from './utils/constants'

import { GraphCanvas } from './components/GraphCanvas'
import { Header } from './components/Header'
import { ConfirmModal } from './components/Modals'
import { NodeContextMenu } from './components/NodeContextMenu'
import { Sidebar } from './components/sidebar/Sidebar'
import type { AlgorithmMode, SidebarPage } from './components/sidebar/sidebarTypes'

import {
  sanitizeNumericInput,
  parseNumberInput,
  getRandomIntInclusive,
  reindexNodes,
} from './utils/format'
import {
  canCreateEdge,
  getNextAllowedEdgeDirection,
} from './utils/graphRules'
import { clampToRange, getVisibleCanvasRegion, isOverlapping } from './utils/geometry'
import { buildPresetGraph } from './utils/presets'

import type { TraversalStrategy } from './algorithms/algorithmstypes'

import { useTraversalPlayback } from './hooks/useTraversalPlayback'
import { useConnectedComponentsPlayback } from './hooks/useConnectedComponentsPlayback'
import { useCycleDetectionPlayback } from './hooks/useCycleDetectionPlayback'
import { useShortestPathPlayback } from './hooks/useShortestPathPlayback'
import { useBipartitePlayback } from './hooks/useBipartitePlayback'
import { useNodeDragging } from './hooks/useNodeDragging'

// Root component: owns all graph and algorithm state, wires hooks, renders layout.
function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [fillMin, setFillMin] = useState('1')
  const [fillMax, setFillMax] = useState('10')
  const [showEmptyAllConfirm, setShowEmptyAllConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPresetConfirm, setShowPresetConfirm] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<GraphPreset | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [isDeleteEdgeMode, setIsDeleteEdgeMode] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [newEdgeDirection, setNewEdgeDirection] = useState<GraphEdge['direction']>('both')
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [isUndirectedMode, setIsUndirectedMode] = useState(false)
  const [algorithmTab, setAlgorithmTab] = useState<TraversalStrategy>('bfs')

  // useRef instead of useState: changing nextId doesn't trigger a re-render
  const nextId = useRef(1)
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null)

  // `.canvas-content` fills the canvas and is scaled by `canvasZoom` about its center,
  // so converting a screen point back to content space inverts that center-anchored scale.
  const getCanvasPointerPosition = useCallback(
    (clientX: number, clientY: number, canvasBounds: DOMRect) => {
      const centerX = canvasBounds.width / 2
      const centerY = canvasBounds.height / 2
      const pointerX = clientX - canvasBounds.left
      const pointerY = clientY - canvasBounds.top
      return {
        x: centerX + (pointerX - centerX) / canvasZoom,
        y: centerY + (pointerY - centerY) / canvasZoom,
      }
    },
    [canvasZoom],
  )

  // Edges used by algorithms: all directions overridden to 'both' in undirected mode.
  // The real edges state is never mutated so directions survive toggling back to directed.
  const effectiveEdges = isUndirectedMode
    ? edges.map((edge) => ({ ...edge, direction: 'both' as const }))
    : edges

  const traversal = useTraversalPlayback({
    nodes,
    edges: effectiveEdges,
    algorithmTab,
    onClearOtherGraphAlgorithms: () => {
      cc.clearConnectedComponentsAlgorithmStateOnly()
      cycleDetection.clearCycleDetectionAlgorithmStateOnly()
    },
  })

  const traversalVisualSetters = {
    setTraversalVisitedNodeIds: traversal.setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds: traversal.setTraversalVisitedEdgeIds,
    setTraversalCurrentNodeId: traversal.setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId: traversal.setTraversalCurrentEdgeId,
    setTraversalStartNodeId: traversal.setTraversalStartNodeId,
    setTraversalGoalNodeIds: traversal.setTraversalGoalNodeIds,
  }

  const cc = useConnectedComponentsPlayback({
    nodes,
    edges: effectiveEdges,
    isUndirectedMode,
    traversalVisualSetters,
    onResetTraversal: () => traversal.resetTraversalVisualization(),
  })

  const cycleDetection = useCycleDetectionPlayback({
    nodes,
    edges: effectiveEdges,
    isUndirectedMode,
    traversalVisualSetters,
    onResetTraversal: () => traversal.resetTraversalVisualization(),
  })

  const shortestPath = useShortestPathPlayback({
    nodes,
    edges: effectiveEdges,
    traversalVisualSetters,
    onResetTraversal: () => traversal.resetTraversalVisualization(),
  })

  const bipartite = useBipartitePlayback({
    nodes,
    edges: effectiveEdges,
    isUndirectedMode,
    traversalVisualSetters,
    onResetTraversal: () => traversal.resetTraversalVisualization(),
  })

  // Forwards the sidebar algorithm picker to all canvas-algorithm hooks so their refs stay in sync.
  const handleAlgorithmModeChange = useCallback((mode: AlgorithmMode) => {
    cc.handleAlgorithmModeChangeFromSidebar(mode)
    cycleDetection.handleAlgorithmModeChangeFromSidebar(mode)
    shortestPath.handleAlgorithmModeChangeFromSidebar(mode)
    bipartite.handleAlgorithmModeChangeFromSidebar(mode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cc.handleAlgorithmModeChangeFromSidebar, cycleDetection.handleAlgorithmModeChangeFromSidebar, shortestPath.handleAlgorithmModeChangeFromSidebar, bipartite.handleAlgorithmModeChangeFromSidebar])

  const nodeDragging = useNodeDragging({
    canvasElement,
    canvasZoom,
    getCanvasPointerPosition,
    setNodes,
    editingNodeId,
    setEditingNodeId,
    draftValue,
    setDraftValue,
    isConnectMode,
    isDeleteMode,
    isDeleteEdgeMode,
  })

  const blockGraphInteraction =
    traversal.isTraversalRunning ||
    cc.isConnectedComponentsRunning ||
    cycleDetection.isCycleDetectionRunning ||
    shortestPath.isShortestPathRunning ||
    bipartite.isBipartiteRunning

  const ccSessionActive = cc.connectedComponentsResult !== null || cc.isConnectedComponentsRunning
  const cycleSessionActive =
    cycleDetection.cycleDetectionResult !== null || cycleDetection.isCycleDetectionRunning
  const shortestPathSessionActive =
    shortestPath.shortestPathResult !== null || shortestPath.isShortestPathRunning
  const bipartiteSessionActive =
    bipartite.bipartiteResult !== null || bipartite.isBipartiteRunning

  // Clears traversal, connected-components, cycle-detection, shortest-path, and bipartite playback and canvas highlights.
  const resetAllGraphAlgorithmVisualizations = useCallback(
    (idleAlgorithm: TraversalStrategy = algorithmTab) => {
      traversal.resetTraversalVisualization(idleAlgorithm)
      cc.resetConnectedComponentsVisualization()
      cycleDetection.resetCycleDetectionVisualization()
      shortestPath.resetShortestPathVisualization()
      bipartite.resetBipartiteVisualization()
    },
    [algorithmTab, traversal, cc, cycleDetection, shortestPath, bipartite],
  )

  // Toggles undirected mode; resets any active algorithm since the graph semantics change.
  const handleUndirectedModeToggle = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsUndirectedMode((prev) => !prev)
  }

  // Dismisses the node context menu without changing graph state.
  const closeContextMenu = () => setContextMenu(null)

  // Clamps a zoom level to the configured min/max range.
  const clampCanvasZoom = (value: number) =>
    Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, value))

  // Zooms the canvas in one step (toolbar control).
  const handleZoomIn = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev + CANVAS_ZOOM_STEP))
  }

  // Zooms the canvas out one step (toolbar control).
  const handleZoomOut = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev - CANVAS_ZOOM_STEP))
  }

  // Switches BFS/DFS traversal tab and resets traversal playback for the new strategy.
  const handleAlgorithmTabChange = (tab: TraversalStrategy) => {
    if (tab === algorithmTab) return
    setAlgorithmTab(tab)
    traversal.resetTraversalVisualization(tab)
  }

  // Replaces the graph with a preset layout and resets zoom, modes, and selection.
  const applyPreset = (preset: GraphPreset) => {
    const canvasBounds = canvasElement?.getBoundingClientRect()
    const canvasWidth = canvasBounds?.width ?? DEFAULT_CANVAS_WIDTH
    const canvasHeight = canvasBounds?.height ?? DEFAULT_CANVAS_HEIGHT

    const { nodes: presetNodes, edges: presetEdges, nextId: nextCounter } =
      buildPresetGraph(preset, canvasWidth, canvasHeight)

    // Presets are laid out for the unzoomed viewport; reset zoom so the whole graph fits.
    setCanvasZoom(1)
    setIsUndirectedMode(preset.undirected === true)
    nextId.current = nextCounter
    setNodes(reindexNodes(presetNodes))
    setEdges(presetEdges)
    cancelEditing()
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
    closeContextMenu()
  }

  // Removes one node, its incident edges, and any stale edge selection entries.
  const deleteNode = (nodeId: string) => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setNodes((prev) => reindexNodes(prev.filter((node) => node.id !== nodeId)))
    setEdges((prev) =>
      prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId),
    )
    setSelectedEdgeIds((prev) =>
      prev.filter(
        (edgeId) =>
          !edges.some(
            (edge) =>
              edge.id === edgeId &&
              (edge.fromNodeId === nodeId || edge.toNodeId === nodeId),
          ),
      ),
    )
  }

  // Deletes every selected node and edges touching those nodes, then reindexes labels.
  const deleteSelectedNodes = (nodeIds: string[]) => {
    if (blockGraphInteraction) return
    if (nodeIds.length === 0) return

    resetAllGraphAlgorithmVisualizations()
    const idSet = new Set(nodeIds)
    setNodes((prev) => reindexNodes(prev.filter((node) => !idSet.has(node.id))))
    setEdges((prev) =>
      prev.filter((edge) => !idSet.has(edge.fromNodeId) && !idSet.has(edge.toNodeId)),
    )
    setSelectedEdgeIds((prev) =>
      prev.filter(
        (edgeId) =>
          !edges.some(
            (edge) =>
              edge.id === edgeId &&
              (idSet.has(edge.fromNodeId) || idSet.has(edge.toNodeId)),
          ),
      ),
    )
  }

  // Deletes every edge whose id is in the given list.
  const deleteSelectedEdges = (edgeIds: string[]) => {
    if (blockGraphInteraction) return
    if (edgeIds.length === 0) return

    resetAllGraphAlgorithmVisualizations()
    const idSet = new Set(edgeIds)
    setEdges((prev) => prev.filter((edge) => !idSet.has(edge.id)))
  }

  // Toggles whether a node is in the multi-select set used by delete-node mode.
  const toggleNodeSelection = (nodeId: string) => {
    if (blockGraphInteraction) return
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  // Clears the node multi-selection.
  const clearSelection = () => setSelectedNodeIds([])

  // Toggles whether an edge is selected for delete-edge mode.
  const toggleEdgeSelection = (edgeId: string) => {
    if (blockGraphInteraction) return
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId],
    )
  }

  // Clears edge selection used by delete-edge mode.
  const clearEdgeSelection = () => setSelectedEdgeIds([])

  // Turns off connect/delete modes and clears selections (e.g. before starting an algorithm run).
  const exitCanvasInteractionModes = () => {
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
  }

  // Runs BFS/DFS goal traversal after leaving canvas edit modes.
  const handleRunTraversalFromSidebar = () => {
    exitCanvasInteractionModes()
    traversal.runTraversalFromSidebar()
  }

  // Runs connected-components after leaving canvas edit modes.
  const handleRunConnectedComponentsFromSidebar = (strategy: TraversalStrategy) => {
    exitCanvasInteractionModes()
    cc.runConnectedComponentsFromSidebar(strategy)
  }

  // Runs cycle detection after leaving canvas edit modes.
  const handleRunCycleDetectionFromSidebar = (strategy: TraversalStrategy) => {
    exitCanvasInteractionModes()
    cycleDetection.runCycleDetectionFromSidebar(strategy)
  }

  // Runs shortest path after leaving canvas edit modes.
  const handleRunShortestPathFromSidebar = (strategy: TraversalStrategy) => {
    exitCanvasInteractionModes()
    shortestPath.runShortestPathFromSidebar(strategy)
  }

  // Runs bipartite check after leaving canvas edit modes.
  const handleRunBipartiteFromSidebar = (strategy: TraversalStrategy) => {
    exitCanvasInteractionModes()
    bipartite.runBipartiteFromSidebar(strategy)
  }

  // Activates delete-node mode and clears conflicting modes and menus.
  const enterDeleteMode = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsConnectMode(false)
    setConnectionSource(null)
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
    setIsDeleteMode(true)
    clearSelection()
    closeContextMenu()
  }

  // Activates delete-edge mode and clears conflicting modes and menus.
  const enterDeleteEdgeMode = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsConnectMode(false)
    setConnectionSource(null)
    setIsDeleteMode(false)
    clearSelection()
    setIsDeleteEdgeMode(true)
    clearEdgeSelection()
    closeContextMenu()
  }

  // Activates connect mode so the user can click two nodes to create an edge.
  const enterConnectMode = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    clearSelection()
    clearEdgeSelection()
    setIsConnectMode(true)
    setConnectionSource(null)
    setNewEdgeDirection('both')
    closeContextMenu()
  }

  // Leaves delete-node mode and clears the node selection.
  const exitDeleteMode = () => {
    if (blockGraphInteraction) return
    setIsDeleteMode(false)
    clearSelection()
  }

  // Leaves delete-edge mode and clears edge selection.
  const exitDeleteEdgeMode = () => {
    if (blockGraphInteraction) return
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
  }

  // Opens inline value editing for a node and exits canvas modes that conflict with typing.
  const beginEditingNode = (node: GraphNode) => {
    if (blockGraphInteraction) return
    if (editingNodeId === node.id) return

    if (editingNodeId && editingNodeId !== node.id) {
      commitNodeValue(editingNodeId, draftValue)
    }

    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
    setEditingNodeId(node.id)
    setDraftValue(typeof node.value === 'number' ? String(node.value) : '')
  }

  // Places a new node on the canvas when clicking empty space in place mode.
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isConnectMode) return
    if (blockGraphInteraction) return
    if (nodeDragging.consumeSuppressedCanvasClick()) return

    if (contextMenu) closeContextMenu()
    if (isDeleteMode || isDeleteEdgeMode || isConnectMode) return

    const rect = event.currentTarget.getBoundingClientRect()
    const pointer = getCanvasPointerPosition(event.clientX, event.clientY, rect)
    const region = getVisibleCanvasRegion(rect.width, rect.height, canvasZoom)
    const clampedX = clampToRange(pointer.x - NODE_RADIUS, region.left, region.right - NODE_SIZE)
    const clampedY = clampToRange(pointer.y - NODE_RADIUS, region.top, region.bottom - NODE_SIZE)

    setNodes((prev) => {
      if (isOverlapping(clampedX, clampedY, prev)) return prev

      const newNode: GraphNode = {
        id: `node-${nextId.current}`,
        label: '',
        value: 'empty',
        x: clampedX,
        y: clampedY,
      }

      nextId.current += 1
      return reindexNodes([...prev, newNode])
    })
  }

  // Suppresses the default context menu on the canvas background.
  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (blockGraphInteraction) return
    event.preventDefault()
    closeContextMenu()
  }

  // Starts inline value editing for a node from the canvas (not used while delete-node mode is on).
  const startEditingNode = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (blockGraphInteraction) return
    if (isDeleteMode) return
    if (nodeDragging.consumeSuppressedNodeClick()) return

    event.stopPropagation()
    beginEditingNode(node)
  }

  // Opens the node context menu at a clamped screen position.
  const handleNodeContextMenu = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (blockGraphInteraction) return
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 220
    const menuHeight = 160
    const padding = 12
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)

    setContextMenu({ nodeId: node.id, x, y })
  }

  // Updates the draft string while editing a node value in the floating input.
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (blockGraphInteraction) return
    setDraftValue(sanitizeNumericInput(event.target.value))
  }

  // Sidebar: updates the fill-range minimum (digits only).
  const handleFillMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMin(sanitizeNumericInput(event.target.value))
  }

  // Sidebar: updates the fill-range maximum (digits only).
  const handleFillMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMax(sanitizeNumericInput(event.target.value))
  }

  // If min exceeds max after parsing, snaps max up to min so the fill range stays valid.
  const syncFillRange = () => {
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)
    if (minValue !== null && maxValue !== null && maxValue < minValue) {
      setFillMax(String(minValue))
    }
  }

  // Sidebar: on Enter in fill min/max fields, normalizes order and blurs the active input.
  const handleFillRangeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      syncFillRange()
      event.currentTarget.blur()
    }
  }

  // Writes a parsed numeric value (or empty) to a node and closes the inline editor.
  const commitNodeValue = (nodeId: string, rawValue: string) => {
    if (blockGraphInteraction) return
    const parsed = parseNumberInput(rawValue)
    const newValue: number | 'empty' = parsed !== null ? parsed : 'empty'

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, value: newValue } : node,
      ),
    )

    setEditingNodeId(null)
    setDraftValue('')
  }

  // Closes inline editing without saving the draft.
  const cancelEditing = () => {
    setEditingNodeId(null)
    setDraftValue('')
  }

  // Sidebar: assigns random integers in the fill range to every node that is still empty.
  const fillEmptyValues = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)
    if (minValue === null || maxValue === null) return

    const low = Math.min(minValue, maxValue)
    const high = Math.max(minValue, maxValue)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === 'empty' ? { ...node, value: getRandomIntInclusive(low, high) } : node,
      ),
    )
    cancelEditing()
  }

  // Sidebar: opens the confirm dialog before emptying every node's value.
  const handleEmptyAllClick = () => {
    if (blockGraphInteraction) return
    if (nodes.every((node) => node.value === 'empty')) return
    setShowEmptyAllConfirm(true)
  }

  // Confirms empty-all: sets every node's value to empty and closes the modal.
  const confirmEmptyAll = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setNodes((prev) => prev.map((node): GraphNode => ({ ...node, value: 'empty' })))
    cancelEditing()
    setShowEmptyAllConfirm(false)
  }

  // Cancels the empty-all confirmation without changing nodes.
  const cancelEmptyAll = () => setShowEmptyAllConfirm(false)

  // Inline editor: Enter commits; Escape cancels without saving.
  const handleValueKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, nodeId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitNodeValue(nodeId, event.currentTarget.value)
    }
    if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  // Toolbar: asks for confirmation before clearing every node and edge.
  const handleClearCanvas = () => {
    if (blockGraphInteraction) return
    if (nodes.length === 0) return
    setShowClearConfirm(true)
  }

  // Confirms clear-canvas: wipes graph state, resets id counter, and exits edit modes.
  const confirmClearCanvas = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    nextId.current = 1
    setNodes([])
    setEdges([])
    cancelEditing()
    setShowClearConfirm(false)
    closeContextMenu()
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
  }

  // Cancels clear-canvas confirmation without removing nodes.
  const cancelClearCanvas = () => setShowClearConfirm(false)

  // Sidebar: loads a preset immediately if the canvas is empty; otherwise asks to replace.
  const handlePresetClick = (preset: GraphPreset) => {
    if (blockGraphInteraction) return
    if (nodes.length === 0) {
      applyPreset(preset)
      return
    }
    setPendingPreset(preset)
    setShowPresetConfirm(true)
  }

  // Confirms preset replace: applies the pending preset and closes the modal.
  const confirmPresetReplace = () => {
    if (blockGraphInteraction) return
    if (!pendingPreset) {
      setShowPresetConfirm(false)
      return
    }
    resetAllGraphAlgorithmVisualizations()
    applyPreset(pendingPreset)
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  // Cancels preset replace and discards the pending preset choice.
  const cancelPresetReplace = () => {
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  // Connect mode: creates a new edge if the pair is allowed, otherwise no-ops.
  const createEdge = (fromId: string, toId: string, direction: GraphEdge['direction']) => {
    if (blockGraphInteraction) return
    if (!canCreateEdge(edges, fromId, toId)) return

    resetAllGraphAlgorithmVisualizations()
    const newEdge: GraphEdge = {
      id: `edge-${nextId.current}`,
      fromNodeId: fromId,
      toNodeId: toId,
      direction,
    }
    nextId.current += 1
    setEdges((prev) => [...prev, newEdge])
  }

  // Cycles an edge's direction state (forward / both / backward) on the canvas pill.
  const toggleEdgeDirection = (edgeId: string) => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== edgeId) return edge
        return { ...edge, direction: getNextAllowedEdgeDirection(edge) }
      }),
    )
  }

  // Connect mode: picks the first endpoint, then creates an edge on the second click.
  const handleConnectNodeClick = (nodeId: string) => {
    if (blockGraphInteraction) return
    if (!connectionSource) {
      setConnectionSource(nodeId)
    } else {
      createEdge(connectionSource, nodeId, newEdgeDirection)
      setConnectionSource(null)
    }
  }

  // Exits connect mode and clears the in-progress connection source.
  const cancelConnection = () => {
    if (blockGraphInteraction) return
    setIsConnectMode(false)
    setConnectionSource(null)
  }

  // Toolbar: toggles delete-node mode; when turning off, deletes selected nodes if any.
  const handleDeleteModeToggle = () => {
    if (blockGraphInteraction) return
    if (isDeleteMode) {
      if (selectedNodeIds.length > 0) {
        deleteSelectedNodes(selectedNodeIds)
        setIsDeleteMode(false)
        clearSelection()
        return
      }
      exitDeleteMode()
      return
    }
    enterDeleteMode()
  }

  // Toolbar: toggles delete-edge mode; when turning off, deletes selected edges if any.
  const handleDeleteEdgeModeToggle = () => {
    if (blockGraphInteraction) return
    if (isDeleteEdgeMode) {
      if (selectedEdgeIds.length > 0) {
        deleteSelectedEdges(selectedEdgeIds)
        setIsDeleteEdgeMode(false)
        clearEdgeSelection()
        return
      }
      exitDeleteEdgeMode()
      return
    }
    enterDeleteEdgeMode()
  }

  // Toolbar: toggles connect mode on or off (off uses cancelConnection).
  const handleConnectModeToggle = () => {
    if (blockGraphInteraction) return
    if (isConnectMode) {
      cancelConnection()
      return
    }
    enterConnectMode()
  }

  // Toolbar: updates the direction used for the next edge created in connect mode.
  const handleNewEdgeDirectionChange = (direction: GraphEdge['direction']) => {
    if (blockGraphInteraction) return
    setNewEdgeDirection(direction)
  }

  // When leaving Traversal or Algorithms sidebar tabs, resets the corresponding canvas algorithms.
  const handleSidebarSectionChange = useCallback(
    ({ from, to }: { from: SidebarPage; to: SidebarPage }) => {
      if (from === 'traversal' && to !== 'traversal') {
        traversal.resetTraversalVisualization()
      }
      if (from === 'algorithms' && to !== 'algorithms') {
        cc.resetConnectedComponentsVisualization()
        cycleDetection.resetCycleDetectionVisualization()
        shortestPath.resetShortestPathVisualization()
        bipartite.resetBipartiteVisualization()
      }
    },
    [traversal, cc, cycleDetection, shortestPath, bipartite],
  )

  const hasEmptyNodes = nodes.some((node) => node.value === 'empty')
  const hasNonEmptyNodes = nodes.some((node) => node.value !== 'empty')
  const fillRangeReady = parseNumberInput(fillMin) !== null && parseNumberInput(fillMax) !== null
  const canFillEmpty = hasEmptyNodes && fillRangeReady
  const canEmptyAll = hasNonEmptyNodes

  return (
    <div className="app">
      <Header />

      <div className="workspace">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          isConnectMode={isConnectMode}
          isDeleteMode={isDeleteMode}
          isDeleteEdgeMode={isDeleteEdgeMode}
          blockGraphInteraction={blockGraphInteraction}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeIds={selectedEdgeIds}
          connectionSource={connectionSource}
          newEdgeDirection={newEdgeDirection}
          canvasZoom={canvasZoom}
          editingNodeId={editingNodeId}
          draftValue={draftValue}
          draggingNodeId={nodeDragging.draggingNodeId}
          traversalVisitedNodeIds={traversal.traversalVisitedNodeIds}
          traversalVisitedEdgeIds={traversal.traversalVisitedEdgeIds}
          traversalCurrentNodeId={traversal.traversalCurrentNodeId}
          traversalCurrentEdgeId={traversal.traversalCurrentEdgeId}
          traversalStartNodeId={traversal.traversalStartNodeId}
          traversalGoalNodeIds={traversal.traversalGoalNodeIds}
          weakCCOutlineHslByNodeId={cc.weakCCOutlineHslByNodeId}
          weakCCOutlineActive={cc.weakCCOutlineActive}
          weakCCVisitedNodeIds={cc.weakCCVisitedNodeIds}
          weakCCVisitedEdgeIds={cc.weakCCVisitedEdgeIds}
          bipartiteGroupANodeIds={bipartite.bipartiteGroupANodeIds}
          bipartiteGroupBNodeIds={bipartite.bipartiteGroupBNodeIds}
          cycleGoalEdgeIds={cycleDetection.cycleGoalEdgeIds}
          shortestPathEdgeIds={shortestPath.shortestPathEdgeIds}
          shortestPathNodeIds={shortestPath.shortestPathNodeIds}
          onCanvasRef={setCanvasElement}
          onCanvasClick={handleCanvasClick}
          onCanvasContextMenu={handleCanvasContextMenu}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onConnectModeToggle={handleConnectModeToggle}
          onDeleteModeToggle={handleDeleteModeToggle}
          onDeleteEdgeModeToggle={handleDeleteEdgeModeToggle}
          onClearCanvas={handleClearCanvas}
          onNewEdgeDirectionChange={handleNewEdgeDirectionChange}
          onNodeMouseDown={nodeDragging.handleNodeMouseDown}
          onConnectNodeClick={handleConnectNodeClick}
          onToggleNodeSelection={toggleNodeSelection}
          onStartEditingNode={startEditingNode}
          onNodeContextMenu={handleNodeContextMenu}
          onValueChange={handleValueChange}
          onValueKeyDown={handleValueKeyDown}
          onCommitNodeValue={commitNodeValue}
          onToggleEdgeSelection={toggleEdgeSelection}
          onToggleEdgeDirection={toggleEdgeDirection}
          isUndirectedMode={isUndirectedMode}
          onUndirectedModeToggle={handleUndirectedModeToggle}
        />

        <Sidebar
          onSidebarSectionChange={handleSidebarSectionChange}
          canvasSetup={{
            blockGraphEdits: blockGraphInteraction,
            fillMin,
            fillMax,
            onFillMinChange: handleFillMinChange,
            onFillMaxChange: handleFillMaxChange,
            onFillRangeBlur: syncFillRange,
            onFillRangeKeyDown: handleFillRangeKeyDown,
            onFillEmptyValues: fillEmptyValues,
            canFillEmpty,

            onEmptyAllValues: handleEmptyAllClick,
            canEmptyAll,
            onPresetClick: handlePresetClick,
          }}
          traversal={{
            blockGraphEdits: blockGraphInteraction,
            isTraversalRunning: traversal.isTraversalRunning,
            isConnectedComponentsSessionActive: ccSessionActive,
            isCycleDetectionSessionActive: cycleSessionActive,
            isShortestPathSessionActive: shortestPathSessionActive,
            isBipartiteSessionActive: bipartiteSessionActive,
            algorithmTab,
            onAlgorithmTabChange: handleAlgorithmTabChange,
            goalType: traversal.goalType,
            onGoalTypeChange: traversal.handleGoalTypeChange,
            startNodeLabel: traversal.startNodeLabel,
            onStartNodeLabelChange: traversal.handleStartNodeLabelChange,
            goalNodeLabel: traversal.goalNodeLabel,
            onGoalNodeLabelChange: traversal.handleGoalNodeLabelChange,
            goalValueInput: traversal.goalValueInput,
            onGoalValueInputChange: traversal.handleGoalValueInputChange,
            onRunTraversal: handleRunTraversalFromSidebar,
            onStopTraversal: traversal.resetTraversalVisualization,
            canRunTraversal: traversal.canRunTraversal,
            traversalStatusText: traversal.sidebarTraversalStatusText,
            isTraversalPlaying: traversal.isPlaying,
            traversalPlaybackSpeed: traversal.playbackSpeed,
            onTraversalPlaybackSpeedChange: traversal.handleTraversalPlaybackSpeedChange,
            onPlayTraversal: traversal.playTraversal,
            onPauseTraversal: traversal.pauseTraversal,
            onNextTraversalStep: traversal.stepTraversalForward,
            onPreviousTraversalStep: traversal.stepTraversalBackward,
            canStepForward: traversal.canStepForward,
            canStepBackward: traversal.canStepBackward,
            canTogglePlay: traversal.canTogglePlay,
            isTraversalPlaybackComplete: traversal.isPlaybackComplete,
          }}
          algorithms={{
            blockGraphEdits: blockGraphInteraction,
            isTraversalRunning: traversal.isTraversalRunning,
            isConnectedComponentsSessionActive: ccSessionActive,
            isCycleDetectionSessionActive: cycleSessionActive,
            isShortestPathSessionActive: shortestPathSessionActive,
            isUndirectedMode,
            onAlgorithmModeChange: handleAlgorithmModeChange,
            isBipartiteSessionActive: bipartiteSessionActive,
            onRunConnectedComponents: handleRunConnectedComponentsFromSidebar,
            onStopConnectedComponents: cc.resetConnectedComponentsVisualization,
            canRunConnectedComponents: cc.canRunConnectedComponents,
            connectedComponentsStatusText: cc.connectedComponentsStatusText,
            isConnectedComponentsPlaybackPlaying: cc.isPlaying,
            connectedComponentsPlaybackSpeed: cc.playbackSpeed,
            onConnectedComponentsPlaybackSpeedChange: cc.handleConnectedComponentsPlaybackSpeedChange,
            onPlayConnectedComponents: cc.playConnectedComponents,
            onPauseConnectedComponents: cc.pauseConnectedComponents,
            onNextConnectedComponentsStep: cc.stepConnectedComponentsForward,
            onPreviousConnectedComponentsStep: cc.stepConnectedComponentsBackward,
            canConnectedComponentsStepForward: cc.canStepForward,
            canConnectedComponentsStepBackward: cc.canStepBackward,
            canConnectedComponentsTogglePlay: cc.canTogglePlay,
            isConnectedComponentsPlaybackComplete: cc.isPlaybackComplete,
            connectedComponentsOutput: cc.ccOutput,
            connectedComponentsStepIndex: cc.stepIndex,
            connectedComponentsStepTotal: cc.connectedComponentsResult?.steps.length ?? 0,
            onRunCycleDetection: handleRunCycleDetectionFromSidebar,
            onStopCycleDetection: cycleDetection.resetCycleDetectionVisualization,
            canRunCycleDetection: cycleDetection.canRunCycleDetection,
            cycleDetectionStatusText: cycleDetection.cycleDetectionStatusText,
            isCycleDetectionPlaybackPlaying: cycleDetection.isPlaying,
            cycleDetectionPlaybackSpeed: cycleDetection.playbackSpeed,
            onCycleDetectionPlaybackSpeedChange: cycleDetection.handleCycleDetectionPlaybackSpeedChange,
            onPlayCycleDetection: cycleDetection.playCycleDetection,
            onPauseCycleDetection: cycleDetection.pauseCycleDetection,
            onNextCycleDetectionStep: cycleDetection.stepCycleDetectionForward,
            onPreviousCycleDetectionStep: cycleDetection.stepCycleDetectionBackward,
            canCycleDetectionStepForward: cycleDetection.canStepForward,
            canCycleDetectionStepBackward: cycleDetection.canStepBackward,
            canCycleDetectionTogglePlay: cycleDetection.canTogglePlay,
            isCycleDetectionPlaybackComplete: cycleDetection.isPlaybackComplete,
            cycleDetectionOutput: cycleDetection.cycleOutput,
            cycleDetectionStepIndex: cycleDetection.stepIndex,
            cycleDetectionStepTotal: cycleDetection.cycleDetectionResult?.steps.length ?? 0,
            onRunShortestPath: handleRunShortestPathFromSidebar,
            onStopShortestPath: shortestPath.resetShortestPathVisualization,
            canRunShortestPath: shortestPath.canRunShortestPath,
            shortestPathStatusText: shortestPath.shortestPathStatusText,
            isShortestPathPlaybackPlaying: shortestPath.isPlaying,
            shortestPathPlaybackSpeed: shortestPath.playbackSpeed,
            onShortestPathPlaybackSpeedChange: shortestPath.handleShortestPathPlaybackSpeedChange,
            onPlayShortestPath: shortestPath.playShortestPath,
            onPauseShortestPath: shortestPath.pauseShortestPath,
            onNextShortestPathStep: shortestPath.stepShortestPathForward,
            onPreviousShortestPathStep: shortestPath.stepShortestPathBackward,
            canShortestPathStepForward: shortestPath.canStepForward,
            canShortestPathStepBackward: shortestPath.canStepBackward,
            canShortestPathTogglePlay: shortestPath.canTogglePlay,
            isShortestPathPlaybackComplete: shortestPath.isPlaybackComplete,
            shortestPathOutput: shortestPath.shortestPathOutput,
            shortestPathStepIndex: shortestPath.stepIndex,
            shortestPathStepTotal: shortestPath.shortestPathResult?.steps.length ?? 0,
            shortestPathStartNodeLabel: shortestPath.startNodeLabel,
            shortestPathGoalNodeLabel: shortestPath.goalNodeLabel,
            onShortestPathStartNodeLabelChange: shortestPath.handleStartNodeLabelChange,
            onShortestPathGoalNodeLabelChange: shortestPath.handleGoalNodeLabelChange,
            onRunBipartite: handleRunBipartiteFromSidebar,
            onStopBipartite: bipartite.resetBipartiteVisualization,
            canRunBipartite: bipartite.canRunBipartite,
            bipartiteStatusText: bipartite.bipartiteStatusText,
            isBipartitePlaybackPlaying: bipartite.isPlaying,
            bipartitePlaybackSpeed: bipartite.playbackSpeed,
            onBipartitePlaybackSpeedChange: bipartite.handleBipartitePlaybackSpeedChange,
            onPlayBipartite: bipartite.playBipartite,
            onPauseBipartite: bipartite.pauseBipartite,
            onNextBipartiteStep: bipartite.stepBipartiteForward,
            onPreviousBipartiteStep: bipartite.stepBipartiteBackward,
            canBipartiteStepForward: bipartite.canStepForward,
            canBipartiteStepBackward: bipartite.canStepBackward,
            canBipartiteTogglePlay: bipartite.canTogglePlay,
            isBipartitePlaybackComplete: bipartite.isPlaybackComplete,
            bipartiteOutput: bipartite.bipartiteOutput,
            bipartiteStepIndex: bipartite.stepIndex,
            bipartiteStepTotal: bipartite.bipartiteResult?.steps.length ?? 0,
          }}
        />
      </div>

      <ConfirmModal
        open={showClearConfirm}
        title="Clear canvas?"
        body="This will remove all nodes from the canvas."
        confirmLabel="Clear"
        onConfirm={confirmClearCanvas}
        onCancel={cancelClearCanvas}
      />

      {pendingPreset && (
        <ConfirmModal
          open={showPresetConfirm}
          title="Replace canvas with preset?"
          body={`This will clear the current canvas and load "${pendingPreset.name}".`}
          confirmLabel="Replace"
          onConfirm={confirmPresetReplace}
          onCancel={cancelPresetReplace}
        />
      )}

      <ConfirmModal
        open={showEmptyAllConfirm}
        title="Empty all values?"
        body="This resets every node back to empty, wiping any numbers and nulls."
        confirmLabel="Empty all"
        onConfirm={confirmEmptyAll}
        onCancel={cancelEmptyAll}
      />

      <NodeContextMenu
        contextMenu={contextMenu}
        nodes={nodes}
        isDeleteMode={isDeleteMode}
        onClose={closeContextMenu}
        onEditValue={beginEditingNode}
        onDelete={deleteNode}
      />
    </div>
  )
}

export default App
