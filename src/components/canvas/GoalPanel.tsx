'use client'

import { useEffect, useState } from 'react'
import { DetailPanelHeader } from './DetailPanelHeader'

interface GoalPanelProps {
  goal: string
  output?: string
  width: number
  onWidthChange: (width: number) => void
  building?: boolean
  error?: string | null
  changes?: {
    added: string[]
    removed: string[]
    reordered: boolean
    goalChanged: boolean
  }
  onClose: () => void
}

export function GoalPanel({ goal, output, width, onWidthChange, building = false, error, changes, onClose }: GoalPanelProps) {
  const [resizing, setResizing] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [changesUnread, setChangesUnread] = useState(false)
  const isExpanded = width >= 640

  useEffect(() => {
    setChangesUnread(Boolean(changes && (changes.added.length || changes.removed.length || changes.reordered || changes.goalChanged)))
  }, [changes])

  const progressMessages = [
    'Reading the brief and connected nodes…',
    'Comparing the current chain with the existing Goal…',
    'Synthesizing the strongest recommendation…',
    'Writing the recommendation…',
  ]

  useEffect(() => {
    if (!building) {
      setProgressStep(0)
      return
    }
    const timer = window.setInterval(() => {
      setProgressStep(step => (step + 1) % progressMessages.length)
    }, 900)
    return () => window.clearInterval(timer)
  }, [building, progressMessages.length])

  useEffect(() => {
    if (!resizing) return
    document.body.style.cursor = 'col-resize'
    function resize(event: MouseEvent) {
      onWidthChange(Math.min(640, Math.max(320, window.innerWidth - event.clientX)))
    }
    function stopResize() {
      setResizing(false)
    }
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResize)
    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResize)
    }
  }, [onWidthChange, resizing])

  return (
    <aside className="absolute top-0 right-0 z-10 flex h-full flex-col border-l border-gray-200 bg-white shadow-lg" style={{ width }}>
      <button
        aria-label="Resize detail panel"
        onMouseDown={() => setResizing(true)}
        className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-slate-300/70"
      />
      <DetailPanelHeader
        title="Goal recommendation"
        subtitle={goal}
        expanded={isExpanded}
        onToggleExpand={() => onWidthChange(isExpanded ? 320 : 640)}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {changes && (changes.added.length || changes.removed.length || changes.reordered || changes.goalChanged) ? (
          <button
            type="button"
            onClick={() => setChangesUnread(false)}
            className={`mb-3 w-full rounded-xl border p-3 text-left transition-colors ${changesUnread ? 'border-amber-300 bg-amber-50 shadow-sm' : 'border-slate-200 bg-slate-50'}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wide ${changesUnread ? 'text-amber-700' : 'text-slate-500'}`}>
              {changesUnread ? 'Changes in this update' : 'Update changes'}
            </p>
            <div className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
              {changes.goalChanged && <p>• Goal changed to <span className="font-semibold">{goal}</span></p>}
              {changes.added.map(label => <p key={`added-${label}`}>• Added <span className="font-semibold">{label}</span> to the chain</p>)}
              {changes.removed.map(label => <p key={`removed-${label}`}>• Removed <span className="font-semibold">{label}</span> from the chain</p>)}
              {changes.reordered && <p>• Chain order changed</p>}
            </div>
            {changesUnread && <p className="mt-2 text-[10px] text-amber-700">Click to mark as read</p>}
          </button>
        ) : null}
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Recommendation</p>
          {building ? (
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {output ? (
                <div className="min-w-0 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">
                  {output}<span className="animate-pulse text-sky-500">▌</span>
                </div>
              ) : (
                <>
                  {progressMessages.slice(0, progressStep + 1).map((message, index) => (
                    <p key={message} className={index === progressStep ? 'animate-pulse' : 'text-slate-400'}>{message}</p>
                  ))}
                  <p className="text-xs text-slate-400">Keel is working through the canvas context…</p>
                </>
              )}
            </div>
          ) : error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>
          ) : (
            <div className="mt-4 min-w-0 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">
              {output || 'Build the Goal to generate a recommendation from the current canvas context.'}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
