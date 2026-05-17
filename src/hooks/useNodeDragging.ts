import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  GraphNode,
  DragState,
} from '../types'

import {
  NODE_SIZE,
  DRAG_THRESHOLD,
} from '../utils/constants'

import {
  clampToRange,
  getVisibleCanvasRegion,
  resolveDragPosition,
} from '../utils/geometry'

import { parseNumberInput } from '../utils/format'

type UseNodeDraggingParams = {
  canvasElement: HTMLDivElement | null
  canvasZoom: number
  getCanvasPointerPosition: (clientX: number, clientY: number, canvasBounds: DOMRect) => { x: number; y: number }
  setNodes: React.Dispatch<React.SetStateAction<GraphNode[]>>
  editingNodeId: string | null
  setEditingNodeId: (id: string | null) => void
  draftValue: string
  setDraftValue: (v: string) => void
  isConnectMode: boolean
  isDeleteMode: boolean
  isDeleteEdgeMode: boolean
}

export type NodeDraggingHandle = {
  draggingNodeId: string | null
  handleNodeMouseDown: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void
  // Each returns true if the click that just fired was the trailing click of a drag
  // (in which case the caller should bail), and clears the flag.
  consumeSuppressedNodeClick: () => boolean
  consumeSuppressedCanvasClick: () => boolean
}

export function useNodeDragging({
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
}: UseNodeDraggingParams): NodeDraggingHandle {
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const suppressCanvasClickRef = useRef(false)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  const handleNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (event.button !== 0) return

    if (editingNodeId === node.id) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (isConnectMode || isDeleteMode || isDeleteEdgeMode) return

    const canvas = event.currentTarget.closest('.canvas') as HTMLDivElement | null
    const canvasBounds = canvas?.getBoundingClientRect()

    if (!canvasBounds) return

    event.preventDefault()
    event.stopPropagation()

    if (editingNodeId !== null && editingNodeId !== node.id) {
      const nodeId = editingNodeId
      const parsed = parseNumberInput(draftValue)
      const value: GraphNode['value'] = parsed !== null ? parsed : 'empty'
      setNodes((prev) =>
        prev.map((currentNode) =>
          currentNode.id === nodeId ? { ...currentNode, value } : currentNode,
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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const canvasBounds = canvasElement?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const deltaX = pointer.x - dragState.startPointerX
      const deltaY = pointer.y - dragState.startPointerY
      const distance = Math.hypot(deltaX, deltaY)

      if (!dragState.hasMoved && distance < DRAG_THRESHOLD) return

      if (!dragState.hasMoved) {
        dragState.hasMoved = true
      }

      const region = getVisibleCanvasRegion(canvasBounds.width, canvasBounds.height, canvasZoom)
      const nextX = clampToRange(pointer.x - dragState.offsetX, region.left, region.right - NODE_SIZE)
      const nextY = clampToRange(pointer.y - dragState.offsetY, region.top, region.bottom - NODE_SIZE)

      setNodes((prev) =>
        prev.map((node) =>
          node.id === dragState.nodeId ? { ...node, x: nextX, y: nextY } : node,
        ),
      )
    }

    const handleMouseUp = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      dragStateRef.current = null
      setDraggingNodeId(null)

      if (!dragState.hasMoved) return

      suppressClickRef.current = true
      suppressCanvasClickRef.current = true

      const canvasBounds = canvasElement?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const targetX = pointer.x - dragState.offsetX
      const targetY = pointer.y - dragState.offsetY
      const region = getVisibleCanvasRegion(canvasBounds.width, canvasBounds.height, canvasZoom)

      setNodes((prev) => {
        const resolved = resolveDragPosition(targetX, targetY, dragState.nodeId, prev, region)
        return prev.map((node) =>
          node.id === dragState.nodeId ? { ...node, x: resolved.x, y: resolved.y } : node,
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
  }, [canvasElement, canvasZoom, getCanvasPointerPosition, setNodes, setEditingNodeId, setDraftValue])

  return {
    draggingNodeId,
    handleNodeMouseDown,
    consumeSuppressedNodeClick: () => {
      if (!suppressClickRef.current) return false
      suppressClickRef.current = false
      return true
    },
    consumeSuppressedCanvasClick: () => {
      if (!suppressCanvasClickRef.current) return false
      suppressCanvasClickRef.current = false
      return true
    },
  }
}
