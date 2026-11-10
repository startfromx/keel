'use client'

interface DetailPanelHeaderProps {
  title: string
  subtitle: string
  expanded: boolean
  onToggleExpand: () => void
  onClose: () => void
}

export function DetailPanelHeader({ title, subtitle, expanded, onToggleExpand, onClose }: DetailPanelHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-gray-100 px-6 pb-5 pt-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-sm font-medium uppercase tracking-wide text-slate-400">{subtitle}</p>
      </div>
      <div className="ml-3 mt-1 flex items-center gap-3 text-slate-400">
        <button onClick={onToggleExpand} aria-label={expanded ? 'Collapse panel' : 'Expand panel'} className="p-0.5 hover:text-slate-700">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2.5" y="3" width="15" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
            <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
        <button onClick={onClose} aria-label="Close panel" className="p-0.5 hover:text-slate-700">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
