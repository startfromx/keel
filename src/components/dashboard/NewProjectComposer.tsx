'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESET_GOALS = [
  { key: 'brief', label: 'Campaign brief', description: 'Research, objectives, message, and deliverables.' },
  { key: 'strategy_paper', label: 'Strategy paper', description: 'Market context, competition, and direction.' },
  { key: 'research_readout', label: 'Research readout', description: 'Turn research into clear decisions.' },
  { key: 'competitive_review', label: 'Competitive review', description: 'Map the landscape and find white space.' },
]

const DOOR_COLORS: Record<string, string> = {
  research: 'bg-teal-50 text-teal-700',
  objective: 'bg-blue-50 text-blue-700',
  brief: 'bg-violet-50 text-violet-700',
}

type Step = 'goal' | 'compose' | 'details'
interface NodeItem { key: string; label: string; door: string }

export function NewProjectComposer({ initialOpen = false }: { initialOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)
  const [step, setStep] = useState<Step>('goal')
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [customGoal, setCustomGoal] = useState('')
  const [composing, setComposing] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [goalLabel, setGoalLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function openComposer() {
      setOpen(true)
      setStep('goal')
      setSelectedGoal(null)
      setCustomGoal('')
      setNodes([])
      setComposeError(null)
      setError(null)
    }
    window.addEventListener('keel:new-project', openComposer)
    return () => window.removeEventListener('keel:new-project', openComposer)
  }, [])

  const goal = selectedGoal ?? (customGoal.trim() || null)

  async function handleGoalContinue() {
    if (!goal) return
    setComposing(true)
    setComposeError(null)
    setGoalLabel(PRESET_GOALS.find(item => item.key === goal)?.label ?? customGoal.trim())
    try {
      const response = await fetch('/api/briefs/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      const json = await response.json() as { nodes?: NodeItem[]; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'Could not suggest a project map')
      setNodes(json.nodes ?? [])
      setStep('compose')
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Could not suggest a project map')
    } finally {
      setComposing(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const form = event.currentTarget
    const data = {
      brand: (form.elements.namedItem('brand') as HTMLInputElement).value.trim(),
      role: (form.elements.namedItem('role') as HTMLSelectElement).value,
      brief_raw: (form.elements.namedItem('brief_raw') as HTMLTextAreaElement).value.trim(),
      title: (form.elements.namedItem('title') as HTMLInputElement).value.trim() || undefined,
      goal: goal ?? 'brief',
      node_keys: nodes.map(node => node.key),
    }
    try {
      const response = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await response.json() as { id?: string; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'Could not create project')
      router.push(`/dashboard/briefs/${json.id}?building=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-y-0 left-[264px] right-0 z-40 overflow-y-auto bg-[#fbfbfa] px-10 py-10">
      <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">New project</p>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-950">Let&apos;s shape the work.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">Tell Keel what you&apos;re working toward. We&apos;ll suggest a useful starting map before you paste the full brief.</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); if (initialOpen) router.replace('/dashboard') }} className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white hover:text-gray-700">Cancel</button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="mb-5 flex items-center gap-3 text-xs text-gray-400">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 'goal' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
          <span className={step === 'goal' ? 'font-medium text-gray-800' : ''}>Goal</span>
          <span className="h-px w-8 bg-gray-200" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 'compose' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
          <span className={step === 'compose' ? 'font-medium text-gray-800' : ''}>Map</span>
          <span className="h-px w-8 bg-gray-200" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 'details' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-500'}`}>3</span>
          <span className={step === 'details' ? 'font-medium text-gray-800' : ''}>Context</span>
        </div>

        {step === 'goal' && (
          <div>
            <p className="mb-4 text-lg font-medium text-gray-900">What are you working on?</p>
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {PRESET_GOALS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { setSelectedGoal(item.key); setCustomGoal('') }}
                  className={`rounded-xl border p-4 text-left transition-colors ${selectedGoal === item.key ? 'border-gray-950 bg-gray-50 ring-1 ring-gray-950' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">{item.description}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                value={customGoal}
                onChange={event => { setCustomGoal(event.target.value); setSelectedGoal(null) }}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleGoalContinue() } }}
                placeholder="Or tell Keel what you want to create…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 pr-28 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              />
              <button type="button" disabled={!goal || composing} onClick={handleGoalContinue} className="absolute right-2 top-2 rounded-lg bg-gray-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-30">
                {composing ? 'Thinking…' : 'Continue'}
              </button>
            </div>
            {composeError && <p className="mt-3 text-xs text-red-500">{composeError}</p>}
          </div>
        )}

        {step === 'compose' && (
          <div>
            <button type="button" onClick={() => setStep('goal')} className="mb-4 text-xs text-gray-400 hover:text-gray-700">← Change goal</button>
            <p className="text-lg font-medium text-gray-900">A starting map for <span className="text-gray-500">{goalLabel}</span></p>
            <p className="mt-1 text-sm text-gray-500">Keel suggested these areas. Remove anything you don&apos;t need.</p>
            <div className="my-5 space-y-2">
              {nodes.map(node => (
                <div key={node.key} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3"><span className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase ${DOOR_COLORS[node.door] ?? 'bg-gray-100 text-gray-600'}`}>{node.door}</span><span className="text-sm text-gray-800">{node.label}</span></div>
                  <button type="button" onClick={() => setNodes(current => current.filter(item => item.key !== node.key))} className="text-lg leading-none text-gray-300 hover:text-gray-700">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2"><button type="button" onClick={() => setStep('goal')} className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600">Back</button><button type="button" disabled={!nodes.length} onClick={() => setStep('details')} className="flex-1 rounded-xl bg-gray-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-30">Continue with this map</button></div>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit}>
            <button type="button" onClick={() => setStep('compose')} className="mb-4 text-xs text-gray-400 hover:text-gray-700">← Back to map</button>
            <p className="text-lg font-medium text-gray-900">Give Keel the context</p>
            <p className="mt-1 text-sm text-gray-500">Add the account, project name, and whatever you have so far.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-700">Account / brand<input name="brand" required placeholder="MarryBrown" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400" /></label>
              <label className="text-xs font-medium text-gray-700">Project name<input name="title" placeholder="CNY campaign" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400" /></label>
            </div>
            <label className="mt-4 block text-xs font-medium text-gray-700">Your role<select name="role" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-gray-400"><option value="agency">Agency (I received this brief)</option><option value="client_side">Client-side (I&apos;m writing this brief)</option></select></label>
            <label className="mt-4 block text-xs font-medium text-gray-700">What do you know so far?<textarea name="brief_raw" required rows={7} placeholder="Paste a rough brief, notes, or a few lines about the problem…" className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm leading-6 outline-none focus:border-gray-400" /></label>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-gray-950 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">{loading ? 'Creating project…' : 'Start project'}</button>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}
