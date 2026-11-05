'use client'

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { BriefNode, type BriefNodeData } from './BriefNode'
import { NodePanel } from './NodePanel'

const nodeTypes = { briefNode: BriefNode }

interface BriefCanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
}

export function BriefCanvas({ initialNodes, initialEdges }: BriefCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const [selectedData, setSelectedData] = useState<BriefNodeData | null>(null)

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedData(node.data as BriefNodeData)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedData(null)
  }, [])

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={miniMapColor} maskColor="rgba(255,255,255,0.7)" />
      </ReactFlow>

      {selectedData && (
        <NodePanel data={selectedData} onClose={() => setSelectedData(null)} />
      )}
    </div>
  )
}

function miniMapColor(node: Node) {
  const status = (node.data as BriefNodeData)?.status
  const map: Record<string, string> = {
    confirmed: '#6ee7b7',
    drafted: '#93c5fd',
    vague: '#fcd34d',
    missing: '#fca5a5',
    rejected: '#d1d5db',
    needs_review: '#fdba74',
    changed: '#c4b5fd',
  }
  return map[status] ?? '#e5e7eb'
}
