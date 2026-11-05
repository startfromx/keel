'use client'

import { STATUS_STYLES, type BriefNodeData } from './BriefNode'

interface NodePanelProps {
  data: BriefNodeData
  onClose: () => void
}

function renderContent(content: Record<string, unknown>) {
  return Object.entries(content).map(([key, val]) => {
    if (val === null || val === undefined) return null
    const label = key.replace(/_/g, ' ')
    if (Array.isArray(val)) {
      return (
        <div key={key} className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <ul className="space-y-1">
            {val.map((item, i) => (
              <li key={i} className="text-xs text-gray-700">
                {typeof item === 'object' ? (
                  <div className="pl-2 border-l border-gray-200 space-y-0.5">
                    {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                      <p key={k}><span className="text-gray-400">{k.replace(/_/g, ' ')}: </span>{String(v)}</p>
                    ))}
                  </div>
                ) : String(item)}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    if (typeof val === 'object') {
      return (
        <div key={key} className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <div className="pl-2 border-l border-gray-200 space-y-0.5">
            {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
              <p key={k} className="text-xs text-gray-700">
                <span className="text-gray-400">{k.replace(/_/g, ' ')}: </span>{String(v)}
              </p>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div key={key} className="mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-xs text-gray-700 leading-relaxed">{String(val)}</p>
      </div>
    )
  })
}

export function NodePanel({ data, onClose }: NodePanelProps) {
  const style = STATUS_STYLES[data.status] ?? STATUS_STYLES.missing

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">{data.label}</p>
          <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2 mt-0.5 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {data.assumption && (
          <div className="mb-4 p-2 bg-amber-50 rounded border border-amber-200">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Assumption</p>
            <p className="text-xs text-amber-800">{data.assumption}</p>
          </div>
        )}
        {renderContent(data.content)}
      </div>
    </div>
  )
}
