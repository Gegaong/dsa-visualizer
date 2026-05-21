import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'

import type { GraphEdge, GraphNode } from '../types'

import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'

import { CANVAS_ZOOM_MIN, CANVAS_ZOOM_MAX } from '../utils/constants'

import { DirectionIcon } from './DirectionIcon'
import { GridOverlay } from './GridOverlay'

import { EdgesLayer } from './EdgesLayer'

import { EdgeToggles } from './EdgeToggles'

import { EdgeWeightLabels } from './EdgeWeightLabels'

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
  traversalVisitedEdgeIds: string[]
  traversalCurrentNodeId: string | null
  traversalCurrentEdgeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  weakCCVisitedNodeIds: string[]
  weakCCVisitedEdgeIds: string[]
  cycleGoalEdgeIds: string[]
  shortestPathEdgeIds: string[]
  shortestPathNodeIds: string[]
  bipartiteGroupANodeIds: string[]
  bipartiteGroupBNodeIds: string[]
  wpSettledNodeIds: string[]
  wpTentativeNodeIds: string[]
  wpCurrentNodeId: string | null
  wpStartNodeId: string | null
  wpGoalNodeId: string | null
  wpPathNodeIds: string[]
  wpCostByNodeId: Map<string, number>
  wpCurrentEdgeId: string | null
  wpVisitedEdgeIds: string[]
  wpPathEdgeIds: string[]
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
  isUndirectedMode: boolean
  onUndirectedModeToggle: () => void
  isWeightedMode: boolean
  heuristicPixelsPerUnit: number
  editingEdgeWeightId: string | null
  draftEdgeWeight: string
  onEdgeWeightClick: (edgeId: string) => void
  onEdgeWeightChange: (value: string) => void
  onEdgeWeightKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, edgeId: string) => void
  onCommitEdgeWeight: (edgeId: string, rawValue: string) => void
  onEdgeRightClick: (edgeId: string, x: number, y: number) => void
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
  traversalVisitedEdgeIds,
  traversalCurrentNodeId,
  traversalCurrentEdgeId,
  traversalStartNodeId,
  traversalGoalNodeIds,
  weakCCOutlineHslByNodeId,
  weakCCOutlineActive,
  weakCCVisitedNodeIds,
  weakCCVisitedEdgeIds,
  cycleGoalEdgeIds,
  shortestPathEdgeIds,
  shortestPathNodeIds,
  bipartiteGroupANodeIds,
  bipartiteGroupBNodeIds,
  wpSettledNodeIds,
  wpTentativeNodeIds,
  wpCurrentNodeId,
  wpStartNodeId,
  wpGoalNodeId,
  wpPathNodeIds,
  wpCostByNodeId,
  wpCurrentEdgeId,
  wpVisitedEdgeIds,
  wpPathEdgeIds,
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
  isUndirectedMode,
  onUndirectedModeToggle,
  isWeightedMode,
  heuristicPixelsPerUnit,
  editingEdgeWeightId,
  draftEdgeWeight,
  onEdgeWeightClick,
  onEdgeWeightChange,
  onEdgeWeightKeyDown,
  onCommitEdgeWeight,
  onEdgeRightClick,
}: GraphCanvasProps) {
  return (
    <section className="canvas-panel">
      <div className="canvas-header">
        <div className="canvas-copy">
          <h2>{isWeightedMode ? 'Weighted Graph Canvas' : 'Graph Canvas'}</h2>
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
              disabled={isUndirectedMode || !isConnectMode || blockGraphInteraction}
              aria-pressed={newEdgeDirection === 'forward'}
              title="Create outbound edge (from selected node)"
              onClick={() => onNewEdgeDirectionChange('forward')}
            >
              <DirectionIcon direction="forward" />
            </button>
            <button
              className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'both' ? 'btn-active' : ''}`}
              type="button"
              disabled={isUndirectedMode || !isConnectMode || blockGraphInteraction}
              aria-pressed={newEdgeDirection === 'both'}
              title="Create bidirectional edge"
              onClick={() => onNewEdgeDirectionChange('both')}
            >
              <DirectionIcon direction="both" />
            </button>
            <button
              className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'backward' ? 'btn-active' : ''}`}
              type="button"
              disabled={isUndirectedMode || !isConnectMode || blockGraphInteraction}
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
        className={`canvas ${isWeightedMode ? 'is-weighted' : ''} ${isConnectMode
          ? 'is-connect'
          : isDeleteMode || isDeleteEdgeMode
            ? 'is-select'
            : 'is-place'
          }`}
        ref={onCanvasRef}
        onClick={onCanvasClick}
        onContextMenu={onCanvasContextMenu}
      >
        <div className="canvas-mode-toggle" onClick={(event) => event.stopPropagation()}>
          <button
            className={`canvas-mode-toggle-btn ${isUndirectedMode ? 'is-active' : ''}`}
            type="button"
            onClick={onUndirectedModeToggle}
            disabled={blockGraphInteraction}
            title={isUndirectedMode ? 'Switch to directed graph' : 'Switch to undirected graph'}
          >
            {isUndirectedMode ? 'Undirected' : 'Directed'}
          </button>
        </div>

        {!isWeightedMode && (
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
        )}

        <div
          className="canvas-content"
          style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'center center' }}
        >
          {isWeightedMode && <GridOverlay cellSize={heuristicPixelsPerUnit} />}

          <EdgesLayer
            nodes={nodes}
            edges={edges}
            isDeleteEdgeMode={isDeleteEdgeMode}
            selectedEdgeIds={selectedEdgeIds}
            isUndirectedMode={isUndirectedMode}
            traversalVisitedEdgeIds={traversalVisitedEdgeIds}
            traversalCurrentEdgeId={traversalCurrentEdgeId}
            weakCCOutlineHslByNodeId={weakCCOutlineHslByNodeId}
            weakCCOutlineActive={weakCCOutlineActive}
            weakCCVisitedEdgeIds={weakCCVisitedEdgeIds}
            cycleGoalEdgeIds={cycleGoalEdgeIds}
            shortestPathEdgeIds={shortestPathEdgeIds}
            wpCurrentEdgeId={wpCurrentEdgeId}
            wpVisitedEdgeIds={wpVisitedEdgeIds}
            wpPathEdgeIds={wpPathEdgeIds}
            onToggleEdgeSelection={onToggleEdgeSelection}
            onEdgeRightClick={onEdgeRightClick}
          />

          {!isWeightedMode && (
            <EdgeToggles
              nodes={nodes}
              edges={edges}
              isDeleteEdgeMode={isDeleteEdgeMode}
              selectedEdgeIds={selectedEdgeIds}
              isUndirectedMode={isUndirectedMode}
              onToggleEdgeDirection={onToggleEdgeDirection}
              onToggleEdgeSelection={onToggleEdgeSelection}
              onEdgeRightClick={onEdgeRightClick}
            />
          )}

          {isWeightedMode && (
            <EdgeWeightLabels
              nodes={nodes}
              edges={edges}
              editingEdgeId={editingEdgeWeightId}
              draftWeight={draftEdgeWeight}
              onWeightClick={onEdgeWeightClick}
              onWeightChange={onEdgeWeightChange}
              onWeightKeyDown={onEdgeWeightKeyDown}
              onCommitWeight={onCommitEdgeWeight}
              onEdgeRightClick={onEdgeRightClick}
            />
          )}

          <GraphNodeLayer
            nodes={nodes}
            isConnectMode={isConnectMode}
            isDeleteMode={isDeleteMode}
            isDeleteEdgeMode={isDeleteEdgeMode}
            isWeightedMode={isWeightedMode}
            selectedNodeIds={selectedNodeIds}
            connectionSource={connectionSource}
            draggingNodeId={draggingNodeId}
            editingNodeId={editingNodeId}
            draftValue={draftValue}
            traversalVisitedNodeIds={traversalVisitedNodeIds}
            traversalCurrentNodeId={traversalCurrentNodeId}
            traversalStartNodeId={traversalStartNodeId}
            traversalGoalNodeIds={traversalGoalNodeIds}
            shortestPathNodeIds={shortestPathNodeIds}
            weakCCOutlineHslByNodeId={weakCCOutlineHslByNodeId}
            weakCCOutlineActive={weakCCOutlineActive}
            weakCCVisitedNodeIds={weakCCVisitedNodeIds}
            bipartiteGroupANodeIds={bipartiteGroupANodeIds}
            bipartiteGroupBNodeIds={bipartiteGroupBNodeIds}
            wpSettledNodeIds={wpSettledNodeIds}
            wpTentativeNodeIds={wpTentativeNodeIds}
            wpCurrentNodeId={wpCurrentNodeId}
            wpStartNodeId={wpStartNodeId}
            wpGoalNodeId={wpGoalNodeId}
            wpPathNodeIds={wpPathNodeIds}
            wpCostByNodeId={wpCostByNodeId}
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
