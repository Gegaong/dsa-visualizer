import type { GraphEdge, GraphNode } from '../../types'

// [from, to, weight?, direction?] — weight omitted leaves the edge unweighted; direction
// defaults to 'both' so graphs read as undirected unless a test says otherwise.
export type EdgeSpec = [string, string, number?, GraphEdge['direction']?]

// Builds nodes (id = label) and edges from a terse spec, sparing every test the full object shape.
// Coordinates are filler placed along a line; tests that depend on geometry (A*) pass their own
// pixelsPerUnit to neutralise it.
export function makeGraph(
  labels: string[],
  edgeSpecs: EdgeSpec[] = [],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = labels.map((label, i) => ({
    id: label,
    label,
    value: 'empty',
    x: i * 100,
    y: 0,
  }))

  const edges: GraphEdge[] = edgeSpecs.map(([from, to, weight, direction], i) => {
    const edge: GraphEdge = {
      id: `e${i}`,
      fromNodeId: from,
      toNodeId: to,
      direction: direction ?? 'both',
    }
    if (weight !== undefined) edge.weight = weight
    return edge
  })

  return { nodes, edges }
}

// Deterministic PRNG (mulberry32) so random-graph tests are reproducible from a seed.
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Seeded random undirected weighted graph on nodes N0..N(n-1); ~40% edge density, weights 1..9.
export function randomWeightedGraph(seed: number, n: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rng = makeRng(seed)
  const labels = Array.from({ length: n }, (_, i) => `N${i}`)
  const edgeSpecs: EdgeSpec[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < 0.4) edgeSpecs.push([labels[i], labels[j], 1 + Math.floor(rng() * 9)])
    }
  }
  return makeGraph(labels, edgeSpecs)
}

// Parses an ASCII grid ('1' = island cell, any other char = water) into the Set<"r,c"> the grid
// searches expect. Blank lines are ignored so test strings can be written readably.
export function gridFrom(ascii: string): { islands: Set<string>; rows: number; cols: number } {
  const lines = ascii.split('\n').filter((line) => line.length > 0)
  const islands = new Set<string>()
  const rows = lines.length
  const cols = rows === 0 ? 0 : lines[0].length
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (lines[r][c] === '1') islands.add(`${r},${c}`)
    }
  }
  return { islands, rows, cols }
}
