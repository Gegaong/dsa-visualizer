# Interactive DSA Visualizer

An interactive web-based sandbox for Data Structures and Algorithms. Features a drag-and-drop canvas to build custom graphs and step-by-step animations for visualizing algorithms like BFS, DFS, and weighted algorithms such as Dijkstra.

## Tech Stack

- **Framework:** React
- **Language:** TypeScript
- **Build Tool:** Vite

## How to run the webapp

```bash
npm install
npm run dev
```

## BFS and DFS visit order

When a node has more than one neighbor, the step-by-step order can vary. The app , of course, runs a correct BFS or DFS.s However, exact sequence of visits may change depending on how neighbors are ordered.

Here, neighbor order matches the order your edges are stored in after you build the graph. BFS and DFS both use that same order (BFS with a queue, DFS with a stack).

Your graph on screen always produces the same animation. Changing edges can change the order of steps. That is normal.

## Project Roadmap

- [x] Project setup + tooling
- [x] Base UI layout (top bar, canvas, sidebar)
- [x] Node creation + basic canvas rendering
- [x] Graph canvas environment (drag, connect edges, edit nodes, preset templates)
- [x] Graph algorithms (BFS, DFS, ...)
- [x] Weighted graph canvas environment (weights, edit edges, preset templates)
- [X] Weighted graph algorithms (BFS, DFS, Dijkstra, greedy search, A\* ...)
- [ ] Grid canvas environment (cells, walls, start/end, preset templates)
- [ ] Grid algorithms (BFS, DFS, ...)
- [ ] Maze canvas environment (maze generation + edit, preset templates)
- [ ] Maze algorithms (BFS, DFS, ...)
- [ ] Animation polish (colors, visited/path states)
- [ ] Final testing + documentation

I'll manage the actual details of this as I go on with the project so they'll get changed around a bit, the exact suitable algorithms for each dataset, exact steps I'll need, etc.

---

**Author:** Gega Ormotsadze
