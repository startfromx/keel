import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function SharedBossView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()
  const { data: link } = await supabase.from('share_links').select('brief_id, output_kind, expires_at').eq('token', token).single()
  if (!link || (link.expires_at && new Date(link.expires_at) < new Date())) notFound()
  const { data: output } = await supabase.from('outputs').select('content').eq('brief_id', link.brief_id).eq('kind', link.output_kind).single()
  if (!output) notFound()
  const content = output.content as { eyebrow?: string; headline?: string; bullets?: string[]; rejected?: string[]; open_items?: string[] }
  return (
    <main className="min-h-screen bg-[#161a22] px-4 py-8 sm:px-10">
      <article className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <div className="border-b border-slate-200 px-7 py-10 sm:px-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{content.eyebrow ?? 'Recommendation'}</p>
          <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">{content.headline}</h1>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {(content.bullets ?? []).map((bullet, index) => <section key={index} className="rounded-2xl border border-slate-200 bg-white p-6 text-[15px] leading-7 text-slate-700"><p>{bullet}</p></section>)}
          {(content.rejected ?? []).length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[15px] leading-7 text-amber-950"><p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Considered and set aside</p><p className="mt-3">{content.rejected?.join(' ')}</p></section>}
          {(content.open_items ?? []).length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[15px] leading-7 text-slate-700"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Open before approval</p><p className="mt-3">{content.open_items?.join(' · ')}</p></section>}
        </div>
      </article>
    </main>
  )
}
