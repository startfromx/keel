'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface BriefInputData {
  brand?: string
  briefType?: string
  raw?: string
  [key: string]: unknown
}

export function BriefInput({ data }: NodeProps) {
  const d = data as unknown as BriefInputData
  return (
    <div className="w-[280px] cursor-move select-none rounded-xl border border-slate-500 bg-slate-900 shadow-lg overflow-hidden">
      <Handle type="source" position={Position.Right} className="!bg-sky-400 !w-3 !h-3" />
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-300">Brief Input</p>
        <p className="text-[11px] text-slate-400 mt-1">The source brief feeding the map</p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-white">{d.brand || 'Untitled brief'}</p>
        {d.briefType && <p className="text-[11px] text-slate-400">{d.briefType}</p>}
        <p className="text-xs leading-relaxed text-slate-300 line-clamp-6">
          {d.raw || 'No brief text provided.'}
        </p>
      </div>
    </div>
  )
}

export interface GoalNodeData {
  goal?: string
  goalOptions?: string[]
  onChangeGoal?: (goal: string) => void
  savingGoal?: boolean
  onBuild?: () => void
  building?: boolean
  output?: string
  error?: string | null
  dirty?: boolean
  [key: string]: unknown
}

export function GoalNode({ data }: NodeProps) {
  const d = data as unknown as GoalNodeData
  const [editing, setEditing] = useState(false)
  const [customGoal, setCustomGoal] = useState(d.goal ?? '')
  const options = d.goalOptions ?? []

  function chooseGoal(goal: string) {
    setCustomGoal(goal)
    setEditing(false)
    d.onChangeGoal?.(goal)
  }

  return (
    <div className="relative w-[280px] cursor-move select-none rounded-xl border border-sky-500/40 bg-slate-900 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !w-3 !h-3" />
      <div className="rounded-t-xl bg-slate-800/80 px-4 py-3 border-b border-slate-700">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-300">Goal</p>
        <button
          className="nodrag nopan mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-slate-600 bg-slate-900/60 px-2.5 py-2 text-left text-sm font-semibold text-white transition-colors hover:border-sky-400 hover:text-sky-300"
          onClick={event => { event.stopPropagation(); setEditing(value => !value) }}
          title="Change Goal"
          aria-expanded={editing}
        >
          <span className="min-w-0 truncate">{d.goal || 'Campaign Brief'}</span>
          <span aria-hidden="true" className="shrink-0 text-xs text-slate-400">{editing ? '▴' : '▾'}</span>
        </button>
        <p className="mt-1 text-[10px] text-slate-500">Click to change goal</p>
        {editing && (
          <div className="nodrag nopan absolute left-4 top-[68px] z-30 w-[248px] rounded-lg border border-slate-600 bg-slate-900 p-2 shadow-xl">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Change Goal</p>
            {options.map(option => (
              <button key={option} onClick={() => chooseGoal(option)} className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-700">
                {option}
              </button>
            ))}
            <form onSubmit={event => { event.preventDefault(); chooseGoal(customGoal) }} className="mt-2 flex gap-1 border-t border-slate-700 pt-2">
              <input value={customGoal} onChange={event => setCustomGoal(event.target.value)} placeholder="Custom Goal" className="min-w-0 flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs text-white outline-none ring-sky-400 focus:ring-1" />
              <button type="submit" disabled={!customGoal.trim() || d.savingGoal} className="rounded bg-sky-500 px-2 text-[10px] font-semibold text-slate-950 disabled:opacity-50">Save</button>
            </form>
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Every node on the canvas informs this output. Wire nodes onto the line to set the working order, then build.
        </p>
        <button
          onClick={event => { event.stopPropagation(); d.onBuild?.() }}
          disabled={d.building || !d.onBuild}
          className={`nodrag nopan w-full px-4 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${d.dirty ? 'border-amber-400/60 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'border-sky-500/30 bg-sky-600/20 text-sky-400 hover:bg-sky-600/30'}`}
        >
          {d.building ? 'Building…' : d.dirty ? 'Update Goal' : 'Build Goal'}
        </button>
        {d.error && <p className="mt-2 text-[10px] leading-relaxed text-red-300">{d.error}</p>}
      </div>
    </div>
  )
}
