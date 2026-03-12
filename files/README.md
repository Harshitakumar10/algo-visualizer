# AI Algorithm Visualizer

An interactive graph-based pathfinding visualizer built with pure HTML, CSS, and JavaScript — no frameworks, no dependencies.

## Live Demo

[View on GitHub Pages](https://YOUR-USERNAME.github.io/algo-visualizer/)

## Algorithms

| Algorithm | Type | Optimal? | Description |
|-----------|------|----------|-------------|
| **A\* Search** | Informed | ✅ Yes | Uses heuristic + cost to find the optimal path efficiently |
| **BFS** | Uninformed | ✅ Yes | Explores layer by layer; finds shortest path by hop count |
| **DFS** | Uninformed | ❌ No | Dives deep first; fast but path may not be shortest |
| **UCS** | Uninformed | ✅ Yes | Expands lowest-cost node; optimal for weighted graphs |

## Features

- Add custom graph nodes and weighted edges
- Visual step-by-step exploration (purple = exploring, green = optimal path)
- All explored paths shown before final path is highlighted
- Step-by-step log at the bottom
- 3 preset example graphs (Simple, Weighted, Complex)
- Adjustable animation speed

## How to Run

Just open `index.html` in any browser — no server needed.

## Project Structure

```
algo-visualizer/
├── index.html    ← HTML structure
├── style.css     ← All styling
├── script.js     ← All algorithms + animation logic
└── README.md     ← This file
```

## How to Use

1. Add nodes using the **Nodes** panel (e.g. A, B, C)
2. Add edges with weights in the **Edges** panel (e.g. A → B, weight 3)
3. Pick **Start** and **Goal** nodes from the dropdowns
4. Select an algorithm and press **Run Visualization**
5. Watch the algorithm explore (purple), then reveal the optimal path (green)
