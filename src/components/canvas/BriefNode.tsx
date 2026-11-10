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
  prompt?: string
  active?: boolean
  loading?: boolean
  onRemove?: () => void
  [key: string]: unknown
}

export function BriefNode({ data, selected }: NodeProps) {
  const d = data as BriefNodeData
  const style = STATUS_STYLES[d.status] ?? STATUS_STYLES.missing
  const isActive = d.active === true

  const preview = Object.values(d.content)
    .map(value => {
      if (typeof value === 'string') return value
      if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ')
      if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).join(', ')
      return ''
    })
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`
        group relative h-[126px] w-60 rounded-lg border bg-[#101318] shadow-lg
        ${selected ? 'border-[#38bdf8] shadow-xl' :
          isActive ? 'border-sky-500/60 shadow-sky-900/30' : 'border-slate-700/40'}
        ${isActive ? 'opacity-100' : 'opacity-55'}
        cursor-pointer transition-all duration-200
      `}
      >
      {d.onRemove && (
        <button
          aria-label={`Remove ${d.label}`}
          title="Remove node"
          onClick={event => { event.stopPropagation(); d.onRemove?.() }}
          className={`nodrag nopan absolute -right-2.5 -top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-[#101318] text-xs font-bold leading-none text-slate-200 transition-opacity hover:bg-slate-800 hover:text-white ${selected ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} className="!bg-slate-300 !w-3 !h-3" />
      <div className="h-full overflow-hidden rounded-lg">
        <div className="px-3 pt-3 pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-white leading-snug">{d.label}</p>
            <span
              title={
                d.status === 'missing' ? 'Action needed: add an answer or evidence.' :
                d.status === 'needs_review' ? 'Action needed: review and apply or dismiss.' : undefined
              }
              className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
            >
              {style.label}
            </span>
          </div>
          {d.loading ? (
            <p className="text-[11px] text-slate-400 italic leading-relaxed">Reading this brief and the existing canvas context…</p>
          ) : preview ? (
            <p className="[overflow-wrap:anywhere] text-[11px] text-slate-300 leading-relaxed line-clamp-3">{preview}</p>
          ) : d.prompt ? (
            <p className="[overflow-wrap:anywhere] text-[11px] text-slate-400 italic leading-relaxed line-clamp-3">{d.prompt}</p>
          ) : null}
          {d.assumption && (
            <p className="mt-1.5 [overflow-wrap:anywhere] text-[10px] text-amber-300 italic leading-tight line-clamp-1">
              Assumes: {d.assumption}
            </p>
          )}
          {!isActive && (
            <p className="mt-2 text-[9px] text-slate-600 italic">drag up to chain</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-300 !w-3 !h-3" />
    </div>
  )
}
