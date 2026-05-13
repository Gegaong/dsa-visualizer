import type { GraphNode, GraphEdge } from '../types'
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
    <defs>
      <marker
        id="arrowhead"
        markerWidth="7"
        markerHeight="7"
        refX="6.2"
        refY="2.1"
        orient="auto"
      >
        <polygon points="0 0, 7 2.1, 0 4.2" fill="#4a7c59" />
      </marker>
      <marker
        id="arrowhead-small"
        markerWidth="5"
        markerHeight="5"
        refX="4.4"
        refY="1.5"
        orient="auto"
      >
        <polygon points="0 0, 5 1.5, 0 3" fill="#4a7c59" />
      </marker>
      <marker
        id="arrowhead-tiny"
        markerWidth="3.8"
        markerHeight="3.8"
        refX="3.35"
        refY="1.14"
        orient="auto"
      >
        <polygon points="0 0, 3.8 1.14, 0 2.28" fill="#4a7c59" />
      </marker>
    </defs>
    {edges.map((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
      const toNode = nodes.find((n) => n.id === edge.toNodeId)

      if (!fromNode || !toNode) return null

      const geometry = getEdgeGeometry(fromNode, toNode)

      if (!geometry) return null

      const { startX, startY, endX, endY } = geometry
      const isSelected = selectedEdgeIds.includes(edge.id)
      const strokeColor = '#4a7c59'
      const strokeWidth = 2
      // Click handler for the invisible hit-line placed over the visual line.
      // Lets users reliably pick short/stationary edges without changing the
      // visual appearance of the edge itself.
      const handleEdgePick = (event: React.MouseEvent<SVGLineElement>) => {
        event.stopPropagation()
        onToggleEdgeSelection(edge.id)
      }
      const markerId =
        geometry.edgeLength < TINY_EDGE_MARKER_EDGE_LENGTH
          ? 'arrowhead-tiny'
          : geometry.edgeLength < SHORT_EDGE_MARKER_EDGE_LENGTH
            ? 'arrowhead-small'
            : 'arrowhead'

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
            <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={strokeColor} strokeWidth={strokeWidth} />
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
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                markerEnd={`url(#${markerId})`}
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
                markerEnd={`url(#${markerId})`}
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
              <line
                x1={endX}
                y1={endY}
                x2={startX}
                y2={startY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                markerEnd={`url(#${markerId})`}
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
