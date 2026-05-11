export type GraphTraversalStrategy = 'bfs' | 'dfs'

export type VisitOutcome = void | 'stop'

// Visits every node reachable from startId (shared visited set); BFS queue vs DFS stack; optional neighbor ordering and early exit via onVisit.
export function traverseReachableFrom(params: {
  neighborsById: Map<string, string[]>
  startId: string
  visited: Set<string>
  strategy: GraphTraversalStrategy
  onVisit: (nodeId: string) => VisitOutcome
  orderNeighbors?: (rawNeighborIds: string[]) => string[]
}): void {
  const { neighborsById, startId, visited, strategy, onVisit } = params
  const orderNeighbors = params.orderNeighbors ?? ((ids: string[]) => ids)

  if (visited.has(startId)) return

  visited.add(startId)

  if (strategy === 'bfs') {
    const queue: string[] = [startId]
    while (queue.length > 0) {
      const currentId = queue.shift()
      if (currentId === undefined) continue
      if (onVisit(currentId) === 'stop') return
      const ordered = orderNeighbors(neighborsById.get(currentId) ?? [])
      for (const nid of ordered) {
        if (visited.has(nid)) continue
        visited.add(nid)
        queue.push(nid)
      }
    }
    return
  }

  const stack: string[] = [startId]
  while (stack.length > 0) {
    const currentId = stack.pop()
    if (currentId === undefined) continue
    if (onVisit(currentId) === 'stop') return
    const ordered = orderNeighbors(neighborsById.get(currentId) ?? [])
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const nid = ordered[i]
      if (visited.has(nid)) continue
      visited.add(nid)
      stack.push(nid)
    }
  }
}
