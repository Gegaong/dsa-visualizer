export const NODE_SIZE = 48
export const NODE_RADIUS = NODE_SIZE / 2
export const NODE_GAP = 8 // extra spacing between nodes (in px)
export const MIN_EDGE_VISUAL_LENGTH = 20
export const MIN_TOGGLE_EDGE_LENGTH = 36
export const TINY_EDGE_MARKER_EDGE_LENGTH = 16
export const SHORT_EDGE_MARKER_EDGE_LENGTH = 26
export const DEFAULT_CANVAS_WIDTH = 720
export const DEFAULT_CANVAS_HEIGHT = 560
export const DRAG_THRESHOLD = 3

// Shared playback slider → timer delay range (ms). Used by traversal + algorithm UI.
export const PLAYBACK_MIN_DELAY_MS = 1
export const PLAYBACK_MAX_DELAY_MS = 7000

// Canvas zoom bounds and step size.
export const CANVAS_ZOOM_MIN = 0.5
export const CANVAS_ZOOM_MAX = 2
export const CANVAS_ZOOM_STEP = 0.1

// Grid canvas row count controls zoom; cols are derived from the aspect ratio.
export const GRID_ROWS_DEFAULT = 19
export const GRID_ROWS_MIN = 4
export const GRID_ROWS_MAX = 60
export const GRID_ZOOM_STEP = 3

// Binary tree canvas layout: unscaled spacing between leaf-slot columns and between depth levels.
// The whole tree is rendered at these sizes, then uniformly scaled down to fit the container
// (never scaled up past 1) — this produces the "zooms out as it grows" effect.
export const TREE_NODE_SIZE = 48
export const TREE_UNIT_WIDTH = 72
export const TREE_LEVEL_HEIGHT = 96
export const TREE_TOP_PADDING = 40
export const TREE_BOTTOM_PADDING = 40

// Deepest level (root = depth 0) a real node may occupy. Nodes at this depth no longer show
// add-slot indicators, capping how tall a subtree can grow.
// depth 19 => max height 20 levels.
export const TREE_MAX_DEPTH = 19
