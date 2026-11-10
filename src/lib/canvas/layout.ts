export const NODE_WIDTH = 240
export const NODE_HEIGHT = 126

const PALETTE_START_X = 460
const PALETTE_COLS = 3
const COL_GAP = 28
const ROW_GAP = 28

export const BRIEF_POSITION = { x: 60, y: 260 }
export const GOAL_POSITION = { x: 1300, y: 260 }

export interface LayoutNode {
  id: string
}

export interface LayoutPosition {
  id: string
  x: number
  y: number
}

export function computeLayout(nodes: LayoutNode[]): LayoutPosition[] {
  return nodes.map((n, i) => {
    const col = i % PALETTE_COLS
    const row = Math.floor(i / PALETTE_COLS)
    return {
      id: n.id,
      x: PALETTE_START_X + col * (NODE_WIDTH + COL_GAP),
      y: 60 + row * (NODE_HEIGHT + ROW_GAP),
    }
  })
}
