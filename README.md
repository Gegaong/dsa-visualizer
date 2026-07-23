# Interactive DSA Visualizer

An interactive web-based sandbox for Data Structures and Algorithms. Features a drag-and-drop canvas to build custom graphs and step-by-step animations for visualizing algorithms like BFS, DFS, and Dijkstra, etc.

## Features

The visualizer is split into five distinct environments:

### 1. Unweighted Graphs

- **Canvas:** Drag-and-drop nodes, connect edges, toggle directed/undirected, and use preset templates.
- **Algorithms:** Breadth-First Search (BFS), Depth-First Search (DFS), Weakly Connected Components, Cycle Detection, Bipartite Check, Shortest Path.

### 2. Binary Trees

- **Canvas:** Grow the tree by clicking "+" slots for empty child positions, edit node values, delete a node and its subtree, and load preset trees (plain binary trees and valid BSTs), or convert any tree into a strict BST in place.
- **Algorithms:** Preorder, Inorder, Postorder, and Level-Order traversal (each searchable by target node, target value, or max/min value), plus BST-only operations — Validate BST, Search, Insert, and Delete (with successor promotion on two-child deletes).

### 3. Weighted Graphs

- **Canvas:** Edit edge weights, toggle directed/undirected.
- **Algorithms:** Dijkstra's Algorithm, A\* Search (Euclidean heuristic), Greedy Best-First Search.

### 4. Grid Environment

- **Canvas:** Paint land/water islands, toggle 4-directional or 8-directional connectivity, zoom controls.
- **Algorithms:** 6 combinations of Island Search (For-loop/BFS/DFS outer loops × BFS/DFS inner flood-fill).

### 5. N-Queens Solver

- **Canvas:** N×N chessboard (adjustable N).
- **Algorithms:** Backtracking solver with step-by-step playback, phase tracking, and conflict checking.

## Tech Stack

- **Framework:** React
- **Language:** TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest (Comprehensive coverage of pure algorithm logic)

## How to Run Locally

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation Steps

1. Clone the repository and navigate into the project directory:

```bash
git clone https://github.com/Gegaong/dsa-visualizer.git
cd dsa-visualizer
```

2. Install the required dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173` to view the application.

### Running Tests

To run the algorithm test suites (powered by Vitest):

```bash
npm run test
```

## Codebase Structure

The project is architected to strictly separate pure algorithmic logic from React UI and playback state. Within src/algorithms, src/components, and src/components/sidebar, code is further split by environment (graph, grid, nqueens, binaryTree), so each of the five environments' files live together instead of being interleaved across one flat folder:

- **src/algorithms/** — Pure TypeScript implementations of all algorithms, grouped into graph/, grid/, nqueens/, and binaryTree/ subfolders, each with its tests colocated next to the code they test. These functions return arrays of "Steps" (snapshots of state) and are fully unit-tested. Genuinely cross-domain pieces (algorithm info-card content, shared search types, test fixtures) stay at the folder's root.
- **src/hooks/** — Custom React hooks that consume algorithm steps and manage playback controls (play, pause, step forward/backward, speed).
- **src/components/** — The UI layer, including the interactive Canvas environments (split the same way as algorithms/) and a sidebar/ folder for the per-algorithm control panels and live pseudocode highlighting.
- **src/utils/** — Shared helpers for geometry (node/edge math), graph rules, canvas drawing, and visual constants (like island colors).

## Note on Traversal Order

When an algorithm (like BFS or DFS) reaches a node with multiple neighbors, the sequence in which those neighbors are visited can vary depending on the underlying implementation. While any valid order produces a mathematically correct traversal, unpredictable sequences can be confusing for educational purposes, so I made it deterministic.

To ensure the animations are intuitive and perfectly reproducible, **this visualizer strictly orders neighbors by their visible labels**.

Shorter labels are prioritized first, followed by standard alphabetical/numerical sorting. For example, the algorithm will always enqueue neighbor `A` before `B`, assuming it's normal BFS of course, between its "equal" neighbors. This guarantees that your graph will always produce the exact same step-by-step animation.

---

**Author:** Gega Ormotsadze  
_Bachelor's Degree Project — Free University of Tbilisi (MACS[E])_
