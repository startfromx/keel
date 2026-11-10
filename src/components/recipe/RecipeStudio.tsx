'use client'

import { useState } from 'react'

type TestResult = { name: string; passed: boolean; expected: string[] }

export function RecipeStudio({ initialYaml }: { initialYaml: string }) {
  const [yaml, setYaml] = useState(initialYaml)
  const [tests, setTests] = useState<TestResult[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: 'test' | 'publish') {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, source_yaml: yaml }),
      })
      const json = await response.json() as { error?: string; tests?: TestResult[]; published?: { version: string } }
      if (!response.ok) throw new Error(json.error ?? 'Recipe action failed')
      setTests(json.tests ?? [])
      setMessage(action === 'publish' ? `Published recipe ${json.published?.version ?? ''}` : 'Three-brief test run complete')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recipe action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div><a href="/dashboard" className="text-xs text-slate-400 hover:text-white">← Dashboard</a><h1 className="mt-3 text-2xl font-semibold">Recipe Studio</h1><p className="mt-1 text-sm text-slate-400">Tune the brief recipe, test it on three sample briefs, then publish a version.</p></div>
          <div className="flex gap-2"><button onClick={() => run('test')} disabled={busy} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">Test on 3 briefs</button><button onClick={() => run('publish')} disabled={busy} className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50">Publish version</button></div>
        </header>
        {message && <p className="mb-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <textarea value={yaml} onChange={event => setYaml(event.target.value)} spellCheck={false} className="min-h-[680px] w-full rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono text-xs leading-6 text-slate-200 outline-none focus:border-sky-400" />
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Test results</h2><p className="mt-1 text-xs leading-5 text-slate-400">The studio validates the recipe shape and runs its three built-in fixture briefs before publish.</p>{tests.length === 0 ? <p className="mt-8 text-sm text-slate-500">No test run yet.</p> : <div className="mt-6 space-y-3">{tests.map(test => <div key={test.name} className="rounded-lg border border-slate-700 p-3"><div className="flex items-center justify-between text-sm"><span>{test.name}</span><span className={test.passed ? 'text-emerald-400' : 'text-red-400'}>{test.passed ? 'PASS' : 'FAIL'}</span></div></div>)}</div>}</aside>
        </div>
      </div>
    </main>
  )
}
