const DOOR_ORDER = ['research', 'objective', 'brief', 'outputs']
const NODE_WIDTH = 240
const NODE_HEIGHT = 110
const COL_GAP = 100
const ROW_GAP = 24
const DOOR_LABEL_HEIGHT = 48

export interface LayoutNode {
  id: string
  door: string
}

export interface LayoutPosition {
  id: string
  x: number
  y: number
}

export function computeLayout(nodes: LayoutNode[]): LayoutPosition[] {
  const doorX: Record<string, number> = {}
  DOOR_ORDER.forEach((door, i) => {
    doorX[door] = i * (NODE_WIDTH + COL_GAP)
  })

  const byDoor: Record<string, LayoutNode[]> = {}
  DOOR_ORDER.forEach(d => (byDoor[d] = []))
  nodes.forEach(n => {
    const door = n.door in byDoor ? n.door : 'outputs'
    byDoor[door].push(n)
  })

  const positions: LayoutPosition[] = []
  DOOR_ORDER.forEach(door => {
    const x = doorX[door] ?? 0
    byDoor[door].forEach((n, i) => {
      positions.push({
        id: n.id,
        x,
        y: DOOR_LABEL_HEIGHT + i * (NODE_HEIGHT + ROW_GAP),
      })
    })
  })

  return positions
}

export { DOOR_ORDER, NODE_WIDTH, NODE_HEIGHT }
