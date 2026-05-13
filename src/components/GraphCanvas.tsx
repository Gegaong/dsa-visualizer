import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
import type { GraphEdge, GraphNode } from '../types'
import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'
import { CANVAS_ZOOM_MIN, CANVAS_ZOOM_MAX } from '../utils/constants'
import { DirectionIcon } from './DirectionIcon'
import { EdgesLayer } from './EdgesLayer'
import { EdgeToggles } from './EdgeToggles'
import { GraphNodeLayer } from './NodesLayer'

type GraphCanvasProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isConnectMode: boolean
  isDeleteMode: boolean
  isDeleteEdgeMode: boolean
  blockGraphInteraction: boolean
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  connectionSource: string | null
  newEdgeDirection: GraphEdge['direction']
  canvasZoom: number
  editingNodeId: string | null
  draftValue: string
  draggingNodeId: string | null
  traversalVisitedNodeIds: string[]
  traversalCurrentNodeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  onCanvasRef: (el: HTMLDivElement | null) => void
  onCanvasClick: (event: MouseEvent<HTMLDivElement>) => void
  onCanvasContextMenu: (event: MouseEvent<HTMLDivElement>) => void
  onZoomIn: (event: MouseEvent<HTMLButtonElement>) => void
  onZoomOut: (event: MouseEvent<HTMLButtonElement>) => void
  onConnectModeToggle: () => void
  onDeleteModeToggle: () => void
  onDeleteEdgeModeToggle: () => void
  onClearCanvas: () => void
  onNewEdgeDirectionChange: (direction: GraphEdge['direction']) => void
  onNodeMouseDown: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onConnectNodeClick: (nodeId: string) => void
  onToggleNodeSelection: (nodeId: string) => void
  onStartEditingNode: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onNodeContextMenu: (event: MouseEvent<HTMLDivElement>, node: GraphNode) => void
  onValueChange: (event: ChangeEvent<HTMLInputElement>) => void
  onValueKeyDown: (event: KeyboardEvent<HTMLInputElement>, nodeId: string) => void
  onCommitNodeValue: (nodeId: string, rawValue: string) => void
  onToggleEdgeSelection: (edgeId: string) => void
  onToggleEdgeDirection: (edgeId: string) => void
}

// Canvas panel: header with graph editing actions, zoom controls, and all rendering layers.
export function GraphCanvas({
  nodes,
  edges,
  isConnectMode,
  isDeleteMode,
  isDeleteEdgeMode,
  blockGraphInteraction,
  selectedNodeIds,
  selectedEdgeIds,
  connectionSource,
  newEdgeDirection,
  canvasZoom,
  editingNodeId,
  draftValue,
  draggingNodeId,
  traversalVisitedNodeIds,
  traversalCurrentNodeId,
  traversalStartNodeId,
  traversalGoalNodeIds,
  weakCCOutlineHslByNodeId,
  weakCCOutlineActive,
  onCanvasRef,
  onCanvasClick,
  onCanvasContextMenu,
  onZoomIn,
  onZoomOut,
  onConnectModeToggle,
  onDeleteModeToggle,
  onDeleteEdgeModeToggle,
  onClearCanvas,
  onNewEdgeDirectionChange,
  onNodeMouseDown,
  onConnectNodeClick,
  onToggleNodeSelection,
  onStartEditingNode,
  onNodeContextMenu,
  onValueChange,
  onValueKeyDown,
  onCommitNodeValue,
  onToggleEdgeSelection,
  onToggleEdgeDirection,
}: GraphCanvasProps) {
  return (
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
            onClick={onConnectModeToggle}
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
              onClick={() => onNewEdgeDirectionChange('forward')}
            >
              <DirectionIcon direction="forward" />
            </button>
            <button
              className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'both' ? 'btn-active' : ''}`}
              type="button"
              disabled={!isConnectMode || blockGraphInteraction}
              aria-pressed={newEdgeDirection === 'both'}
              title="Create bidirectional edge"
              onClick={() => onNewEdgeDirectionChange('both')}
            >
              <DirectionIcon direction="both" />
            </button>
            <button
              className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'backward' ? 'btn-active' : ''}`}
              type="button"
              disabled={!isConnectMode || blockGraphInteraction}
              aria-pressed={newEdgeDirection === 'backward'}
              title="Create inbound edge (toward selected node)"
              onClick={() => onNewEdgeDirectionChange('backward')}
            >
              <DirectionIcon direction="backward" />
            </button>
          </div>
          <div className="delete-stack" role="group" aria-label="Delete controls">
            <button
              className={`btn delete-stack-btn ${isDeleteMode ? 'btn-active' : ''}`}
              type="button"
              onClick={onDeleteModeToggle}
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
              onClick={onDeleteEdgeModeToggle}
              disabled={blockGraphInteraction}
            >
              {isDeleteEdgeMode
                ? selectedEdgeIds.length > 0
                  ? 'Delete selected edges'
                  : 'Cancel edge delete'
                : 'Delete edges'}
            </button>
          </div>
          <button
            className="btn btn-clear"
            type="button"
            onClick={onClearCanvas}
            disabled={blockGraphInteraction}
          >
            Clear canvas
          </button>
        </div>
      </div>

      <div
        className={`canvas ${
          isConnectMode
            ? 'is-connect'
            : isDeleteMode || isDeleteEdgeMode
              ? 'is-select'
              : 'is-place'
        }`}
        ref={onCanvasRef}
        onClick={onCanvasClick}
        onContextMenu={onCanvasContextMenu}
      >
        <div className="canvas-zoom-controls" onClick={(event) => event.stopPropagation()}>
          <button
            className="canvas-zoom-btn"
            type="button"
            onClick={onZoomOut}
            disabled={canvasZoom <= CANVAS_ZOOM_MIN}
            aria-label="Zoom out"
          >
            -
          </button>
          <span className="canvas-zoom-value">{Math.round(canvasZoom * 100)}%</span>
          <button
            className="canvas-zoom-btn"
            type="button"
            onClick={onZoomIn}
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
            onToggleEdgeSelection={onToggleEdgeSelection}
          />

          <EdgeToggles
            nodes={nodes}
            edges={edges}
            isDeleteEdgeMode={isDeleteEdgeMode}
            selectedEdgeIds={selectedEdgeIds}
            onToggleEdgeDirection={onToggleEdgeDirection}
            onToggleEdgeSelection={onToggleEdgeSelection}
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
            onNodeMouseDown={onNodeMouseDown}
            onConnectNodeClick={onConnectNodeClick}
            onToggleNodeSelection={onToggleNodeSelection}
            onStartEditingNode={onStartEditingNode}
            onNodeContextMenu={onNodeContextMenu}
            onValueChange={onValueChange}
            onValueKeyDown={onValueKeyDown}
            onCommitNodeValue={onCommitNodeValue}
          />
        </div>
      </div>
    </section>
  )
}
