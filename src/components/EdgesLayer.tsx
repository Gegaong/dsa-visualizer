import type { GraphNode, GraphEdge } from '../types'
import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'
import {
  TINY_EDGE_MARKER_EDGE_LENGTH,
  SHORT_EDGE_MARKER_EDGE_LENGTH,
} from '../utils/constants'
import { getEdgeGeometry } from '../utils/geometry'

type EdgesLayerProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isDeleteEdgeMode: boolean
  selectedEdgeIds: string[]
  isUndirectedMode: boolean
  traversalVisitedEdgeIds: string[]
  traversalCurrentEdgeId: string | null
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  weakCCVisitedEdgeIds: string[]
  cycleGoalEdgeIds: string[]
  onToggleEdgeSelection: (edgeId: string) => void
}

// SVG layer that draws every edge between connected nodes.
// In delete-edge mode, each visible line gets a wider transparent hit area on
// top of it so short or close-together edges remain easy to click without
// rescaling the visible line and its arrowhead.
export const EdgesLayer = ({
  nodes,
  edges,
  isDeleteEdgeMode,
  selectedEdgeIds,
  isUndirectedMode,
  traversalVisitedEdgeIds,
  traversalCurrentEdgeId,
  weakCCOutlineHslByNodeId,
  weakCCOutlineActive,
  weakCCVisitedEdgeIds,
  cycleGoalEdgeIds,
  onToggleEdgeSelection,
}: EdgesLayerProps) => (
  <svg
    className="edges-layer"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: isDeleteEdgeMode ? 'auto' : 'none',
    }}
  >
    {edges.map((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
      const toNode = nodes.find((n) => n.id === edge.toNodeId)

      if (!fromNode || !toNode) return null

      const geometry = getEdgeGeometry(fromNode, toNode)

      if (!geometry) return null

      const { startX, startY, endX, endY } = geometry
      const isSelected = selectedEdgeIds.includes(edge.id)
      const isTraversalActive = traversalCurrentEdgeId === edge.id
      const isTraversalVisitedPast =
        traversalVisitedEdgeIds.includes(edge.id) && !isTraversalActive
      const ccHsl = weakCCOutlineHslByNodeId?.get(fromNode.id)
        ?? weakCCOutlineHslByNodeId?.get(toNode.id)
      const ccStroke = ccHsl ? `hsl(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}%)` : null
      const isCcEdge =
        weakCCOutlineActive &&
        ccStroke !== null &&
        weakCCVisitedEdgeIds.includes(edge.id)
      const isGoalEdge = cycleGoalEdgeIds.includes(edge.id)
      const strokeColor = isGoalEdge
        ? '#2a4f9c'
        : isCcEdge
          ? ccStroke
          : isTraversalVisitedPast
            ? '#e07b39'
            : '#4a7c59'
      const strokeWidth = 2
      const showTraversalOutline = isTraversalActive && !isCcEdge && !isGoalEdge
      const renderCurrentOutline = (x1: number, y1: number, x2: number, y2: number) =>
        showTraversalOutline ? (
          <>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#3a6f5a"
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.12"
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#3a6f5a"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.26"
            />
          </>
        ) : null
      const renderCcOutline = (x1: number, y1: number, x2: number, y2: number) =>
        isCcEdge && ccStroke ? (
          <>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ccStroke}
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.12"
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ccStroke}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.26"
            />
          </>
        ) : null
        
      // Click handler for the invisible hit-line placed over the visual line.
      // Lets users reliably pick short/stationary edges without changing the
      // visual appearance of the edge itself.
      const handleEdgePick = (event: React.MouseEvent<SVGLineElement>) => {
        event.stopPropagation()
        onToggleEdgeSelection(edge.id)
      }
      // Per-edge markers paint with this stroke so arrowheads match the line in every
      // state (goal, visited, component highlights). Global markers + currentColor are unreliable
      // across browsers for marker context.
      const idSafe = edge.id.replace(/[^a-zA-Z0-9_-]/g, '_')
      const markerIdLg = `arr-${idSafe}-lg`
      const markerIdSm = `arr-${idSafe}-sm`
      const markerIdTi = `arr-${idSafe}-ti`
      const markerEndId =
        geometry.edgeLength < TINY_EDGE_MARKER_EDGE_LENGTH
          ? markerIdTi
          : geometry.edgeLength < SHORT_EDGE_MARKER_EDGE_LENGTH
            ? markerIdSm
            : markerIdLg
      const markerEnd = `url(#${markerEndId})`
      const edgeArrowMarkers = (
        <defs>
          <marker
            id={markerIdLg}
            markerWidth="6"
            markerHeight="6"
            refX="5.5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
            viewBox="0 0 6 6"
          >
            <path
              d="M0.5 0.5 L5.5 3 L0.5 5.5"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </marker>
          <marker
            id={markerIdSm}
            markerWidth="4.8"
            markerHeight="4.8"
            refX="4.4"
            refY="2.4"
            orient="auto"
            markerUnits="strokeWidth"
            viewBox="0 0 4.8 4.8"
          >
            <path
              d="M0.4 0.4 L4.4 2.4 L0.4 4.4"
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.9"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </marker>
          <marker
            id={markerIdTi}
            markerWidth="3.6"
            markerHeight="3.6"
            refX="3.3"
            refY="1.8"
            orient="auto"
            markerUnits="strokeWidth"
            viewBox="0 0 3.6 3.6"
          >
            <path
              d="M0.3 0.3 L3.3 1.8 L0.3 3.3"
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.8"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </marker>
        </defs>
      )

      // In undirected mode draw a single plain line with no arrowheads.
      if (isUndirectedMode) {
        return (
          <g key={edge.id}>
            {isDeleteEdgeMode && isSelected && (
              <line
                x1={startX} y1={startY} x2={endX} y2={endY}
                stroke="#2a4f9c" strokeWidth="12" strokeLinecap="round" opacity="0.22"
              />
            )}
            {renderCcOutline(startX, startY, endX, endY)}
            {renderCurrentOutline(startX, startY, endX, endY)}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              color={strokeColor}
            />
            {isDeleteEdgeMode && (
              <line
                x1={startX} y1={startY} x2={endX} y2={endY}
                stroke="transparent" strokeWidth="12" pointerEvents="stroke"
                onClick={handleEdgePick}
              />
            )}
          </g>
        )
      }

      return (
        <g key={edge.id}>
          {edgeArrowMarkers}
          {(edge.direction === 'both' || edge.direction === 'forward') && (
            <>
              {isDeleteEdgeMode && isSelected && (
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#2a4f9c"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.22"
                />
              )}
              {renderCcOutline(startX, startY, endX, endY)}
              {renderCurrentOutline(startX, startY, endX, endY)}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                color={strokeColor}
                markerEnd={markerEnd}
              />
              {isDeleteEdgeMode && (
                // Invisible but pointer-active strokeline to expand hit area for selection.
                // Keeps the visible line untouched while improving UX for small/close edges.
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="transparent"
                  strokeWidth="12"
                  pointerEvents="stroke"
                  onClick={handleEdgePick}
                />
              )}
            </>
          )}
          {edge.direction === 'both' && (
            <>
              {isDeleteEdgeMode && isSelected && (
                <line
                  x1={endX}
                  y1={endY}
                  x2={startX}
                  y2={startY}
                  stroke="#2a4f9c"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.22"
                />
              )}
              <line
                x1={endX}
                y1={endY}
                x2={startX}
                y2={startY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                color={strokeColor}
                markerEnd={markerEnd}
              />
              {isDeleteEdgeMode && (
                // Invisible hit area for the reverse-direction visual line.
                <line
                  x1={endX}
                  y1={endY}
                  x2={startX}
                  y2={startY}
                  stroke="transparent"
                  strokeWidth="12"
                  pointerEvents="stroke"
                  onClick={handleEdgePick}
                />
              )}
            </>
          )}
          {edge.direction === 'backward' && (
            <>
              {isDeleteEdgeMode && isSelected && (
                <line
                  x1={endX}
                  y1={endY}
                  x2={startX}
                  y2={startY}
                  stroke="#2a4f9c"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.22"
                />
              )}
              {renderCcOutline(endX, endY, startX, startY)}
              {renderCurrentOutline(endX, endY, startX, startY)}
              <line
                x1={endX}
                y1={endY}
                x2={startX}
                y2={startY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                color={strokeColor}
                markerEnd={markerEnd}
              />
              {isDeleteEdgeMode && (
                <line
                  x1={endX}
                  y1={endY}
                  x2={startX}
                  y2={startY}
                  stroke="transparent"
                  strokeWidth="12"
                  pointerEvents="stroke"
                  onClick={handleEdgePick}
                />
              )}
            </>
          )}
        </g>
      )
    })}
  </svg>
)
