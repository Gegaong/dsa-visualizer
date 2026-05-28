// Per-algorithm metadata shown in the sidebar info card (name, complexity, key properties).
// V = number of nodes, E = number of edges.

export type AlgorithmInfoKey =
  | 'grid-for-bfs'
  | 'grid-for-dfs'
  | 'grid-bfs-bfs'
  | 'grid-bfs-dfs'
  | 'grid-dfs-bfs'
  | 'grid-dfs-dfs'
  | 'traversal-bfs'
  | 'traversal-dfs'
  | 'cc-bfs'
  | 'cc-dfs'
  | 'cycle-bfs'
  | 'cycle-dfs'
  | 'bipartite-bfs'
  | 'bipartite-dfs'
  | 'sp-bfs'
  | 'sp-dfs'
  | 'wp-bfs'
  | 'wp-dfs'
  | 'wp-dijkstra'
  | 'wp-astar'
  | 'wp-greedy'

export type AlgorithmInfo = {
  name: string
  time: string
  space: string
  summary: string
  pros?: string[]
  cons?: string[]
}

const BFS_DFS_GENERIC_TIME = 'O(V + E)'
const BFS_DFS_GENERIC_SPACE = 'O(V)'

export const ALGORITHM_INFO: Record<AlgorithmInfoKey, AlgorithmInfo> = {
  'grid-for-bfs': {
    name: 'For Loop + BFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Scans every cell in a configurable order. When an unvisited island cell is found, BFS flood-fills the entire connected island (level by level) before the scan resumes.',
  },
  'grid-for-dfs': {
    name: 'For Loop + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Scans every cell in a configurable order. When an unvisited island cell is found, DFS flood-fills the entire connected island (stack-deep first) before the scan resumes.',
  },
  'grid-bfs-bfs': {
    name: 'BFS + BFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer BFS explores the whole grid breadth-first from the start cell — cells closer to the start are processed first. When it reaches an unvisited island cell, inner BFS flood-fills that island level by level before the outer BFS continues.',
  },
  'grid-bfs-dfs': {
    name: 'BFS + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer BFS explores the whole grid breadth-first from the start cell. When it reaches an unvisited island cell, inner DFS flood-fills that island depth-first before the outer BFS continues.',
  },
  'grid-dfs-bfs': {
    name: 'DFS + BFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer DFS explores the whole grid depth-first from the start cell — goes as deep as possible in one direction before backtracking. When it reaches an unvisited island cell, inner BFS flood-fills that island level by level before the outer DFS continues.',
  },
  'grid-dfs-dfs': {
    name: 'DFS + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer DFS explores the whole grid depth-first from the start cell. When it reaches an unvisited island cell, inner DFS flood-fills that island depth-first too — both layers dive deep before backtracking.',
  },
  'traversal-bfs': {
    name: 'BFS — Breadth-First Search',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Explores nodes in expanding layers by distance from the start. Enqueues all unseen neighbors, then dequeues and repeats — guarantees closer nodes are visited before farther ones.',
    pros: [
      'Finds the fewest-edges path on unweighted graphs',
      'Explores closer nodes before deeper ones',
    ],
    cons: [
      'Ignores edge weights — not for shortest cost',
      'Queue may grow large on wide graphs',
    ],
  },
  'traversal-dfs': {
    name: 'DFS — Depth-First Search',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Dives deep down one branch to a leaf, then backtracks to explore other branches. Pushes unseen neighbors onto a stack — revisits the most-recently-found node first.',
    pros: [
      'Low memory on narrow / deep graphs',
      'Natural fit for backtracking and path enumeration',
    ],
    cons: [
      'Does not find shortest paths by default',
      'Can recurse very deep on long chains',
    ],
  },
  'cc-bfs': {
    name: 'Connected Components — BFS',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Picks an unvisited node and BFS-floods to find all reachable nodes (one component). Repeats for each unvisited node. Color-codes each component differently.',
    pros: [
      'Single linear scan over the graph',
      'Reveals component sizes and members',
    ],
    cons: [
      'Defined for undirected graphs only here',
    ],
  },
  'cc-dfs': {
    name: 'Connected Components — DFS',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Picks an unvisited node and DFS-floods to find all reachable nodes (one component). Repeats for each unvisited node. Color-codes each component differently.',
    pros: [
      'Single linear scan over the graph',
      'Recursion mirrors how components branch out',
    ],
    cons: [
      'Defined for undirected graphs only here',
    ],
  },
  'cycle-bfs': {
    name: "Cycle Detection — Kahn's Algorithm (BFS)",
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Iteratively removes nodes with in-degree 0 (no incoming edges) and decrements their neighbors. Nodes that never reach in-degree 0 are trapped behind a cycle.',
    pros: [
      'Also gives a valid topological order when no cycle exists',
      'Iterative — no recursion depth concerns',
    ],
    cons: [
      'Cycle reconstruction requires a second walk over leftovers',
    ],
  },
  'cycle-dfs': {
    name: 'Cycle Detection — DFS Back-Edge',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Tracks nodes currently on the active DFS path. An edge pointing to a node already on that path is a back edge, which proves a cycle exists.',
    pros: [
      'Returns the cycle itself, not just a yes/no',
      'Stops the moment the first cycle is found',
    ],
    cons: [
      'Reports just one cycle even if many exist',
    ],
  },
  'bipartite-bfs': {
    name: 'Bipartite Check — BFS 2-Coloring',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Colors nodes with 0 or 1 as it explores level by level, alternating colors at each step. If any neighbor already has the current color, bipartiteness fails.',
    pros: [
      'Single pass over the graph',
      'Works component-by-component across disconnected graphs',
    ],
    cons: [
      'Undirected graphs only',
    ],
  },
  'bipartite-dfs': {
    name: 'Bipartite Check — DFS 2-Coloring',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Recursively assigns colors (0 or 1) to each neighbor, opposite to its parent. If any neighbor is already the current color, a conflict proves the graph is not bipartite.',
    pros: [
      'Single pass over the graph',
      'Compact recursive structure',
    ],
    cons: [
      'Undirected graphs only',
    ],
  },
  'sp-bfs': {
    name: 'Shortest Path — BFS',
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'BFS reaches every node by minimum edge-count from the start — the first time the goal is dequeued is guaranteed to be the shortest path.',
    pros: [
      'Guaranteed fewest-edges path',
      'Linear time on unweighted graphs',
    ],
    cons: [
      'Ignores edge weights',
    ],
  },
  'sp-dfs': {
    name: 'Shortest Path — DFS Exhaustive',
    time: 'O(V!) worst case',
    space: 'O(V)',
    summary: 'Exhaustively tries every simple path with backtracking, tracking the shortest found so far. Prunes branches longer than the current best to reduce search time.',
    pros: [
      'Always returns a true shortest path',
      'Pruning shortens the search in practice',
    ],
    cons: [
      'Exponential blowup on dense graphs',
      'Much slower than BFS for the same answer',
    ],
  },
  'wp-bfs': {
    name: 'Weighted Pathfinder — BFS',
    time: 'O(V!) worst case',
    space: 'O(2^V) worst case',
    summary: 'Explores every acyclic path using a queue (FIFO order, not by cost). Finds the true cheapest path because it eventually tries all possibilities.',
    pros: [
      'Finds the true minimum-cost path',
      'Visits paths in breadth-first order',
    ],
    cons: [
      'Exponential blowup on dense graphs',
      'Outperformed by Dijkstra on weighted graphs',
    ],
  },
  'wp-dfs': {
    name: 'Weighted Pathfinder — DFS',
    time: 'O(V!) worst case',
    space: 'O(V)',
    summary: 'Explores every acyclic path using a stack (LIFO order, not by cost). Finds the true cheapest path because it eventually tries all possibilities.',
    pros: [
      'Finds the true minimum-cost path',
      'Low memory while a single path is in flight',
    ],
    cons: [
      'Exponential blowup on dense graphs',
      'Outperformed by Dijkstra on weighted graphs',
    ],
  },
  'wp-dijkstra': {
    name: "Dijkstra's Algorithm",
    time: 'O((V + E) log V)',
    space: 'O(V)',
    summary: 'Greedily settles the cheapest unsettled node each iteration, then updates its neighbors. Each node settles once — guaranteed optimal on non-negative weights.',
    pros: [
      'Guaranteed shortest path on non-negative weights',
      'Each node is settled at most once',
    ],
    cons: [
      'Explores in every direction, ignoring the goal',
      'Cannot handle negative edge weights',
    ],
  },
  'wp-astar': {
    name: 'A* Search',
    time: 'O((V + E) log V)',
    space: 'O(V)',
    summary: 'Like Dijkstra, but orders the queue by g + h (known cost plus heuristic estimate to goal). Far fewer expansions with a good heuristic; optimal if the heuristic is admissible.',
    pros: [
      'Far fewer expansions than Dijkstra when the heuristic is informative',
      'Optimal when the heuristic is admissible (never overestimates)',
    ],
    cons: [
      'Optimality depends on the heuristic',
      'Heuristic computation adds per-node overhead',
    ],
  },
  'wp-greedy': {
    name: 'Greedy Best-First Search',
    time: 'O((V + E) log V)',
    space: 'O(V)',
    summary: 'Always expands the node looking closest to goal (lowest h value), ignoring true cost. Not optimal, but often finds a path fast if the heuristic points the right way.',
    pros: [
      'Very fast when the heuristic points the right way',
      'Often finds a path with few expansions',
    ],
    cons: [
      'Not optimal — may return any path, not the cheapest',
      'Can get stuck behind misleading heuristics',
    ],
  },
}
