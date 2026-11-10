'use client'

import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  type Position,
} from '@xyflow/react'

export function LaneEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const lane = Number((data as { lane?: number } | undefined)?.lane ?? 0)
  const stepPosition = Math.max(0.18, Math.min(0.82, 0.5 + lane * 0.08))
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition as Position,
    targetX,
    targetY,
    targetPosition: targetPosition as Position,
    borderRadius: 10,
    offset: 22,
    stepPosition,
  })

  return <BaseEdge path={path} style={{ ...style, strokeLinecap: 'round' }} />
}
