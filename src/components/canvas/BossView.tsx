'use client'

import { useState } from 'react'
import type { Node } from '@xyflow/react'
import type { BriefNodeData } from './BriefNode'

interface BossViewProps {
  briefId: string
  title: string
  brand?: string | null
  nodes: Node[]
}

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(' · ')
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(valueToText).filter(Boolean).join(' · ')
  return ''
}

function contentText(node?: BriefNodeData) {
  return Object.values(node?.content ?? {}).map(valueToText).filter(Boolean).join(' ')
}

function Card({ label, children, tone = 'white' }: { label: string; children: React.ReactNode; tone?: 'white' | 'slate' | 'amber' }) {
  const tones = {
    white: 'bg-white border-slate-200',
    slate: 'bg-slate-900 border-slate-800 text-white',
    amber: 'bg-amber-50 border-amber-200',
  }
  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${tones[tone]}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${tone === 'slate' ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <div className="mt-3 break-words text-[15px] leading-7">{children}</div>
    </section>
  )
}

export function BossView({ briefId, title, brand, nodes }: BossViewProps) {
  const [saving, setSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const data = nodes
    .filter(node => node.type === 'briefNode')
    .map(node => node.data as BriefNodeData)
  const byKey = new Map(data.map(node => [node.type_key, node]))

  const objective = contentText(byKey.get('objective'))
  const message = contentText(byKey.get('single_message'))
  const problem = contentText(byKey.get('business_problem'))
  const audience = contentText(byKey.get('audience'))
  const deliverables = contentText(byKey.get('deliverables'))
  const timing = contentText(byKey.get('timing'))
  const rejected = data.filter(node => node.status === 'rejected').map(node => `${node.label}: ${contentText(node)}`)
  const missing = data.filter(node => node.status === 'missing').map(node => node.label)
  const recommendation = message || objective || problem || 'A focused recommendation is ready for review.'

  async function saveOutput() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/briefs/${briefId}/outputs`, { method: 'POST' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not save output')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save output')
    } finally {
      setSaving(false)
    }
  }

  async function downloadPdf() {
    setError(null)
    try {
      const response = await fetch(`/api/briefs/${briefId}/pdf`)
      if (!response.ok) throw new Error('Could not create PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'keel-boss-view'}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create PDF')
    }
  }

  async function shareOutput() {
    if (!window.confirm('Create a public read-only link to this Boss view? Anyone with the link can open it until it expires.')) return
    setSaving(true)
    setError(null)
    try {
      const outputResponse = await fetch(`/api/briefs/${briefId}/outputs`, { method: 'POST' })
      if (!outputResponse.ok) throw new Error((await outputResponse.json()).error ?? 'Could not generate output')
      const response = await fetch(`/api/briefs/${briefId}/share`, { method: 'POST' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not create share link')
      const url = `${window.location.origin}${json.url}`
      setShareUrl(url)
      await navigator.clipboard?.writeText(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create share link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#161a22] px-4 py-6 sm:px-8 sm:py-10">
      <main className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">Decision summary</p>
            <h2 className="mt-2 text-xl font-semibold">{brand || title}</h2>
          </div>
          <div className="no-print flex flex-wrap items-center justify-end gap-2">
            <button onClick={downloadPdf} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Download PDF</button>
            <button onClick={() => window.print()} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Print</button>
            <button onClick={saveOutput} disabled={saving} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save output'}</button>
            <button onClick={shareOutput} disabled={saving} className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50">Share view</button>
          </div>
        </div>

        {error && <p className="no-print mb-3 rounded-lg bg-red-950/70 px-4 py-3 text-xs text-red-200">{error}</p>}
        {shareUrl && <p className="no-print mb-3 rounded-lg bg-emerald-950/70 px-4 py-3 text-xs text-emerald-200">Share link copied: {shareUrl}</p>}
        <article className="overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
          <div className="border-b border-slate-200 px-7 py-8 sm:px-12 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Recommendation</p>
            <h1 className="mt-5 max-w-3xl break-words text-2xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-4xl lg:text-[3.25rem]">
              {recommendation}
            </h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Boss view</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Review assumptions before sign-off</span>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
            <Card label="The problem" tone="slate">
              <p>{problem || 'The current problem still needs a clearer statement.'}</p>
            </Card>
            <Card label="Who this is for">
              <p className="text-slate-700">{audience || 'Audience definition is still open.'}</p>
            </Card>
            <Card label="What we need to deliver">
              <p className="text-slate-700">{deliverables || 'Deliverables are still open.'}</p>
            </Card>
            <Card label="Timing">
              <p className="text-slate-700">{timing || 'Timing has not been confirmed.'}</p>
            </Card>
            <Card label="Considered and set aside" tone="amber">
              <p className="text-amber-950">{rejected.length ? rejected.join(' ') : 'No rejected options recorded yet.'}</p>
            </Card>
            <Card label="Open before approval">
              <p className="text-slate-700">{missing.length ? missing.join(' · ') : 'No missing items recorded.'}</p>
            </Card>
          </div>

          <footer className="mx-5 mb-5 border-t border-slate-200 px-2 pt-6 sm:mx-8 sm:mb-8 sm:px-0">
            <p className="text-sm leading-6 text-slate-600">
              <strong className="text-slate-950">Next conversation:</strong> confirm the assumptions and evidence behind this recommendation before treating it as final.
            </p>
          </footer>
        </article>
      </main>
    </div>
  )
}
