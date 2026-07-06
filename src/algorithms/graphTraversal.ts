import type { TraversalStrategy } from './algorithmTypes'

export type VisitOutcome = void | 'stop'

type TraversalItem = { id: string; parentId: string | null }

// Visits every node reachable from startId (shared visited set); BFS queue vs DFS stack; optional neighbor ordering and early exit via onVisit.
export function traverseReachableFrom(params: {
  neighborsById: Map<string, string[]>
  startId: string
  visited: Set<string>
  strategy: TraversalStrategy
  onVisit: (nodeId: string, parentId: string | null) => VisitOutcome
  orderNeighbors?: (rawNeighborIds: string[]) => string[]
}): void {
  const { neighborsById, startId, visited, strategy, onVisit } = params
  const orderNeighbors = params.orderNeighbors ?? ((ids: string[]) => ids)

  if (visited.has(startId)) return

  visited.add(startId)

  if (strategy === 'bfs') {
    const queue: TraversalItem[] = [{ id: startId, parentId: null }]
    while (queue.length > 0) {
      const item = queue.shift()
      if (item === undefined) continue
      if (onVisit(item.id, item.parentId) === 'stop') return
      const ordered = orderNeighbors(neighborsById.get(item.id) ?? [])
      for (const nid of ordered) {
        if (visited.has(nid)) continue
        visited.add(nid)
        queue.push({ id: nid, parentId: item.id })
      }
    }
    return
  }

  const stack: TraversalItem[] = [{ id: startId, parentId: null }]
  while (stack.length > 0) {
    const item = stack.pop()
    if (item === undefined) continue
    if (onVisit(item.id, item.parentId) === 'stop') return
    const ordered = orderNeighbors(neighborsById.get(item.id) ?? [])
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const nid = ordered[i]
      if (visited.has(nid)) continue
      visited.add(nid)
      stack.push({ id: nid, parentId: item.id })
    }
  }
}
