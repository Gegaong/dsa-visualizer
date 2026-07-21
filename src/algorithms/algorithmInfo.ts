// Per-algorithm metadata shown in the sidebar info card (name, complexity, key properties).
// V = number of nodes, E = number of edges. For the binary tree traversals: n = number of
// nodes, h = tree height (recursion depth), w = the tree's widest level (max queue size).

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
  | 'nqueens'
  | 'bt-preorder'
  | 'bt-inorder'
  | 'bt-postorder'
  | 'bt-levelorder'
  | 'bt-validate'
  | 'bt-search'
  | 'bt-insert'
  | 'bt-delete'

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
    summary: 'Scans every cell once in a configurable order, skipping water and visited land instantly. When the scan lands on an unvisited land cell, an inner BFS flood-fills that whole island level by level before the outer scan resumes where it left off.',
    pros: [
      'Scan order is fully controllable — shows how discovery order affects which island is found first',
      'Straightforward to reason about: outer loop finds islands, inner BFS measures them',
    ],
    cons: [
      'No early exit — always scans the whole grid even if all islands are found early',
      'Two nested searches can be harder to trace than a single pass',
    ],
  },
  'grid-for-dfs': {
    name: 'For Loop + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Same outer scan as For Loop + BFS, but the inner fill is depth-first — it dives as far as possible along one direction before backtracking to catch the rest of the island. Only the fill order inside each island changes; the outer scan itself is untouched.',
    pros: [
      'Same predictable total work as the BFS-inner variant',
      'DFS fill order highlights snake-shaped or winding islands well',
    ],
    cons: [
      'No early exit — always scans the whole grid regardless of how many islands remain',
      'Stack-deep fills can look chaotic on irregular islands compared to BFS\'s tidy rings',
    ],
  },
  'grid-bfs-bfs': {
    name: 'BFS + BFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'The outer BFS expands outward from the start cell(s) in rings, reaching closer cells first regardless of land or water. When it dequeues an unvisited land cell, an inner BFS flood-fills that island level by level before the outer search resumes.',
    pros: [
      'Outer discovery order (closest cells first) suits "nearest island" style questions',
      'Supports multiple simultaneous start cells (multi-source BFS)',
    ],
    cons: [
      'Two BFS queues running at once makes the live state busier to follow',
      'Far-away islands are only discovered after everything closer is processed',
    ],
  },
  'grid-bfs-dfs': {
    name: 'BFS + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer BFS expands in rings from the start cell(s), same as BFS + BFS. The inner fill differs: once a land cell is dequeued, an inner DFS dives deep along one direction to flood that island instead of expanding level by level.',
    pros: [
      'Combines BFS\'s "nearest first" outer discovery with DFS\'s low-overhead inner fill',
      'Good for contrasting one outer strategy against two different inner fill styles',
    ],
    cons: [
      'Mixing BFS and DFS mid-algorithm makes the live state harder to predict',
      'Inner DFS fill order can look erratic on islands with many branches',
    ],
  },
  'grid-dfs-bfs': {
    name: 'DFS + BFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Outer DFS commits to one direction and backtracks only when stuck, rather than expanding in rings like BFS. When it pops an unvisited land cell, an inner BFS flood-fills that island level by level before the outer walk resumes.',
    pros: [
      'Outer DFS has less overhead per step than outer BFS on grids with clear "corridors"',
      'Good contrast case: fill order (inner) is independent of discovery order (outer)',
    ],
    cons: [
      'Outer discovery order is harder to predict than BFS\'s "nearest first"',
      'Deep outer stacks on winding regions are less intuitive to trace',
    ],
  },
  'grid-dfs-dfs': {
    name: 'DFS + DFS',
    time: 'O(M × N)',
    space: 'O(M × N)',
    summary: 'Both layers are depth-first: the outer walk winds through the grid via backtracking, and the inner fill floods each island the same way — diving deep along one direction before backtracking to catch the rest.',
    pros: [
      'Lowest bookkeeping overhead of the six combos — just two cooperating stacks',
      'Good for illustrating how far "just keep going" wanders before backtracking',
    ],
    cons: [
      'Least predictable discovery and fill order of the six combos',
      'Deep stacks on large winding regions are the least intuitive to read step by step',
    ],
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
    summary: 'Floods outward from any unvisited node with BFS to find every node reachable from it — that\'s one component — then repeats from the next unvisited node until none remain, coloring each component differently.',
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
    summary: 'Same idea as the BFS version, but floods each component depth-first, diving down one chain of neighbors before backtracking to pick up the rest.',
    pros: [
      'Single linear scan over the graph',
      'Recursion mirrors how components branch out',
    ],
    cons: [
      'Defined for undirected graphs only here',
      'Deep, chain-like components can push the call stack close to its limit',
    ],
  },
  'cycle-bfs': {
    name: "Cycle Detection — Kahn's Algorithm (BFS)",
    time: BFS_DFS_GENERIC_TIME,
    space: BFS_DFS_GENERIC_SPACE,
    summary: 'Repeatedly removes nodes whose in-degree has hit 0 (no remaining incoming edges) and decrements their neighbors. Nodes that never reach in-degree 0 are stuck waiting on each other — proof a cycle exists — and a short walk over those leftovers reconstructs one concrete cycle.',
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
    summary: 'Walks the graph depth-first, tracking which nodes are on the current active path from the root down. An edge pointing back to a still-active ancestor is a back edge — definitive proof of a cycle — and the search stops the instant one is found.',
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
    summary: 'Colors the start node 0 and BFS-floods outward, alternating colors (0/1) with each level. An edge connecting two same-colored nodes proves the graph isn\'t bipartite, since it means an odd cycle exists.',
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
    summary: 'Same 2-coloring idea as the BFS version, but recurses depth-first, coloring each child the opposite of its parent. A same-color conflict on any edge proves the graph isn\'t bipartite.',
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
    summary: 'Runs a standard BFS but stops the instant the goal is dequeued. Because BFS always explores nodes in strict order of hop-distance from the start, that first arrival is guaranteed to use the fewest possible edges.',
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
    summary: 'DFS has no built-in "closest first" order, so a guaranteed-shortest path means trying every simple path via backtracking and keeping the shortest one found. Branches that can no longer beat the current best are abandoned early, though the worst case still means trying most of them.',
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
    summary: 'Exhaustively explores every acyclic path by cost rather than edge count, using a FIFO queue — so every path of the current length is fully expanded before any longer path starts. That queueing order means an entire "generation" of same-length paths can sit in the queue at once, which is what makes memory usage blow up on dense graphs.',
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
    summary: 'Same exhaustive cost-search as the BFS version, but with a stack instead of a queue: popping the most-recently-discovered path means the search always keeps extending one branch to its end before backtracking to a sibling, so only the unexplored siblings along the current path are ever held in memory at once.',
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
    summary: 'Repeatedly pulls the cheapest not-yet-settled node from a priority queue, locks in its cost as final, and relaxes its neighbors — updating their best-known cost if this node offers a cheaper route. Since weights are never negative, once a node is settled no later discovery can ever beat it, so each node is settled exactly once.',
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
    summary: 'Same settle-and-relax machinery as Dijkstra, but orders the priority queue by g + h — known cost so far plus a heuristic estimate of the remaining distance to the goal — which steers the search toward the goal instead of expanding equally in every direction. Only optimal when the heuristic never overestimates the true remaining cost.',
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
    summary: 'Uses the same priority queue as Dijkstra and A*, but orders purely by the heuristic h and ignores cost so far entirely. That makes it commit fast to a promising-looking direction, but it can walk straight past a cheaper route and never reconsider once a node is popped.',
    pros: [
      'Very fast when the heuristic points the right way',
      'Often finds a path with few expansions',
    ],
    cons: [
      'Not optimal — may return any path, not the cheapest',
      'Can get stuck behind misleading heuristics',
    ],
  },
  'nqueens': {
    name: 'N-Queens Backtracking',
    time: 'O(N!)',
    space: 'O(N)',
    summary: 'Places queens column by column: for the current column, every row is tried in turn, and a queen is locked in if it doesn\'t conflict with an already-placed queen on the same row or diagonal (columns can\'t conflict, since each column gets exactly one queen). A dead end — every row in a column conflicts — backtracks to the previous column and tries its next row instead of restarting.',
    pros: [
      'Finds every valid solution, not just the first',
      'Conflict pruning cuts most branches before they are explored',
    ],
    cons: [
      'Work grows factorially — large N values are slow',
    ],
  },
  'bt-preorder': {
    name: 'Preorder Traversal',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Visits the node itself first, then its entire left subtree, then its entire right subtree. This "node first" order is why preorder is the natural way to serialize a tree and rebuild its exact shape later.',
    pros: [
      'Visits parents before children — natural for copying or serializing a tree',
      'Simple recursive structure',
    ],
    cons: [
      "Doesn't produce sorted output, even on a binary search tree",
    ],
  },
  'bt-inorder': {
    name: 'Inorder Traversal',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Visits the entire left subtree, then the node, then the entire right subtree. On a binary search tree specifically, this order reads out every value from smallest to largest.',
    pros: [
      'Produces values in sorted order on a binary search tree',
      'Simple recursive structure',
    ],
    cons: [
      'Not meaningful as a copy/serialization order',
    ],
  },
  'bt-postorder': {
    name: 'Postorder Traversal',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Visits both children fully before their parent: the entire left subtree, then the entire right subtree, then the node itself. That\'s why it\'s the safe order for deleting a tree — nothing is ever removed while something still depends on it.',
    pros: [
      'Children are visited before their parent — safe order for deleting or freeing a tree',
      'Simple recursive structure',
    ],
    cons: [
      'Every node below a subtree must be visited before that subtree\'s root is',
    ],
  },
  'bt-levelorder': {
    name: 'Level-Order Traversal',
    time: 'O(n)',
    space: 'O(w)',
    summary: 'Visits nodes level by level from the root down, left to right within each level, using a queue instead of recursion — the same idea as graph BFS.',
    pros: [
      'Visits nodes closest to the root first',
      'Reveals the tree\'s shape one level at a time',
    ],
    cons: [
      'Needs a queue — more memory than the recursive traversals on wide trees',
    ],
  },
  'bt-validate': {
    name: 'Validate BST',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Walks the tree carrying a shrinking (min, max) window of legal values: going left tightens the max to the parent\'s value, going right raises the min. A node landing outside the window it inherited from its ancestors breaks the search-tree property.',
    pros: [
      'One depth-first walk confirms the full search-tree property',
      'Can fail fast as soon as a violating node is found',
    ],
    cons: [
      'Requires every node to hold a comparable numeric value',
    ],
  },
  'bt-search': {
    name: 'BST Search',
    time: 'O(h)',
    space: 'O(h)',
    summary: 'Compares the target to the current node and skips one entire subtree at each step — left if the target is smaller, right if larger — since everything in the skipped subtree is guaranteed to be on the wrong side. Only one root-to-leaf path is ever walked, never the whole tree.',
    pros: [
      'Only follows one root-to-leaf path — much faster than a full traversal on tall trees',
      'Natural fit for sorted dictionaries and ordered maps',
    ],
    cons: [
      'Correctness depends on the tree actually being a BST',
      'Degenerates to a full-height walk on a skewed tree',
    ],
  },
  'bt-insert': {
    name: 'BST Insert',
    time: 'O(h)',
    space: 'O(h)',
    summary: 'Walks from the root using the same shrinking-bounds logic as Validate BST, stopping at the first empty child slot to create the new leaf there — or rejecting the insert outright if the value already exists.',
    pros: [
      'Keeps strict search-tree order: left < node < right',
      'Same bound-passing idea as Validate BST, on a single root-to-leaf walk',
    ],
    cons: [
      'Does not rebalance — repeated inserts can skew the tree toward a slow, linked-list shape',
      'Duplicate values are rejected instead of stored',
    ],
  },
  'bt-delete': {
    name: 'BST Delete',
    time: 'O(h)',
    space: 'O(h)',
    summary: 'Locates the key the same way Search does, then removes it based on its children: zero or one child gets spliced out directly with its child promoted into its place; two children instead copies in the inorder successor\'s value (the smallest value in the right subtree, found by walking left as far as possible) and then deletes that successor using the simple one-child case.',
    pros: [
      'Preserves strict BST order after every case',
      'Successor copy makes the value hand-off visible before the structure changes',
    ],
    cons: [
      'Two-child case walks the right subtree twice (find min, then delete it)',
      'Does not rebalance — deletes can still leave a skewed tree',
    ],
  },
}
