'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESET_GOALS = [
  { key: 'brief', label: 'Campaign Brief', description: 'Full brief map — research, objectives, message, deliverables.' },
  { key: 'strategy_paper', label: 'Strategy Paper', description: 'Market context, competitive position, strategic direction.' },
  { key: 'research_readout', label: 'Research Readout', description: 'Synthesise research data into decisions.' },
  { key: 'competitive_review', label: 'Competitive Review', description: 'Map the competitive landscape and identify white space.' },
]

const DOOR_COLORS: Record<string, string> = {
  research: 'bg-teal-50 text-teal-700',
  objective: 'bg-blue-50 text-blue-700',
  brief: 'bg-violet-50 text-violet-700',
}

type Step = 'goal' | 'compose' | 'details'

interface NodeItem { key: string; label: string; door: string }

export default function NewBriefPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('goal')
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [customGoal, setCustomGoal] = useState('')
  const [composing, setComposing] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [goalLabel, setGoalLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goal = selectedGoal ?? (customGoal.trim() || null)

  async function handleGoalContinue() {
    if (!goal) return
    setComposing(true)
    setComposeError(null)
    setGoalLabel(PRESET_GOALS.find(g => g.key === goal)?.label ?? customGoal.trim())

    try {
      const res = await fetch('/api/briefs/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      const json = await res.json() as { nodes?: NodeItem[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to get composition')
      setNodes(json.nodes ?? [])
      setStep('compose')
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setComposing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const data = {
      brand: (form.elements.namedItem('brand') as HTMLInputElement).value.trim(),
      role: (form.elements.namedItem('role') as HTMLSelectElement).value,
      brief_raw: (form.elements.namedItem('brief_raw') as HTMLTextAreaElement).value.trim(),
      title: (form.elements.namedItem('title') as HTMLInputElement).value.trim() || undefined,
      goal: goal ?? 'brief',
      node_keys: nodes.map(n => n.key),
    }

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json() as { id?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to create brief')
      router.push(`/dashboard/briefs/${json.id}?building=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Briefs</a>
        <span className="text-sm font-semibold text-gray-900">New brief</span>
      </header>

      <div className="max-w-xl mx-auto px-6 py-10">

        {step === 'goal' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">What do you want to end up with?</h2>
              <p className="text-sm text-gray-500">Pick a starting point. You&apos;ll be able to customise the map before building.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PRESET_GOALS.map(g => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => { setSelectedGoal(g.key); setCustomGoal('') }}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    selectedGoal === g.key
                      ? 'border-gray-900 bg-white ring-1 ring-gray-900'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">{g.label}</div>
                  <div className="text-xs text-gray-500 leading-snug">{g.description}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Or describe your own goal</label>
              <input
                value={customGoal}
                onChange={e => { setCustomGoal(e.target.value); setSelectedGoal(null) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGoalContinue() } }}
                placeholder="e.g. competitive positioning deck"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {composeError && <p className="text-xs text-red-500">{composeError}</p>}

            <button
              type="button"
              disabled={!goal || composing}
              onClick={handleGoalContinue}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {composing ? 'Building your map…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 'compose' && (
          <div className="space-y-6">
            <div>
              <button type="button" onClick={() => setStep('goal')} className="text-xs text-gray-400 hover:text-gray-600 mb-3 block">
                ← Back
              </button>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Your map for &ldquo;{goalLabel}&rdquo;</h2>
              <p className="text-sm text-gray-500">Remove any nodes you don&apos;t need.</p>
            </div>

            <div className="space-y-2">
              {nodes.map(n => (
                <div key={n.key} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DOOR_COLORS[n.door] ?? 'bg-gray-100 text-gray-600'}`}>
                      {n.door}
                    </span>
                    <span className="text-sm text-gray-900">{n.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNodes(prev => prev.filter(x => x.key !== n.key))}
                    className="text-gray-300 hover:text-gray-600 text-xl leading-none px-1"
                    aria-label={`Remove ${n.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {nodes.length === 0 && (
                <p className="text-sm text-gray-400 py-6 text-center">No nodes left. Go back and choose a different goal.</p>
              )}
            </div>

            <button
              type="button"
              disabled={nodes.length === 0}
              onClick={() => setStep('details')}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <button type="button" onClick={() => setStep('compose')} className="text-xs text-gray-400 hover:text-gray-600 mb-3 block">
                ← Back
              </button>
              <h2 className="text-base font-semibold text-gray-900">Brief details</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                <input
                  name="brand"
                  required
                  placeholder="Marrybrown"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your role</label>
                <select
                  name="role"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                >
                  <option value="agency">Agency (I received this brief)</option>
                  <option value="client_side">Client-side (I&apos;m writing this brief)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Brief <span className="text-gray-400 font-normal">— paste the raw text</span>
              </label>
              <textarea
                name="brief_raw"
                required
                rows={8}
                placeholder="Paste the brief here…"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title <span className="text-gray-400 font-normal">— optional</span>
              </label>
              <input
                name="title"
                placeholder={`${goalLabel} · …`}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating…' : 'Build brief map'}
            </button>
          </form>
        )}

      </div>
    </main>
  )
}
