import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

import type {
  GraphNode,
  GoalType,
  ContextMenuState,
  GraphEdge,
  GraphPreset,
  DragState,
} from './types'

import {
  buildWeakCCOutlineHSLByNodeId,
  type WeakCCOutlineHSL,
} from './utils/weakCCOutlineHues'
import {
  NODE_SIZE,
  NODE_RADIUS,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DRAG_THRESHOLD,
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
} from './utils/constants'

import { useStepPlayback } from './hooks/useStepPlayback'

import {
  isOverlapping,
  clampToRange,
  resolveDragPosition,
} from './utils/geometry'

import { buildPresetGraph } from './utils/presets'

import { DirectionIcon } from './components/DirectionIcon'
import { EdgesLayer } from './components/EdgesLayer'
import { EdgeToggles } from './components/EdgeToggles'
import { GraphNodeLayer } from './components/NodesLayer'
import { Header } from './components/Header'
import { ConfirmModal } from './components/Modals'
import { NodeContextMenu } from './components/NodeContextMenu'
import {
  Sidebar,
  type AlgorithmMode,
  type SidebarPage,
} from './components/Sidebar'

import {
  sanitizeNumericInput,
  parseNumberInput,
  getRandomIntInclusive,
  reindexNodes,
} from './utils/format'
import {
  canCreateEdge,
  getNextAllowedEdgeDirection,
  sanitizeEdgesForNullNodes,
} from './utils/graphRules'
import { runBfs } from './algorithms/bfs'
import { runDfs } from './algorithms/dfs'
import type { BfsResult, ConnectedComponentsResult, TraversalStrategy } from './algorithms/types'
import { runConnectedComponents } from './algorithms/connectedComponents'
import {
  buildConnectedComponentsCompletionStatus,
  formatWeakCCGroupsDisplay,
} from './algorithms/connectedComponentsUIHelpers'
import { buildTraversalCompletionStatus, prepareTraversalRunInputs } from './algorithms/traversalUIHelpers'

function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

// Root component for the DSA visualizer workspace.
function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [goalValueInput, setGoalValueInput] = useState('')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('') // Temporary input value during inline editing
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
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [newEdgeDirection, setNewEdgeDirection] = useState<GraphEdge['direction']>('both')
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [algorithmTab, setAlgorithmTab] = useState<TraversalStrategy>('bfs')
  const [traversalVisitedNodeIds, setTraversalVisitedNodeIds] = useState<string[]>([])
  const [traversalCurrentNodeId, setTraversalCurrentNodeId] = useState<string | null>(null)
  const [traversalStartNodeId, setTraversalStartNodeId] = useState<string | null>(null)
  const [traversalGoalNodeIds, setTraversalGoalNodeIds] = useState<string[]>([])
  const [traversalStatusText, setTraversalStatusText] = useState('Enter start and goal, then run the selected algorithm.')
  const [isTraversalRunning, setIsTraversalRunning] = useState(false)
  const [traversalResult, setTraversalResult] = useState<BfsResult | null>(null)
  const traversalResultRef = useRef<BfsResult | null>(null)
  const finalizeTraversalRunRef = useRef<(r: BfsResult) => void>(() => {})
  const traversalPlaybackStopRef = useRef(() => {})
  const [traversalPlaybackSession, setTraversalPlaybackSession] = useState(0)

  const [connectedComponentsResult, setConnectedComponentsResult] =
    useState<ConnectedComponentsResult | null>(null)
  const connectedComponentsResultRef = useRef<ConnectedComponentsResult | null>(null)
  const connectedComponentsStrategyRef = useRef<TraversalStrategy>('bfs')
  const sidebarAlgorithmModeRef = useRef<AlgorithmMode>('components')
  const finalizeConnectedComponentsRunRef = useRef<(r: ConnectedComponentsResult) => void>(() => {})
  const connectedComponentsPlaybackStopRef = useRef(() => {})
  const [connectedComponentsPlaybackSession, setConnectedComponentsPlaybackSession] = useState(0)
  const [isConnectedComponentsRunning, setIsConnectedComponentsRunning] = useState(false)
  const [connectedComponentsStatusText, setConnectedComponentsStatusText] = useState(
    'Select BFS or DFS, then run weakly connected components.',
  )
  const [weakCCOutlineHslByNodeId, setWeakCCOutlineHslByNodeId] = useState<Map<
    string,
    WeakCCOutlineHSL
  > | null>(null)

  useEffect(() => {
    traversalResultRef.current = traversalResult
  }, [traversalResult])

  useEffect(() => {
    connectedComponentsResultRef.current = connectedComponentsResult
  }, [connectedComponentsResult])

  const blockGraphInteraction = isTraversalRunning || isConnectedComponentsRunning

  const applyTraversalStepIndex = (result: BfsResult, index: number) => {
    const algoName = bfsDfsLabel(algorithmTab)
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
      return
    }

    const boundedIndex = Math.min(index, result.steps.length - 1)
    const currentStep = result.steps[boundedIndex]
    const visitedIds = result.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)

    setTraversalCurrentNodeId(currentStep.nodeId)
    setTraversalVisitedNodeIds(visitedIds)
    setTraversalStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length})`,
    )
  }

  const traversalPlayback = useStepPlayback({
    stepCount: traversalResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: traversalPlaybackSession,
    onStepIndexChange: (index) => {
      const r = traversalResultRef.current
      if (!r) return
      applyTraversalStepIndex(r, index)
    },
    onComplete: () => {
      const r = traversalResultRef.current
      if (r) finalizeTraversalRunRef.current(r)
    },
  })

  useEffect(() => {
    finalizeTraversalRunRef.current = (result: BfsResult) => {
      traversalPlayback.stopPlayback()
      setTraversalCurrentNodeId(null)

      if (!result.foundNodeLabel) {
        setTraversalStatusText('Done. Goal not found in reachable nodes.')
        return
      }

      if (result.foundNodeIds.length > 0) {
        setTraversalGoalNodeIds(result.foundNodeIds)
      }
      setTraversalStatusText(buildTraversalCompletionStatus(result, nodes))
    }
  }, [algorithmTab, nodes, traversalPlayback])

  useEffect(() => {
    traversalPlaybackStopRef.current = () => traversalPlayback.stopPlayback()
  }, [traversalPlayback])

  const applyConnectedComponentsStepIndex = (result: ConnectedComponentsResult, index: number) => {
    const strategyLabel = bfsDfsLabel(connectedComponentsStrategyRef.current)
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setConnectedComponentsStatusText(
        `Weakly connected components (${strategyLabel}) ready. Press Play or step through manually.`,
      )
      return
    }

    const boundedIndex = Math.min(index, result.steps.length - 1)
    const currentStep = result.steps[boundedIndex]
    const visitedIds = result.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)

    setTraversalCurrentNodeId(currentStep.nodeId)
    setTraversalVisitedNodeIds(visitedIds)
    setTraversalStartNodeId(currentStep.componentRootNodeId)
    setConnectedComponentsStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
    )
  }

  const connectedComponentsPlayback = useStepPlayback({
    stepCount: connectedComponentsResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: connectedComponentsPlaybackSession,
    onStepIndexChange: (index) => {
      const r = connectedComponentsResultRef.current
      if (!r) return
      applyConnectedComponentsStepIndex(r, index)
    },
    onComplete: () => {
      const r = connectedComponentsResultRef.current
      if (r) finalizeConnectedComponentsRunRef.current(r)
    },
  })

  const weakCCOutlineActive =
    connectedComponentsResult !== null && connectedComponentsPlayback.stepIndex >= 0

  useEffect(() => {
    finalizeConnectedComponentsRunRef.current = (result: ConnectedComponentsResult) => {
      connectedComponentsPlayback.stopPlayback()
      setTraversalCurrentNodeId(null)
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setConnectedComponentsStatusText(buildConnectedComponentsCompletionStatus(result, nodes))
    }
  }, [connectedComponentsPlayback, nodes])

  useEffect(() => {
    connectedComponentsPlaybackStopRef.current = () => connectedComponentsPlayback.stopPlayback()
  }, [connectedComponentsPlayback])

  // useRef instead of useState: changing nextId doesn't trigger a re-render (we only use it for ID generation)
  const nextId = useRef(1)
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const suppressCanvasClickRef = useRef(false)
  const CANVAS_ZOOM_MIN = 0.5
  const CANVAS_ZOOM_MAX = 2
  const CANVAS_ZOOM_STEP = 0.1

  // Hide the node right-click menu.
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Keep zoom values inside the supported range.
  const clampCanvasZoom = (value: number) => {
    return Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, value))
  }

  // Convert client coordinates into canvas-space coordinates for the current zoom level.
  const getCanvasPointerPosition = useCallback(
    (clientX: number, clientY: number, canvasBounds: DOMRect) => {
      const centerX = canvasBounds.width / 2
      const centerY = canvasBounds.height / 2
      const pointerX = clientX - canvasBounds.left
      const pointerY = clientY - canvasBounds.top

      return {
        x: (pointerX - (1 - canvasZoom) * centerX) / canvasZoom,
        y: (pointerY - (1 - canvasZoom) * centerY) / canvasZoom,
      }
    },
    [canvasZoom],
  )

  // Increase zoom by one step.
  const handleZoomIn = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev + CANVAS_ZOOM_STEP))
  }

  // Decrease zoom by one step.
  const handleZoomOut = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev - CANVAS_ZOOM_STEP))
  }

  // Stop BFS/DFS playback and clear traversal highlights / traversal-specific UI state only.
  const resetTraversalVisualization = useCallback(
    (idleAlgorithm: TraversalStrategy = algorithmTab) => {
      traversalPlaybackStopRef.current()
      setTraversalVisitedNodeIds([])
      setTraversalCurrentNodeId(null)
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setTraversalResult(null)
      setTraversalPlaybackSession((s) => s + 1)
      const algoName = bfsDfsLabel(idleAlgorithm)
      setTraversalStatusText(`Enter start and goal, then run ${algoName}.`)
      setIsTraversalRunning(false)
    },
    [algorithmTab],
  )

  const clearConnectedComponentsPlaybackAndResult = useCallback(() => {
    connectedComponentsPlaybackStopRef.current()
    setConnectedComponentsResult(null)
    setConnectedComponentsPlaybackSession((s) => s + 1)
  }, [])

  const resetConnectedComponentsVisualization = useCallback(() => {
    clearConnectedComponentsPlaybackAndResult()
    setTraversalVisitedNodeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setConnectedComponentsStatusText('Select BFS or DFS, then run weakly connected components.')
    setIsConnectedComponentsRunning(false)
    setWeakCCOutlineHslByNodeId(null)
  }, [clearConnectedComponentsPlaybackAndResult])

  // Full reset for graph edits / presets: compose traversal + connected-components resets.
  const resetAllGraphAlgorithmVisualizations = useCallback(
    (idleAlgorithm: TraversalStrategy = algorithmTab) => {
      resetTraversalVisualization(idleAlgorithm)
      resetConnectedComponentsVisualization()
    },
    [algorithmTab, resetTraversalVisualization, resetConnectedComponentsVisualization],
  )

  const clearConnectedComponentsAlgorithmStateOnly = () => {
    clearConnectedComponentsPlaybackAndResult()
    setIsConnectedComponentsRunning(false)
    setWeakCCOutlineHslByNodeId(null)
  }

  // Switch BFS/DFS in the sidebar; stops the current traversal run and clears canvas highlights.
  const handleAlgorithmTabChange = (tab: TraversalStrategy) => {
    if (tab === algorithmTab) return
    setAlgorithmTab(tab)
    resetTraversalVisualization(tab)
  }

  // Replace the current graph with a centered preset.
  // Also resets every mode (connect/delete/edit) and clears all selections,
  // since the old node/edge IDs no longer exist after the swap.
  const applyPreset = (preset: GraphPreset) => {
    const canvasBounds = canvasElement?.getBoundingClientRect()
    const canvasWidth = canvasBounds?.width ?? DEFAULT_CANVAS_WIDTH
    const canvasHeight = canvasBounds?.height ?? DEFAULT_CANVAS_HEIGHT

    const { nodes: presetNodes, edges: presetEdges, nextId: nextCounter } =
      buildPresetGraph(preset, canvasWidth, canvasHeight)

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

  // Delete a single node and all its connected edges, then recalculate node labels.
  const deleteNode = (nodeId: string) => {
    if (blockGraphInteraction) return // Block graph edits while a traversal run is active.
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

  // Delete multiple nodes at once (used in delete mode) and clean up their edges.
  const deleteSelectedNodes = (nodeIds: string[]) => {
    if (blockGraphInteraction) return
    if (nodeIds.length === 0) {
      return
    }

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

  // Delete the given edges from the canvas.
  // Block edits while a traversal run is active (same guard as other graph mutators).
  const deleteSelectedEdges = (edgeIds: string[]) => {
    if (blockGraphInteraction) return
    if (edgeIds.length === 0) {
      return
    }

    resetAllGraphAlgorithmVisualizations()
    const idSet = new Set(edgeIds)
    setEdges((prev) => prev.filter((edge) => !idSet.has(edge.id)))
  }

  // NOTE: Edge deletion workflow
  // - `isDeleteEdgeMode` toggles a special interaction mode where edges are selectable for deletion.
  // - We keep the visible edge line and its arrow markers unchanged to avoid resizing markers
  //   (marker sizes are tied to the visual line width in SVG). Instead, selection is
  //   indicated with an overlaid badge and a soft halo line so arrowheads never rescale.

  // Toggle a node's selected state for delete mode (add or remove from selection list).
  const toggleNodeSelection = (nodeId: string) => {
    if (blockGraphInteraction) return
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  // Clear the node-selection list (used in delete-node mode).
  const clearSelection = () => {
    setSelectedNodeIds([])
  }

  // Toggle an edge in the delete-edge selection.
  const toggleEdgeSelection = (edgeId: string) => {
    if (blockGraphInteraction) return
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId],
    )
  }

  // Clear the edge-selection list (used in delete-edge mode).
  const clearEdgeSelection = () => {
    setSelectedEdgeIds([])
  }

  // Mode management: Connect and Delete are mutually exclusive.
  // When entering one mode, we automatically exit the other and clean up.
  const enterDeleteMode = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsConnectMode(false) // Exit connect mode first
    setConnectionSource(null)
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
    setIsDeleteMode(true)
    clearSelection()
    closeContextMenu()
  }

  // Switch into delete-edge mode (turns off other modes first).
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

  // Switch into connect mode (turns off other modes first).
  const enterConnectMode = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setIsDeleteMode(false) // Exit delete mode first
    setIsDeleteEdgeMode(false)
    clearSelection()
    clearEdgeSelection()
    setIsConnectMode(true)
    setConnectionSource(null)
    setNewEdgeDirection('both')
    closeContextMenu()
  }

  // Leave delete-node mode and clear its selection.
  const exitDeleteMode = () => {
    if (blockGraphInteraction) return
    setIsDeleteMode(false)
    clearSelection()
  }

  // Leave delete-edge mode and clear its selection.
  const exitDeleteEdgeMode = () => {
    if (blockGraphInteraction) return
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
  }

  // Enter inline-editing mode for a node's value. Cancel any active modes and prep the input field.
  // If a different node is already being edited, commit its draft first — clicking
  // straight from one node into another would otherwise silently drop the typed value
  // (the input unmounts before React fires onBlur).
  const beginEditingNode = (node: GraphNode) => {
    if (blockGraphInteraction) return
    if (editingNodeId === node.id) {
      return
    }

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

  // Add a new node at the click position.
  // Skipped if any mode is active (connect/delete) or if this click came
  // immediately after a drag (the suppress flag is set in handleMouseUp).
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (blockGraphInteraction) return
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false
      return
    }

    if (contextMenu) {
      closeContextMenu()
    }

    if (isDeleteMode || isDeleteEdgeMode || isConnectMode) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const pointer = getCanvasPointerPosition(event.clientX, event.clientY, rect)
    const rawX = pointer.x
    const rawY = pointer.y
    const clampedX = Math.min(Math.max(0, rawX - NODE_RADIUS), rect.width - NODE_SIZE)
    const clampedY = Math.min(Math.max(0, rawY - NODE_RADIUS), rect.height - NODE_SIZE)

    setNodes((prev) => {
      if (isOverlapping(clampedX, clampedY, prev)) {
        return prev
      }

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

  // Block the browser's default right-click menu and close any open custom menus.
  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (blockGraphInteraction) return
    event.preventDefault()
    closeContextMenu()
  }

  // Start editing a node when clicked (unless in delete mode).
  const startEditingNode = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (blockGraphInteraction) return
    if (isDeleteMode) {
      return
    }

    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    event.stopPropagation()
    beginEditingNode(node)
  }

  // Begin a *potential* drag on a node.
  // We don't commit to "this is a drag" yet — we just stash the pointer offset.
  // The window-level mousemove listener decides if the pointer moves far enough
  // (DRAG_THRESHOLD pixels) to count as a drag instead of a click.
  const handleNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (event.button !== 0) {
      return
    }

    // While editing this node, swallow shell clicks so the input doesn't blur
    // when the user clicks near the edge of the circle.
    if (editingNodeId === node.id) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (isConnectMode || isDeleteMode || isDeleteEdgeMode) {
      return
    }

    const canvasElement = event.currentTarget.closest('.canvas') as HTMLDivElement | null
    const canvasBounds = canvasElement?.getBoundingClientRect()

    if (!canvasBounds) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    closeContextMenu()

    // If another node is being edited, commit it immediately when dragging starts.
    if (editingNodeId !== null && editingNodeId !== node.id) {
      const nodeId = editingNodeId
      const normalizedValue = parseNumberInput(draftValue)
      setNodes((prev) =>
        prev.map((currentNode) =>
          currentNode.id === nodeId ? { ...currentNode, value: normalizedValue } : currentNode,
        ),
      )
      setEditingNodeId(null)
      setDraftValue('')
    }

    const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
    dragStateRef.current = {
      nodeId: node.id,
      offsetX: pointer.x - node.x,
      offsetY: pointer.y - node.y,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      hasMoved: false,
    }
    setDraggingNodeId(node.id)
  }

  // Open a context menu for a node's right-click. Clamp menu position to stay on-screen.
  const handleNodeContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    node: GraphNode,
  ) => {
    if (blockGraphInteraction) return
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 220
    const menuHeight = 160
    const padding = 12
    // Prevent menu from flowing off-screen by shifting it left/up if needed
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)

    setContextMenu({ nodeId: node.id, x, y })
  }

  // Window-level mouse listeners that drive the node-dragging system.
  // We attach to window (not the canvas) so a drag survives even when the
  // cursor leaves the canvas area mid-drag.
  useEffect(() => {
    // Move the dragged node once the pointer has crossed the drag threshold.
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const canvasBounds = canvasElement?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const pointerX = pointer.x
      const pointerY = pointer.y
      const deltaX = pointerX - dragState.startPointerX
      const deltaY = pointerY - dragState.startPointerY
      const distance = Math.hypot(deltaX, deltaY)

      if (!dragState.hasMoved && distance < DRAG_THRESHOLD) {
        return
      }

      if (!dragState.hasMoved) {
        dragState.hasMoved = true
      }

      const nextX = clampToRange(
        pointerX - dragState.offsetX,
        0,
        canvasBounds.width - NODE_SIZE,
      )
      const nextY = clampToRange(
        pointerY - dragState.offsetY,
        0,
        canvasBounds.height - NODE_SIZE,
      )

      setNodes((prev) =>
        prev.map((node) =>
          node.id === dragState.nodeId
            ? {
              ...node,
              x: nextX,
              y: nextY,
            }
            : node,
        ),
      )
    }

    // Finish the drag.
    // resolveDragPosition pushes the node away from neighbors so the minimum
    // spacing is preserved. The suppress flags prevent the trailing click
    // from being interpreted as "place a new node" or "start editing".
    const handleMouseUp = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      dragStateRef.current = null
      setDraggingNodeId(null)

      if (!dragState.hasMoved) {
        return
      }

      suppressClickRef.current = true
      suppressCanvasClickRef.current = true

      const canvasBounds = canvasElement?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const pointerX = pointer.x
      const pointerY = pointer.y
      const targetX = pointerX - dragState.offsetX
      const targetY = pointerY - dragState.offsetY

      setNodes((prev) => {
        const resolved = resolveDragPosition(
          targetX,
          targetY,
          dragState.nodeId,
          prev,
          canvasBounds.width,
          canvasBounds.height,
        )

        return prev.map((node) =>
          node.id === dragState.nodeId
            ? {
              ...node,
              x: resolved.x,
              y: resolved.y,
            }
            : node,
        )
      })

      setEditingNodeId(null)
      setDraftValue('')
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [canvasElement, getCanvasPointerPosition])

  // Filter input to an optional leading minus sign and digits only.
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (blockGraphInteraction) return
    setDraftValue(sanitizeNumericInput(event.target.value))
  }

  // Sanitize the minimum-fill input as the user types.
  const handleFillMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMin(sanitizeNumericInput(event.target.value))
  }

  // Sanitize the maximum-fill input as the user types.
  const handleFillMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMax(sanitizeNumericInput(event.target.value))
  }

  // Enforce max >= min after the user finishes editing.
  const syncFillRange = () => {
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)

    if (minValue !== null && maxValue !== null && maxValue < minValue) {
      setFillMax(String(minValue))
    }
  }

  // Treat Enter as "done editing" for the fill range inputs.
  const handleFillRangeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      syncFillRange()
      event.currentTarget.blur()
    }
  }

  // Finalize node value from the latest input value to avoid stale state during fast typing.
  const commitNodeValue = (nodeId: string, rawValue: string) => {
    if (blockGraphInteraction) return
    const normalizedValue = parseNumberInput(rawValue)

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
            ...node,
            value: normalizedValue,
          }
          : node,
      ),
    )

    setEditingNodeId(null)
    setDraftValue('')

    if (normalizedValue === null) {
      setEdges((prev) => sanitizeEdgesForNullNodes(prev, [nodeId]))
    }
  }

  // Close edit mode without saving changes to the node value.
  const cancelEditing = () => {
    setEditingNodeId(null)
    setDraftValue('')
  }

  // Replace empty node values with inclusive random integers in the provided range.
  const fillEmptyValues = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)

    if (minValue === null || maxValue === null) {
      return
    }

    const low = Math.min(minValue, maxValue)
    const high = Math.max(minValue, maxValue)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === 'empty'
          ? {
            ...node,
            value: getRandomIntInclusive(low, high),
          }
          : node,
      ),
    )
    cancelEditing()
  }

  // Convert every empty node to null. No confirmation — this leaves user-entered
  // numbers untouched, so it's non-destructive.
  const nullifyEmptyValues = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    const nullifiedNodeIds = nodes
      .filter((node) => node.value === 'empty')
      .map((node) => node.id)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === 'empty'
          ? { ...node, value: null }
          : node,
      ),
    )

    if (nullifiedNodeIds.length > 0) {
      setEdges((prev) => sanitizeEdgesForNullNodes(prev, nullifiedNodeIds))
    }
  }

  // Ask before resetting every node back to empty — this *can* wipe user-entered numbers.
  const handleEmptyAllClick = () => {
    if (blockGraphInteraction) return
    if (nodes.every((node) => node.value === 'empty')) {
      return
    }

    setShowEmptyAllConfirm(true)
  }

  // Reset every node to the 'empty' state.
  const confirmEmptyAll = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setNodes((prev) =>
     prev.map((node): GraphNode => ({
        ...node,
        value: 'empty',
      })),
    )
    cancelEditing()
    setShowEmptyAllConfirm(false)
  }

  // Close the empty-all confirmation without resetting.
  const cancelEmptyAll = () => {
    setShowEmptyAllConfirm(false)
  }

  // Keyboard shortcuts for inline editing: Enter to save, Escape to cancel.
  const handleValueKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    nodeId: string,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitNodeValue(nodeId, event.currentTarget.value)
    }

    if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  // Show confirmation dialog before clearing the entire canvas (only if there are nodes).
  const handleClearCanvas = () => {
    if (blockGraphInteraction) return
    if (nodes.length === 0) {
      return
    }

    setShowClearConfirm(true)
  }

  // Confirm clearing: reset everything to initial state and clean up all UI.
  const confirmClearCanvas = () => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    nextId.current = 1 // Reset ID counter for future node creation
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

  // Close the clear-canvas confirmation without clearing.
  const cancelClearCanvas = () => {
    setShowClearConfirm(false)
  }

  // Load a preset, but ask first if there's already a graph on the canvas.
  const handlePresetClick = (preset: GraphPreset) => {
    if (blockGraphInteraction) return
    // If there's already a graph, confirm before replacing it.
    if (nodes.length === 0) {
      applyPreset(preset)
      return
    }

    setPendingPreset(preset)
    setShowPresetConfirm(true)
  }

  // Apply the pending preset and close the confirmation.
  const confirmPresetReplace = () => {
    if (blockGraphInteraction) return
    // Apply the pending preset and close the confirmation modal.
    if (!pendingPreset) {
      setShowPresetConfirm(false)
      return
    }

    resetAllGraphAlgorithmVisualizations()
    applyPreset(pendingPreset)
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  // Close the preset-replace confirmation without replacing.
  const cancelPresetReplace = () => {
    // Dismiss the preset confirmation without changing the canvas.
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  // Create an edge between two nodes with validation to prevent duplicates and self-loops.
  const createEdge = (fromId: string, toId: string, direction: GraphEdge['direction']) => {
    if (blockGraphInteraction) return
    if (!canCreateEdge(nodes, edges, fromId, toId, direction)) {
      return
    }

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

  // Cycle through edge directions: both-ways → one-way → reverse → both-ways (repeat)
  const toggleEdgeDirection = (edgeId: string) => {
    if (blockGraphInteraction) return
    resetAllGraphAlgorithmVisualizations()
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== edgeId) return edge
        const nextDirection = getNextAllowedEdgeDirection(edge, nodes)

        return {
          ...edge,
          direction: nextDirection,
        }
      }),
    )
  }

  // Two-stage connection: first click selects source, second click selects target and creates edge.
  const handleConnectNodeClick = (nodeId: string) => {
    if (blockGraphInteraction) return
    if (!connectionSource) {
      // First click: remember which node we're connecting from
      setConnectionSource(nodeId)
    } else {
      // Second click: create edge from source to target, then reset
      createEdge(connectionSource, nodeId, newEdgeDirection)
      setConnectionSource(null)
    }
  }

  // Leave connect mode and forget the chosen source node.
  const cancelConnection = () => {
    if (blockGraphInteraction) return
    setIsConnectMode(false)
    setConnectionSource(null)
  }

  // Delete button behavior: if already in delete mode with selections, delete them; otherwise toggle the mode.
  const handleDeleteModeToggle = () => {
    if (blockGraphInteraction) return
    if (isDeleteMode) {
      if (selectedNodeIds.length > 0) {
        // Delete the selected nodes and exit delete mode
        deleteSelectedNodes(selectedNodeIds)
        setIsDeleteMode(false)
        clearSelection()
        return
      }

      // No selections, so just cancel delete mode
      exitDeleteMode()
      return
    }

    // Not in delete mode, so enter it
    enterDeleteMode()
  }

  // Edge-delete button: delete the selection if any, otherwise toggle the mode.
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

  // Connect button behavior: toggle connect mode on/off.
  const handleConnectModeToggle = () => {
    if (blockGraphInteraction) return
    if (isConnectMode) {
      // Already connecting, so cancel and reset
      cancelConnection()
      return
    }

    // Not connecting, so enter connect mode
    enterConnectMode()
  }

  // Set the direction used for new edges created in connect mode.
  const handleNewEdgeDirectionChange = (direction: GraphEdge['direction']) => {
    if (blockGraphInteraction) return
    setNewEdgeDirection(direction)
  }

  // Normalize goal-dependent inputs whenever the goal mode changes.
  const handleGoalTypeChange = (type: GoalType) => {
    resetAllGraphAlgorithmVisualizations()
    setGoalType(type)
    setGoalNodeLabel('')
    setGoalValueInput('')
  }

  // Clear old traversal highlights when the user starts changing algorithm inputs.
  const handleStartNodeLabelChange = (value: string) => {
    resetAllGraphAlgorithmVisualizations()
    setStartNodeLabel(value.toUpperCase())
  }

  // Clear old traversal highlights when the user edits target-node input.
  const handleGoalNodeLabelChange = (value: string) => {
    resetAllGraphAlgorithmVisualizations()
    setGoalNodeLabel(value.toUpperCase())
  }

  // Clear old traversal highlights when the user edits target-value input.
  const handleGoalValueInputChange = (value: string) => {
    resetAllGraphAlgorithmVisualizations()
    setGoalValueInput(sanitizeNumericInput(value))
  }

  const stepTraversalForward = () => {
    if (!traversalResult) return
    traversalPlayback.stepForward()
  }

  const stepTraversalBackward = () => {
    if (!traversalResult) return
    traversalPlayback.stepBackward()
    setIsTraversalRunning(true)
    setTraversalGoalNodeIds([])
  }

  const playTraversal = () => {
    if (!traversalResult) return
    const replayFromEnd =
      traversalPlayback.stepIndex >= traversalResult.steps.length - 1
    traversalPlayback.togglePlay()
    if (replayFromEnd) {
      setTraversalGoalNodeIds([])
      setIsTraversalRunning(true)
    }
  }

  const pauseTraversal = () => {
    traversalPlayback.stopPlayback()
  }

  const handleTraversalPlaybackSpeedChange = (value: number) => {
    traversalPlayback.setPlaybackSpeed(value)
  }

  // Validate sidebar inputs, run BFS or DFS, and prepare step playback on the canvas.
  const runTraversalFromSidebar = () => {
    if (traversalPlayback.isPlaying) return
    traversalPlaybackStopRef.current()
    clearConnectedComponentsAlgorithmStateOnly()
    setTraversalVisitedNodeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalGoalNodeIds([])

    const traversalSidebarInputs = {
      nodes,
      goalType,
      startNodeLabel,
      goalNodeLabel,
      goalValueInput,
    }

    const preparation = prepareTraversalRunInputs(algorithmTab, traversalSidebarInputs)

    if (preparation.ok === false) {
      setTraversalStatusText(preparation.error)
      return
    }
    setTraversalGoalNodeIds(preparation.initialGoalNodeIds)
    setTraversalStartNodeId(preparation.startNode.id)

    const runInput = {
      nodes,
      edges,
      startNodeLabel: preparation.startNode.label,
      goal: preparation.goal,
    }
    const algoName = bfsDfsLabel(algorithmTab)
    const result = algorithmTab === 'dfs' ? runDfs(runInput) : runBfs(runInput)

    if (result.steps.length === 0) {
      setTraversalStatusText(`${algoName} could not start with the current graph and inputs.`)
      return
    }

    setTraversalResult(result)
    setTraversalPlaybackSession((s) => s + 1)
    setIsTraversalRunning(true)
    setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
  }

  const hasEmptyNodes = nodes.some((node) => node.value === 'empty')
  const hasNonEmptyNodes = nodes.some((node) => node.value !== 'empty')
  const fillRangeReady =
    parseNumberInput(fillMin) !== null &&
    parseNumberInput(fillMax) !== null
  const canFillEmpty = hasEmptyNodes && fillRangeReady
  const canNullifyEmpty = hasEmptyNodes
  const canEmptyAll = hasNonEmptyNodes
  const canRunTraversal =
    nodes.length > 0 &&
    !hasEmptyNodes &&
    startNodeLabel.trim() !== '' &&
    (goalType !== 'target-node' || goalNodeLabel.trim() !== '') &&
    (goalType !== 'target-value' || parseNumberInput(goalValueInput) !== null)
  const canRunConnectedComponents = nodes.length > 0 && !hasEmptyNodes
  const canStepBackward = traversalResult !== null && traversalPlayback.canStepBackward
  const canStepForward = traversalResult !== null && traversalPlayback.canStepForward
  const canTogglePlay = traversalResult !== null && traversalPlayback.canTogglePlay
  const isTraversalPlaybackComplete =
    traversalResult !== null && traversalPlayback.isPlaybackComplete
  let sidebarTraversalStatusText = traversalStatusText
  const startNodeMissing = startNodeLabel.trim() === ''
  const goalNodeMissing = goalType === 'target-node' && goalNodeLabel.trim() === ''
  const goalValueMissing = goalType === 'target-value' && parseNumberInput(goalValueInput) === null
  if (startNodeMissing && goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal node are required fields.'
  } else if (startNodeMissing && goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal value are required fields.'
  } else if (startNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node is a required field.'
  } else if (goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Goal node is a required field.'
  } else if (goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Goal value is a required field.'
  } else if (hasEmptyNodes) {
    const algoName = bfsDfsLabel(algorithmTab)
    sidebarTraversalStatusText = `Warning: fill or nullify all empty nodes before running ${algoName}.`
  }

  const handleSidebarSectionChange = useCallback(
    ({ from, to }: { from: SidebarPage; to: SidebarPage }) => {
      if (from === 'traversal' && to !== 'traversal') {
        resetTraversalVisualization()
      }
      if (from === 'algorithms' && to !== 'algorithms') {
        resetConnectedComponentsVisualization()
      }
    },
    [resetTraversalVisualization, resetConnectedComponentsVisualization],
  )

  const handleAlgorithmModeChangeFromSidebar = useCallback(
    (mode: AlgorithmMode) => {
      const prev = sidebarAlgorithmModeRef.current
      sidebarAlgorithmModeRef.current = mode
      if (prev === mode) return
      const leavingComponents = prev === 'components' && mode !== 'components'
      const ccActive =
        connectedComponentsResult !== null || isConnectedComponentsRunning
      if (leavingComponents || ccActive) {
        resetConnectedComponentsVisualization()
      }
    },
    [
      connectedComponentsResult,
      isConnectedComponentsRunning,
      resetConnectedComponentsVisualization,
    ],
  )

  const runConnectedComponentsFromSidebar = (strategy: TraversalStrategy) => {
    if (connectedComponentsPlayback.isPlaying) return
    connectedComponentsPlaybackStopRef.current()
    resetTraversalVisualization()

    connectedComponentsStrategyRef.current = strategy

    if (nodes.length === 0) {
      setConnectedComponentsStatusText('Add nodes to the canvas first.')
      return
    }
    if (hasEmptyNodes) {
      setConnectedComponentsStatusText(
        'Fill or nullify all empty node values before running weakly connected components.',
      )
      return
    }

    const result = runConnectedComponents(nodes, edges, strategy)
    if (result.steps.length === 0) {
      setConnectedComponentsStatusText('Weakly connected components could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    setConnectedComponentsResult(result)
    setWeakCCOutlineHslByNodeId(buildWeakCCOutlineHSLByNodeId(result.components))
    setConnectedComponentsPlaybackSession((s) => s + 1)
    setIsConnectedComponentsRunning(true)
    setConnectedComponentsStatusText(
      `Weakly connected components (${strategyLabel}) ready. Press Play or step through manually.`,
    )
  }

  const stepConnectedComponentsForward = () => {
    if (!connectedComponentsResult) return
    connectedComponentsPlayback.stepForward()
  }

  const stepConnectedComponentsBackward = () => {
    if (!connectedComponentsResult) return
    connectedComponentsPlayback.stepBackward()
    setIsConnectedComponentsRunning(true)
    setTraversalGoalNodeIds([])
  }

  const playConnectedComponents = () => {
    if (!connectedComponentsResult) return
    const replayFromEnd =
      connectedComponentsPlayback.stepIndex >= connectedComponentsResult.steps.length - 1
    connectedComponentsPlayback.togglePlay()
    if (replayFromEnd) {
      setTraversalGoalNodeIds([])
      setIsConnectedComponentsRunning(true)
    }
  }

  const pauseConnectedComponents = () => {
    connectedComponentsPlayback.stopPlayback()
  }

  const handleConnectedComponentsPlaybackSpeedChange = (value: number) => {
    connectedComponentsPlayback.setPlaybackSpeed(value)
  }

  const canCcStepBackward =
    connectedComponentsResult !== null && connectedComponentsPlayback.canStepBackward
  const canCcStepForward =
    connectedComponentsResult !== null && connectedComponentsPlayback.canStepForward
  const canCcTogglePlay =
    connectedComponentsResult !== null && connectedComponentsPlayback.canTogglePlay
  const isCcPlaybackComplete =
    connectedComponentsResult !== null && connectedComponentsPlayback.isPlaybackComplete

  const ccOutput =
    connectedComponentsResult !== null
      ? {
          componentCount: connectedComponentsResult.componentCount,
          largestSize: connectedComponentsResult.largestComponentSize,
          groupsText: formatWeakCCGroupsDisplay(connectedComponentsResult, nodes),
        }
      : null

  return (
    <div className="app">
      <Header />

      <div className="workspace">
        <section className="canvas-panel">
          <div className="canvas-header">
            <div className="canvas-copy">
              <h2>Graph Canvas</h2>
              <p>Place nodes and edges, then pick an algorithm on the right.</p>
            </div>
            <div className="canvas-actions">
              <button
                className={`btn btn-pill connect-toggle-btn ${isConnectMode ? 'btn-active' : ''}`}
                type="button"
                onClick={handleConnectModeToggle}
                disabled={blockGraphInteraction}
              >
                {isConnectMode ? 'Cancel connect' : 'Connect nodes'}
              </button>
              <div className="edge-direction-picker" aria-label="New edge direction">
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'forward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || blockGraphInteraction}
                  aria-pressed={newEdgeDirection === 'forward'}
                  title="Create outbound edge (from selected node)"
                  onClick={() => handleNewEdgeDirectionChange('forward')}
                >
                  <DirectionIcon direction="forward" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'both' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || blockGraphInteraction}
                  aria-pressed={newEdgeDirection === 'both'}
                  title="Create bidirectional edge"
                  onClick={() => handleNewEdgeDirectionChange('both')}
                >
                  <DirectionIcon direction="both" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'backward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || blockGraphInteraction}
                  aria-pressed={newEdgeDirection === 'backward'}
                  title="Create inbound edge (toward selected node)"
                  onClick={() => handleNewEdgeDirectionChange('backward')}
                >
                  <DirectionIcon direction="backward" />
                </button>
              </div>
              <div className="delete-stack" role="group" aria-label="Delete controls">
                <button
                  className={`btn delete-stack-btn ${isDeleteMode ? 'btn-active' : ''}`}
                  type="button"
                  onClick={handleDeleteModeToggle}
                  disabled={blockGraphInteraction}
                >
                  {isDeleteMode
                    ? selectedNodeIds.length > 0
                      ? 'Delete selected nodes'
                      : 'Cancel node delete'
                    : 'Delete nodes'}
                </button>
                <button
                  className={`btn delete-stack-btn ${isDeleteEdgeMode ? 'btn-active' : ''}`}
                  type="button"
                  onClick={handleDeleteEdgeModeToggle}
                  disabled={blockGraphInteraction}
                >
                  {isDeleteEdgeMode
                    ? selectedEdgeIds.length > 0
                      ? 'Delete selected edges'
                      : 'Cancel edge delete'
                    : 'Delete edges'}
                </button>
              </div>
              <button className="btn btn-clear" type="button" onClick={handleClearCanvas} disabled={blockGraphInteraction}>
                Clear canvas
              </button>
            </div>
          </div>

          <div
            className={`canvas ${isConnectMode
              ? 'is-connect'
              : isDeleteMode || isDeleteEdgeMode
                ? 'is-select'
                : 'is-place'
              }`}
            ref={setCanvasElement}
            onClick={(e) => {
              if (!isConnectMode) {
                handleCanvasClick(e)
              }
            }}
            onContextMenu={handleCanvasContextMenu}
          >
            <div className="canvas-zoom-controls" onClick={(event) => event.stopPropagation()}>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={handleZoomOut}
                disabled={canvasZoom <= CANVAS_ZOOM_MIN}
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="canvas-zoom-value">{Math.round(canvasZoom * 100)}%</span>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={handleZoomIn}
                disabled={canvasZoom >= CANVAS_ZOOM_MAX}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            <div
              className="canvas-content"
              style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'center center' }}
            >
              <EdgesLayer
                nodes={nodes}
                edges={edges}
                isDeleteEdgeMode={isDeleteEdgeMode}
                selectedEdgeIds={selectedEdgeIds}
                onToggleEdgeSelection={toggleEdgeSelection}
              />

              <EdgeToggles
                nodes={nodes}
                edges={edges}
                isDeleteEdgeMode={isDeleteEdgeMode}
                selectedEdgeIds={selectedEdgeIds}
                onToggleEdgeDirection={toggleEdgeDirection}
                onToggleEdgeSelection={toggleEdgeSelection}
              />

              <GraphNodeLayer
                nodes={nodes}
                isConnectMode={isConnectMode}
                isDeleteMode={isDeleteMode}
                isDeleteEdgeMode={isDeleteEdgeMode}
                selectedNodeIds={selectedNodeIds}
                connectionSource={connectionSource}
                draggingNodeId={draggingNodeId}
                editingNodeId={editingNodeId}
                draftValue={draftValue}
                traversalVisitedNodeIds={traversalVisitedNodeIds}
                traversalCurrentNodeId={traversalCurrentNodeId}
                traversalStartNodeId={traversalStartNodeId}
                traversalGoalNodeIds={traversalGoalNodeIds}
                weakCCOutlineHslByNodeId={weakCCOutlineHslByNodeId}
                weakCCOutlineActive={weakCCOutlineActive}
                onNodeMouseDown={handleNodeMouseDown}
                onConnectNodeClick={handleConnectNodeClick}
                onToggleNodeSelection={toggleNodeSelection}
                onStartEditingNode={startEditingNode}
                onNodeContextMenu={handleNodeContextMenu}
                onValueChange={handleValueChange}
                onValueKeyDown={handleValueKeyDown}
                onCommitNodeValue={commitNodeValue}
              />
            </div>
          </div>
        </section>

        <Sidebar
          algorithmTab={algorithmTab}
          onAlgorithmTabChange={handleAlgorithmTabChange}
          goalType={goalType}
          onGoalTypeChange={handleGoalTypeChange}
          startNodeLabel={startNodeLabel}
          onStartNodeLabelChange={handleStartNodeLabelChange}
          goalNodeLabel={goalNodeLabel}
          onGoalNodeLabelChange={handleGoalNodeLabelChange}
          goalValueInput={goalValueInput}
          onGoalValueInputChange={handleGoalValueInputChange}
          onRunTraversal={runTraversalFromSidebar}
          onStopTraversal={resetTraversalVisualization}
          canRunTraversal={canRunTraversal}
          traversalStatusText={sidebarTraversalStatusText}
          isTraversalRunning={isTraversalRunning}
          blockGraphEdits={blockGraphInteraction}
          isTraversalPlaying={traversalPlayback.isPlaying}
          traversalPlaybackSpeed={traversalPlayback.playbackSpeed}
          onTraversalPlaybackSpeedChange={handleTraversalPlaybackSpeedChange}
          onPlayTraversal={playTraversal}
          onPauseTraversal={pauseTraversal}
          onNextTraversalStep={stepTraversalForward}
          onPreviousTraversalStep={stepTraversalBackward}
          canStepForward={canStepForward}
          canStepBackward={canStepBackward}
          canTogglePlay={canTogglePlay}
          isTraversalPlaybackComplete={isTraversalPlaybackComplete}
          fillMin={fillMin}
          fillMax={fillMax}
          onFillMinChange={handleFillMinChange}
          onFillMaxChange={handleFillMaxChange}
          onFillRangeBlur={syncFillRange}
          onFillRangeKeyDown={handleFillRangeKeyDown}
          onFillEmptyValues={fillEmptyValues}
          canFillEmpty={canFillEmpty}
          onNullifyEmptyValues={nullifyEmptyValues}
          canNullifyEmpty={canNullifyEmpty}
          onEmptyAllValues={handleEmptyAllClick}
          canEmptyAll={canEmptyAll}
          onPresetClick={handlePresetClick}
          onSidebarSectionChange={handleSidebarSectionChange}
          onAlgorithmModeChange={handleAlgorithmModeChangeFromSidebar}
          onRunConnectedComponents={runConnectedComponentsFromSidebar}
          onStopConnectedComponents={resetConnectedComponentsVisualization}
          canRunConnectedComponents={canRunConnectedComponents}
          connectedComponentsStatusText={connectedComponentsStatusText}
          isConnectedComponentsPlaybackPlaying={connectedComponentsPlayback.isPlaying}
          connectedComponentsPlaybackSpeed={connectedComponentsPlayback.playbackSpeed}
          onConnectedComponentsPlaybackSpeedChange={handleConnectedComponentsPlaybackSpeedChange}
          onPlayConnectedComponents={playConnectedComponents}
          onPauseConnectedComponents={pauseConnectedComponents}
          onNextConnectedComponentsStep={stepConnectedComponentsForward}
          onPreviousConnectedComponentsStep={stepConnectedComponentsBackward}
          canConnectedComponentsStepForward={canCcStepForward}
          canConnectedComponentsStepBackward={canCcStepBackward}
          canConnectedComponentsTogglePlay={canCcTogglePlay}
          isConnectedComponentsPlaybackComplete={isCcPlaybackComplete}
          connectedComponentsOutput={ccOutput}
          connectedComponentsStepIndex={connectedComponentsPlayback.stepIndex}
          connectedComponentsStepTotal={connectedComponentsResult?.steps.length ?? 0}
          isConnectedComponentsSessionActive={
            connectedComponentsResult !== null || isConnectedComponentsRunning
          }
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
          body={`This will clear the current canvas and load “${pendingPreset.name}”.`}
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