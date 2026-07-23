import type { GraphNode, GraphEdge } from '../../types'

import type { WeakCCOutlineHSL } from '../../utils/weakCCOutlineHues'

import {
  TINY_EDGE_MARKER_EDGE_LENGTH,
  SHORT_EDGE_MARKER_EDGE_LENGTH,
} from '../../utils/constants'

import { getEdgeGeometry } from '../../utils/geometry'

// Short segments at endpoints carry arrowheads on bidirectional edges so the two
// stroke paths do not paint over each other's markers (full-length overlap).
const BIDIRECTIONAL_ARROW_STUB_PX = 14

const markerStrokeOrderStyle = { paintOrder: 'stroke markers' as const }

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
  shortestPathEdgeIds: string[]
  // Weighted pathfinding: visited edges (orange), confirmed path edges (green), and active edge (glow).
  wpVisitedEdgeIds: string[]
  wpVisitedEdgeFwdIds: string[]
  wpVisitedEdgeRevIds: string[]
  wpPathEdgeIds: string[]
  wpPathGuaranteed: boolean
  wpCurrentEdgeId: string | null
  onToggleEdgeSelection: (edgeId: string) => void
  onEdgeRightClick?: (edgeId: string, x: number, y: number) => void
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
  shortestPathEdgeIds,
  wpVisitedEdgeIds,
  wpVisitedEdgeFwdIds,
  wpVisitedEdgeRevIds,
  wpPathEdgeIds,
  wpPathGuaranteed,
  wpCurrentEdgeId,
  onToggleEdgeSelection,
  onEdgeRightClick,
}: EdgesLayerProps) => {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const wpPathColor = wpPathGuaranteed ? '#43a047' : '#fdd835'
  return (
  <svg
    className="edges-layer"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    }}
  >
    {edges.map((edge) => {
      const fromNode = nodeById.get(edge.fromNodeId)
      const toNode = nodeById.get(edge.toNodeId)

      if (!fromNode || !toNode) return null

      const geometry = getEdgeGeometry(fromNode, toNode)

      if (!geometry) return null

      const { startX, startY, endX, endY } = geometry
      const isSelected = selectedEdgeIds.includes(edge.id)
      const isTraversalActive = traversalCurrentEdgeId === edge.id
      const isTraversalVisitedPast = traversalVisitedEdgeIds.includes(edge.id) && !isTraversalActive
      const ccHsl = weakCCOutlineHslByNodeId?.get(fromNode.id)
        ?? weakCCOutlineHslByNodeId?.get(toNode.id)
      const ccStroke = ccHsl ? `hsl(${ccHsl.h} ${ccHsl.s}% ${ccHsl.l}%)` : null
      const isCcEdge =
        weakCCOutlineActive &&
        ccStroke !== null &&
        weakCCVisitedEdgeIds.includes(edge.id)
      const isGoalEdge = cycleGoalEdgeIds.includes(edge.id)
      const isShortestPathEdge = shortestPathEdgeIds.includes(edge.id)
      const isWpPathEdge = wpPathEdgeIds.includes(edge.id)
      const isWpCurrentEdge = wpCurrentEdgeId === edge.id
      const isWpVisitedEdge = !isWpPathEdge && !isWpCurrentEdge && wpVisitedEdgeIds.includes(edge.id)
      const isBothEdge = edge.direction === 'both'
      const strokeColor = isWpPathEdge
        ? wpPathColor
        : isGoalEdge || isShortestPathEdge
          ? '#2a4f9c'
          : isCcEdge
            ? ccStroke
            : isTraversalVisitedPast || isWpVisitedEdge
              ? '#e07b39'
              : '#4a7c59'
      // For both-edges: each arrowhead is only orange if that specific direction was traversed.
      const baseEdgeColor = isWpPathEdge ? wpPathColor
        : isGoalEdge || isShortestPathEdge ? '#2a4f9c'
        : isCcEdge ? ccStroke
        : isTraversalVisitedPast ? '#e07b39'
        : '#4a7c59'
      const fwdArrowColor = isBothEdge && isWpVisitedEdge && !wpVisitedEdgeFwdIds.includes(edge.id)
        ? baseEdgeColor ?? '#4a7c59'
        : strokeColor
      const revArrowColor = isBothEdge && isWpVisitedEdge && !wpVisitedEdgeRevIds.includes(edge.id)
        ? baseEdgeColor ?? '#4a7c59'
        : strokeColor
      const strokeWidth = isWpPathEdge ? 2.5 : 2
      const showTraversalOutline = isTraversalActive && !isCcEdge && !isGoalEdge && !isShortestPathEdge && !isWpPathEdge
      const showWpCurrentOutline = isWpCurrentEdge && !isWpPathEdge
      const renderGlowOutline = (x1: number, y1: number, x2: number, y2: number, color: string, active: boolean) =>
        active ? (
          <>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="14" strokeLinecap="round" opacity="0.12" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.26" />
          </>
        ) : null

      const handleEdgePick = (event: React.MouseEvent<SVGLineElement>) => {
        event.stopPropagation()
        onToggleEdgeSelection(edge.id)
      }

      const handleEdgeContextMenu = (event: React.MouseEvent<SVGLineElement>) => {
        event.preventDefault()
        event.stopPropagation()
        onEdgeRightClick?.(edge.id, event.clientX, event.clientY)
      }

      // Single full-span hit line for right-click context menu in both modes.
      // Covers the entire startX→endX segment regardless of arrow direction.
      const contextMenuHitLine = (
        <line
          x1={startX} y1={startY} x2={endX} y2={endY}
          stroke="transparent" strokeWidth="12" pointerEvents="stroke"
          onContextMenu={handleEdgeContextMenu}
        />
      )
      // Per-edge markers paint with this stroke so arrowheads match the line in every
      // state (goal, visited, component highlights). Global markers + currentColor are unreliable
      // across browsers for marker context.
      const idSafe = edge.id.replace(/[^a-zA-Z0-9_-]/g, '_')
      const markerIdLg = `arr-${idSafe}-lg`
      const markerIdSm = `arr-${idSafe}-sm`
      const markerIdTi = `arr-${idSafe}-ti`
      const sizeKey = geometry.edgeLength < TINY_EDGE_MARKER_EDGE_LENGTH ? 'ti'
        : geometry.edgeLength < SHORT_EDGE_MARKER_EDGE_LENGTH ? 'sm' : 'lg'
      const markerEnd = `url(#arr-${idSafe}-${sizeKey})`
      const markerEndFwd = isBothEdge ? `url(#arr-${idSafe}-fwd-${sizeKey})` : markerEnd
      const markerEndRev = isBothEdge ? `url(#arr-${idSafe}-rev-${sizeKey})` : markerEnd

      const makeMarkerPath = (id: string, w: string, h: string, rx: string, ry: string, vb: string, d: string, sw: string, color: string) => (
        <marker id={id} markerWidth={w} markerHeight={h} refX={rx} refY={ry} orient="auto" markerUnits="strokeWidth" viewBox={vb}>
          <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" />
        </marker>
      )

      const edgeArrowMarkers = (
        <defs>
          {makeMarkerPath(markerIdLg, "6", "6", "5.5", "3", "0 0 6 6", "M0.5 0.5 L5.5 3 L0.5 5.5", "1", strokeColor)}
          {makeMarkerPath(markerIdSm, "4.8", "4.8", "4.4", "2.4", "0 0 4.8 4.8", "M0.4 0.4 L4.4 2.4 L0.4 4.4", "0.9", strokeColor)}
          {makeMarkerPath(markerIdTi, "3.6", "3.6", "3.3", "1.8", "0 0 3.6 3.6", "M0.3 0.3 L3.3 1.8 L0.3 3.3", "0.8", strokeColor)}
          {isBothEdge && (<>
            {makeMarkerPath(`arr-${idSafe}-fwd-lg`, "6", "6", "5.5", "3", "0 0 6 6", "M0.5 0.5 L5.5 3 L0.5 5.5", "1", fwdArrowColor)}
            {makeMarkerPath(`arr-${idSafe}-fwd-sm`, "4.8", "4.8", "4.4", "2.4", "0 0 4.8 4.8", "M0.4 0.4 L4.4 2.4 L0.4 4.4", "0.9", fwdArrowColor)}
            {makeMarkerPath(`arr-${idSafe}-fwd-ti`, "3.6", "3.6", "3.3", "1.8", "0 0 3.6 3.6", "M0.3 0.3 L3.3 1.8 L0.3 3.3", "0.8", fwdArrowColor)}
            {makeMarkerPath(`arr-${idSafe}-rev-lg`, "6", "6", "5.5", "3", "0 0 6 6", "M0.5 0.5 L5.5 3 L0.5 5.5", "1", revArrowColor)}
            {makeMarkerPath(`arr-${idSafe}-rev-sm`, "4.8", "4.8", "4.4", "2.4", "0 0 4.8 4.8", "M0.4 0.4 L4.4 2.4 L0.4 4.4", "0.9", revArrowColor)}
            {makeMarkerPath(`arr-${idSafe}-rev-ti`, "3.6", "3.6", "3.3", "1.8", "0 0 3.6 3.6", "M0.3 0.3 L3.3 1.8 L0.3 3.3", "0.8", revArrowColor)}
          </>)}
        </defs>
      )

      const segDx = endX - startX
      const segDy = endY - startY
      const segLen = Math.hypot(segDx, segDy) || 1
      const ux = segDx / segLen
      const uy = segDy / segLen
      const bioStub = Math.min(BIDIRECTIONAL_ARROW_STUB_PX, segLen * 0.48)
      const bioFwdStubX1 = endX - ux * bioStub
      const bioFwdStubY1 = endY - uy * bioStub
      const bioRevStubX1 = startX + ux * bioStub
      const bioRevStubY1 = startY + uy * bioStub

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
            {renderGlowOutline(startX, startY, endX, endY, ccStroke ?? '', isCcEdge && ccStroke !== null)}
            {renderGlowOutline(startX, startY, endX, endY, '#2a4f9c', isGoalEdge)}
            {renderGlowOutline(startX, startY, endX, endY, '#2a4f9c', isShortestPathEdge)}
            {renderGlowOutline(startX, startY, endX, endY, wpPathColor, isWpPathEdge)}
            {renderGlowOutline(startX, startY, endX, endY, '#3a6f5a', showTraversalOutline)}
            {renderGlowOutline(startX, startY, endX, endY, '#3a6f5a', showWpCurrentOutline)}
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
            {contextMenuHitLine}
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
              {renderGlowOutline(startX, startY, endX, endY, ccStroke ?? '', isCcEdge && ccStroke !== null)}
              {renderGlowOutline(startX, startY, endX, endY, '#2a4f9c', isGoalEdge)}
              {renderGlowOutline(startX, startY, endX, endY, '#2a4f9c', isShortestPathEdge)}
              {renderGlowOutline(startX, startY, endX, endY, wpPathColor, isWpPathEdge)}
              {renderGlowOutline(startX, startY, endX, endY, '#3a6f5a', showTraversalOutline)}
              {renderGlowOutline(startX, startY, endX, endY, '#3a6f5a', showWpCurrentOutline)}
              {edge.direction === 'both' ? (
                <>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    color={strokeColor}
                  />
                  <line
                    x1={bioFwdStubX1}
                    y1={bioFwdStubY1}
                    x2={endX}
                    y2={endY}
                    stroke={fwdArrowColor}
                    strokeWidth={strokeWidth}
                    color={fwdArrowColor}
                    markerEnd={markerEndFwd}
                    style={markerStrokeOrderStyle}
                  />
                </>
              ) : (
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  color={strokeColor}
                  markerEnd={markerEnd}
                  style={markerStrokeOrderStyle}
                />
              )}
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
                x1={bioRevStubX1}
                y1={bioRevStubY1}
                x2={startX}
                y2={startY}
                stroke={revArrowColor}
                strokeWidth={strokeWidth}
                color={revArrowColor}
                markerEnd={markerEndRev}
                style={markerStrokeOrderStyle}
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
              {renderGlowOutline(endX, endY, startX, startY, ccStroke ?? '', isCcEdge && ccStroke !== null)}
              {renderGlowOutline(endX, endY, startX, startY, '#2a4f9c', isGoalEdge)}
              {renderGlowOutline(endX, endY, startX, startY, '#2a4f9c', isShortestPathEdge)}
              {renderGlowOutline(endX, endY, startX, startY, wpPathColor, isWpPathEdge)}
              {renderGlowOutline(endX, endY, startX, startY, '#3a6f5a', showTraversalOutline)}
              {renderGlowOutline(endX, endY, startX, startY, '#3a6f5a', showWpCurrentOutline)}
              <line
                x1={endX}
                y1={endY}
                x2={startX}
                y2={startY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                color={strokeColor}
                markerEnd={markerEnd}
                style={markerStrokeOrderStyle}
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
          {contextMenuHitLine}
        </g>
      )
    })}
  </svg>
  )
}
