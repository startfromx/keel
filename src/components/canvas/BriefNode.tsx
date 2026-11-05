'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  confirmed:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmed' },
  drafted:      { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Drafted' },
  vague:        { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Vague' },
  missing:      { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Missing' },
  rejected:     { bg: 'bg-gray-100',    text: 'text-gray-500',    label: 'Rejected' },
  needs_review: { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Needs review' },
  changed:      { bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'Changed' },
}

export interface BriefNodeData {
  label: string
  status: string
  content: Record<string, unknown>
  assumption?: string
  door: string
  type_key: string
  [key: string]: unknown
}

export function BriefNode({ data, selected }: NodeProps) {
  const d = data as BriefNodeData
  const style = STATUS_STYLES[d.status] ?? STATUS_STYLES.missing

  return (
    <div
      className={`
        w-60 rounded-lg border bg-white shadow-sm
        ${selected ? 'border-gray-900 shadow-md' : 'border-gray-200'}
        cursor-pointer transition-shadow
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-300 !w-2 !h-2" />
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs font-medium text-gray-900 leading-snug mb-2">{d.label}</p>
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {d.assumption && (
          <p className="mt-1.5 text-[10px] text-gray-400 italic leading-tight truncate">
            Assumes: {d.assumption}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-300 !w-2 !h-2" />
    </div>
  )
}
