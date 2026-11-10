'use client'

import { useEffect, useRef, useState } from 'react'
import { STATUS_STYLES, type BriefNodeData } from './BriefNode'
import { DetailPanelHeader } from './DetailPanelHeader'

interface NodePanelProps {
  nodeId: string
  data: BriefNodeData
  width: number
  onWidthChange: (width: number) => void
  onClose: () => void
  onApplied: () => void
}

interface ThreadRow {
  id: string
  role: 'user' | 'ai'
  text: string
}

interface ProposalRow {
  id: string
  proposed_content: Record<string, unknown>
  proposed_status: string | null
  state: 'pending' | 'applied' | 'dismissed'
}

interface ClientQuestion {
  id: string
  text: string
  added: boolean
}

function getInlineProposal(proposals: ProposalRow[], sectionKey: string) {
  return proposals.find(proposal => proposal.state === 'pending' && proposal.proposed_content.__keel_target_section === sectionKey)
}

function InlineProposal({ proposal, onAction }: { proposal?: ProposalRow; onAction: (proposalId: string, action: 'apply' | 'dismiss') => void }) {
  if (!proposal) return null
  const proposedValue = proposal.proposed_content.__keel_proposed_value
  const displayValue = typeof proposedValue === 'string' ? proposedValue : JSON.stringify(proposedValue)
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Suggested update</p>
      <p className="mt-1 text-xs leading-5 text-amber-950">{displayValue}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => onAction(proposal.id, 'apply')} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white">Apply here</button>
        <button type="button" onClick={() => onAction(proposal.id, 'dismiss')} className="rounded-md border border-amber-300 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">Dismiss</button>
      </div>
    </div>
  )
}

interface SectionCommentProps {
  value: string
  sending: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

type AttentionAction = 'add_answer' | 'ask_client' | 'search_online' | 'leave_unresolved'

function ConfirmMarker({ detail, onAction }: { detail?: string; onAction?: (action: AttentionAction, response?: string) => void }) {
  const markerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<AttentionAction | null>(null)
  const [response, setResponse] = useState('')
  const [unresolved, setUnresolved] = useState(false)
  const actions: Array<{ key: AttentionAction; label: string }> = [
    { key: 'add_answer', label: 'Add answer' },
    { key: 'ask_client', label: 'Ask client' },
    { key: 'search_online', label: 'Search online' },
    { key: 'leave_unresolved', label: 'Leave unresolved' },
  ]

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: MouseEvent) {
      if (markerRef.current && !markerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  function choose(action: AttentionAction) {
    if (action === 'leave_unresolved') {
      setUnresolved(true)
      setOpen(false)
      onAction?.(action)
      return
    }
    if (action === 'search_online') {
      onAction?.(action, detail)
      setOpen(false)
      return
    }
    setActiveAction(action)
    setResponse('')
  }

  function submitResponse(event: React.FormEvent) {
    event.preventDefault()
    if (!activeAction || !response.trim()) return
    onAction?.(activeAction, response.trim())
    setOpen(false)
    setActiveAction(null)
    setResponse('')
  }

  return (
    <span ref={markerRef} className="relative mx-1 inline-block align-baseline">
      <button
        type="button"
        onClick={() => { setOpen(value => !value); setActiveAction(null) }}
        className="text-left font-semibold text-amber-700 underline decoration-amber-400 decoration-dotted underline-offset-2 transition-colors hover:text-amber-900"
        aria-label={detail ? `Needs confirmation: ${detail}` : 'Needs confirmation'}
      >
        {unresolved ? '!' : detail ? `Needs input: ${detail}` : 'Needs input'}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          <span className="block px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Needs attention</span>
          {!activeAction ? actions.map(action => (
            <button
              key={action.key}
              type="button"
              onClick={() => choose(action.key)}
              className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${action.key === 'leave_unresolved' ? 'text-slate-500 hover:bg-slate-50' : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'}`}
            >
              {action.label}
            </button>
          )) : (
            <form onSubmit={submitResponse} className="p-1">
              <p className="px-1 pb-2 text-[11px] leading-4 text-slate-500">
                {activeAction === 'add_answer' && 'Add the missing fact.'}
                {activeAction === 'ask_client' && 'What should the client confirm?'}
              </p>
              <input
                autoFocus
                value={response}
                onChange={event => setResponse(event.target.value)}
                placeholder={activeAction === 'add_answer' ? 'Type the answer…' : activeAction === 'ask_client' ? 'Type the question…' : 'Type a search question…'}
                className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-amber-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <button type="button" onClick={() => setActiveAction(null)} className="px-1 text-[11px] text-slate-400 hover:text-slate-700">Back</button>
                <button type="submit" disabled={!response.trim()} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-30">Save</button>
              </div>
            </form>
          )}
        </span>
      )}
    </span>
  )
}

function WandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" />
      <path d="M15 9h.01" />
      <path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 11 5" />
    </svg>
  )
}

function SectionComment({ value, sending, onChange, onSubmit }: SectionCommentProps) {
  const [open, setOpen] = useState(Boolean(value))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comment on this section"
        title="Comment on this section"
        className="ml-1 inline-flex h-6 w-6 translate-y-0.5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-700"
      >
        <WandIcon />
      </button>
    )
  }

  return (
    <form onSubmit={event => { event.preventDefault(); onSubmit() }} className="mt-2 flex items-end gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (value.trim() && !sending) onSubmit()
          }
        }}
        rows={1}
        placeholder="What is not right, missing, or needs to change?"
        className="min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
      />
      <button
        type="button"
        aria-label="Close comment"
        title="Close comment"
        onClick={() => setOpen(false)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        ×
      </button>
      <button
        type="submit"
        aria-label="Send comment"
        disabled={sending || !value.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 5v8a2 2 0 0 1-2 2H6" />
          <path d="m10 11-4 4 4 4" />
        </svg>
      </button>
    </form>
  )
}

function renderValue(value: unknown, sectionKey: string, onAttentionAction?: (sectionKey: string, action: AttentionAction, response?: string) => void) {
  const text = String(value)
  const tokenPattern = /\[CONFIRM(?:\s*[–—-]\s*([^\]]+))?\]|https?:\/\/[^\s)]+/gi
  const fragments: React.ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) fragments.push(text.slice(cursor, match.index))
    if (match[0].toLowerCase().startsWith('http')) {
      const trailing = match[0].match(/[.,;:!?]+$/)?.[0] ?? ''
      const href = trailing ? match[0].slice(0, -trailing.length) : match[0]
      fragments.push(<a key={`${match.index}-${match[0]}`} href={href} target="_blank" rel="noreferrer" className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900">{href}</a>)
      if (trailing) fragments.push(trailing)
    } else {
      fragments.push(<ConfirmMarker key={`${match.index}-${match[0]}`} detail={match[1]?.trim()} onAction={(action, response) => onAttentionAction?.(sectionKey, action, response)} />)
    }
    cursor = match.index + match[0].length
  }
  if (!fragments.length) return text
  if (cursor < text.length) fragments.push(text.slice(cursor))
  return <>{fragments}</>
}

function renderSourceValue(value: unknown, sectionKey: string, onAttentionAction?: (sectionKey: string, action: AttentionAction, response?: string) => void) {
  const text = String(value)
  const hasUrl = /https?:\/\/\S+/i.test(text)
  return (
    <>
      {renderValue(value, sectionKey, onAttentionAction)}
      {!hasUrl && text.trim() && (
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="ml-2 whitespace-nowrap text-[0.85em] font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
        >
          Find source ↗
        </a>
      )}
    </>
  )
}

function renderContent(
  content: Record<string, unknown> | undefined,
  sectionDrafts: Record<string, string>,
  sectionSending: string | null,
  onDraftChange: (key: string, value: string) => void,
  onSubmit: (key: string) => void,
  onAttentionAction: (sectionKey: string, action: AttentionAction, response?: string) => void,
  proposals: ProposalRow[],
  onProposalAction: (proposalId: string, action: 'apply' | 'dismiss') => void,
) {
  return Object.entries(content ?? {}).map(([key, val]) => {
    if (val === null || val === undefined) return null
    const label = key.replace(/_/g, ' ')
    if (Array.isArray(val)) {
      return (
        <div key={key} className="mb-5">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">{label}</p>
          <ul className="space-y-2 text-sm leading-7">
            {val.map((item, i) => (
              <li key={i} className="text-sm text-gray-700 leading-7">
                {typeof item === 'object' ? (
                  <div className="pl-3 border-l border-gray-200 space-y-1">
                    {Object.entries(item as Record<string, unknown>).map(([k, v], entryIndex, entries) => (
                      <p key={k}>
                        <span className="text-gray-400">{k.replace(/_/g, ' ')}: </span>{k.toLowerCase().includes('source') ? renderSourceValue(v, `${key}.${i}`, onAttentionAction) : renderValue(v, `${key}.${i}`, onAttentionAction)}
                        {entryIndex === entries.length - 1 && (
                          <SectionComment
                            value={sectionDrafts[`${key}.${i}`] ?? ''}
                            sending={sectionSending === `${key}.${i}`}
                            onChange={value => onDraftChange(`${key}.${i}`, value)}
                            onSubmit={() => onSubmit(`${key}.${i}`)}
                          />
                        )}
                      </p>
                    ))}
                    <InlineProposal proposal={getInlineProposal(proposals, `${key}.${i}`)} onAction={onProposalAction} />
                  </div>
                ) : (
                  <>
                    {key.toLowerCase().includes('source') ? renderSourceValue(item, `${key}.${i}`, onAttentionAction) : renderValue(item, `${key}.${i}`, onAttentionAction)}
                    <SectionComment
                      value={sectionDrafts[`${key}.${i}`] ?? ''}
                      sending={sectionSending === `${key}.${i}`}
                      onChange={value => onDraftChange(`${key}.${i}`, value)}
                      onSubmit={() => onSubmit(`${key}.${i}`)}
                    />
                    <InlineProposal proposal={getInlineProposal(proposals, `${key}.${i}`)} onAction={onProposalAction} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    if (typeof val === 'object') {
      return (
        <div key={key} className="mb-5">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">{label}</p>
          <div className="pl-3 border-l border-gray-200 space-y-1 text-sm leading-7">
            {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
              <p key={k} className="text-sm text-gray-700">
                <span className="text-gray-400">{k.replace(/_/g, ' ')}: </span>{k.toLowerCase().includes('source') ? renderSourceValue(v, key, onAttentionAction) : renderValue(v, key, onAttentionAction)}
              </p>
            ))}
          </div>
          <SectionComment value={sectionDrafts[key] ?? ''} sending={sectionSending === key} onChange={value => onDraftChange(key, value)} onSubmit={() => onSubmit(key)} />
          <InlineProposal proposal={getInlineProposal(proposals, key)} onAction={onProposalAction} />
        </div>
      )
    }
    return (
      <div key={key} className="mb-5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-gray-700 leading-7">{key.toLowerCase().includes('source') ? renderSourceValue(val, key, onAttentionAction) : renderValue(val, key, onAttentionAction)}</p>
        <SectionComment value={sectionDrafts[key] ?? ''} sending={sectionSending === key} onChange={value => onDraftChange(key, value)} onSubmit={() => onSubmit(key)} />
        <InlineProposal proposal={getInlineProposal(proposals, key)} onAction={onProposalAction} />
      </div>
    )
  })
}

export function NodePanel({ nodeId, data, width, onWidthChange, onClose, onApplied }: NodePanelProps) {
  const style = STATUS_STYLES[data.status] ?? STATUS_STYLES.missing
  const [resizing, setResizing] = useState(false)
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [message, setMessage] = useState('')
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({})
  const [sectionSending, setSectionSending] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attentionMessage, setAttentionMessage] = useState<string | null>(null)
  const [attentionSending, setAttentionSending] = useState(false)
  const [clientQuestions, setClientQuestions] = useState<ClientQuestion[]>([])

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

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`/api/nodes/${nodeId}/thread`)
      .then(response => response.json())
      .then(json => {
        if (cancelled) return
        setThreads(json.threads ?? [])
        setProposals(json.proposals ?? [])
      })
      .catch(() => { if (!cancelled) setError('Could not load node thread.') })
    return () => { cancelled = true }
  }, [nodeId])

  function startResize() {
    setResizing(true)
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/nodes/${nodeId}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not create proposal')
      const now = Date.now()
      setThreads(prev => [...prev, { id: `local-user-${now}`, role: 'user', text: message }, { id: `local-ai-${now}`, role: 'ai', text: json.rationale }])
      setProposals(prev => [json.proposal, ...prev])
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create proposal')
    } finally {
      setSending(false)
    }
  }

  async function sendSectionComment(sectionKey: string) {
    const comment = sectionDrafts[sectionKey]?.trim()
    if (!comment || sectionSending) return
    const [rawSection, rawIndex] = sectionKey.split('.')
    const label = rawIndex ? `${rawSection.replace(/_/g, ' ')} paragraph ${Number(rawIndex) + 1}` : rawSection.replace(/_/g, ' ')
    setSectionSending(sectionKey)
    setError(null)
    try {
      const response = await fetch(`/api/nodes/${nodeId}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Revise only the “${label}” section. Client comment: ${comment}` }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not create section revision')
      const now = Date.now()
      setThreads(prev => [...prev, { id: `local-user-${now}`, role: 'user', text: comment }, { id: `local-ai-${now}`, role: 'ai', text: json.rationale }])
      setProposals(prev => [json.proposal, ...prev])
      setSectionDrafts(prev => ({ ...prev, [sectionKey]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create section revision')
    } finally {
      setSectionSending(null)
    }
  }

  async function sendAttentionAction(sectionKey: string, action: AttentionAction, response?: string) {
    if (action === 'leave_unresolved') {
      setAttentionMessage('This item is marked unresolved. It will stay visible until evidence or direction is added.')
      return
    }
    if (attentionSending) return
    if (action !== 'search_online' && !response?.trim()) return
    const [rawSection, rawIndex] = sectionKey.split('.')
    const label = rawIndex ? `${rawSection.replace(/_/g, ' ')} paragraph ${Number(rawIndex) + 1}` : rawSection.replace(/_/g, ' ')
    const actionText = action === 'add_answer'
      ? `The user supplied this answer for only the “${label}” paragraph: ${response}. Propose the smallest defensible revision using this answer.`
      : action === 'ask_client'
        ? `Create a clear client question for only the “${label}” paragraph based on this requested clarification: ${response}. Keep the node content unresolved until the client answers.`
        : `Research the “${label}” paragraph using its current content and the missing confirmation context. Return a proposal with cited source URLs where possible; never invent facts, and keep [CONFIRM] if evidence is unavailable.`
    setAttentionSending(true)
    setAttentionMessage(action === 'search_online' ? 'Preparing an evidence-backed proposal for this paragraph…' : 'Preparing a targeted proposal…')
    setError(null)
    try {
      const requestText = `${actionText}\n\nThis is a targeted inline action. Do not rewrite unrelated sections.`
      const responseResult = await fetch(`/api/nodes/${nodeId}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: requestText,
          target_section: sectionKey,
          mode: action === 'ask_client' ? 'client_question' : 'proposal',
        }),
      })
      const json = await responseResult.json()
      if (!responseResult.ok) throw new Error(json.error ?? 'Could not create proposal')
      const now = Date.now()
      if (action === 'ask_client') {
        setClientQuestions(prev => [{ id: `client-question-${now}`, text: json.client_question, added: false }, ...prev])
        setAttentionMessage('Client question ready below. Add it to your Questions for client list or copy it.')
        return
      }
      setThreads(prev => [...prev, { id: `local-user-${now}`, role: 'user', text: response ?? actionText }, { id: `local-ai-${now}`, role: 'ai', text: json.rationale }])
      setProposals(prev => [json.proposal, ...prev])
      setAttentionMessage('Proposal ready below. Review it, then Apply or Dismiss.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create proposal')
      setAttentionMessage(null)
    } finally {
      setAttentionSending(false)
    }
  }

  async function decideProposal(proposalId: string, action: 'apply' | 'dismiss') {
    const response = await fetch(`/api/proposals/${proposalId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await response.json()
    if (!response.ok) {
      setError(json.error ?? 'Could not update proposal')
      return
    }
    setProposals(prev => prev.map(proposal => proposal.id === proposalId ? { ...proposal, state: action === 'apply' ? 'applied' : 'dismissed' } : proposal))
    if (action === 'apply') onApplied()
  }

  const isExpanded = width >= 640

  function toggleExpand() {
    onWidthChange(isExpanded ? 320 : 640)
  }

  return (
    <div
      className="absolute top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col"
      style={{ width }}
    >
      <button
        aria-label="Resize detail panel"
        onMouseDown={startResize}
        className="absolute left-0 top-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-slate-300/70 z-20"
      />
      <DetailPanelHeader
        title={data.label}
        subtitle={style.label}
        expanded={isExpanded}
        onToggleExpand={toggleExpand}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {attentionMessage && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>{attentionMessage}</span>
            <button type="button" onClick={() => setAttentionMessage(null)} className="text-amber-700 hover:text-amber-950" aria-label="Dismiss attention message">×</button>
          </div>
        )}
        {clientQuestions.map(question => (
          <div key={question.id} className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Client question</p>
            <p className="mt-1 text-sm leading-6 text-slate-800">{question.text}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => navigator.clipboard?.writeText(question.text)} className="rounded-md border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-800">Copy</button>
              <button type="button" onClick={() => { setClientQuestions(prev => prev.map(item => item.id === question.id ? { ...item, added: true } : item)); setAttentionMessage('Added to Questions for client.') }} disabled={question.added} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">{question.added ? 'Added' : 'Add to Questions for client'}</button>
            </div>
          </div>
        ))}
        {(data.status === 'missing' || data.status === 'needs_review') && (
          <div className={`mb-4 rounded-lg border p-3 ${data.status === 'missing' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${data.status === 'missing' ? 'text-red-700' : 'text-orange-700'}`}>
              {data.status === 'missing' ? 'Action needed' : 'Review needed'}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${data.status === 'missing' ? 'text-red-900' : 'text-orange-900'}`}>
              {data.status === 'missing'
                ? 'Add the missing answer, evidence, or client direction below. Keel will turn your response into a proposal for this node.'
                : 'Check what changed, then apply the pending proposal if it is correct or dismiss it to keep the current node.'}
            </p>
          </div>
        )}
        {data.assumption && (
          <div className="mb-4 p-2 bg-amber-50 rounded border border-amber-200">
        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1">Assumption</p>
            <p className="text-xs text-amber-800">{data.assumption}</p>
          </div>
        )}
        {renderContent(
          data.content,
          sectionDrafts,
          sectionSending,
          (key, value) => setSectionDrafts(prev => ({ ...prev, [key]: value })),
          sendSectionComment,
          sendAttentionAction,
          proposals,
          decideProposal,
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Thread</p>
          <div className="mt-3 space-y-2">
            {threads.map(thread => (
              <div key={thread.id} className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${thread.role === 'user' ? 'bg-slate-100 text-slate-700' : 'bg-sky-50 text-sky-900'}`}>
                {thread.text}
              </div>
            ))}
            {!threads.length && <p className="text-xs text-slate-400">Ask a question or paste a client answer to create a proposal.</p>}
          </div>

          {proposals.filter(proposal => proposal.state === 'pending' && !proposal.proposed_content.__keel_target_section).map(proposal => (
            <div key={proposal.id} className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Proposal · {proposal.proposed_status ?? 'update'}</p>
              <div className="mt-2 space-y-2 text-xs text-amber-950">
                {Object.entries(proposal.proposed_content ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <p className="font-semibold uppercase tracking-wide text-amber-700">{key.replace(/_/g, ' ')}</p>
                    <p className="mt-0.5 leading-relaxed">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-900">Apply updates this node and flags downstream nodes for review.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => decideProposal(proposal.id, 'apply')} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Apply</button>
                <button onClick={() => decideProposal(proposal.id, 'dismiss')} className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800">Dismiss</button>
              </div>
            </div>
          ))}

          <form onSubmit={sendMessage} className="mt-4">
            <textarea value={message} onChange={event => setMessage(event.target.value)} rows={3} placeholder="Ask about this node or paste a client answer…" className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-400" />
            <button disabled={sending || !message.trim()} className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              {sending ? 'Thinking…' : 'Create proposal'}
            </button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
