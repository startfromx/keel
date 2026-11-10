export interface OutputNode {
  type_key: string
  label: string
  status: string
  content: Record<string, unknown>
  assumption?: string | null
}

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(' · ')
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(valueToText).filter(Boolean).join(' · ')
  return ''
}

function nodeText(node?: OutputNode) {
  return Object.values(node?.content ?? {}).map(valueToText).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function shorten(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

export function buildBossSummary(brief: { title: string; brand?: string | null }, nodes: OutputNode[]) {
  const byKey = new Map(nodes.map(node => [node.type_key, node]))
  const headline = shorten(nodeText(byKey.get('single_message')) || nodeText(byKey.get('objective')) || nodeText(byKey.get('business_problem')) || 'A focused recommendation is ready for review.', 280)
  const bullets = ['business_problem', 'audience', 'deliverables', 'timing']
    .map(key => shorten(nodeText(byKey.get(key)), 300))
    .filter(Boolean)
  const rejected = nodes.filter(node => node.status === 'rejected').map(node => `${node.label}: ${shorten(nodeText(node), 220)}`)
  const openItems = nodes.filter(node => node.status === 'missing').map(node => node.label)
  return {
    kind: 'boss_summary',
    title: brief.title,
    brand: brief.brand,
    eyebrow: `Recommendation · ${brief.brand || brief.title}`,
    headline,
    bullets,
    rejected,
    open_items: openItems,
    generated_at: new Date().toISOString(),
  }
}

export function buildOutputs(brief: { title: string; brand?: string | null }, nodes: OutputNode[]) {
  const byKey = new Map(nodes.map(node => [node.type_key, node]))
  const missing = nodes.filter(node => node.status === 'missing')
  const uncertain = nodes.filter(node => ['missing', 'vague', 'needs_review'].includes(node.status))
  const questions = missing.slice(0, 7).map(node => ({
    question: `To make sure we land this right, can we confirm the ${node.label.toLowerCase()}?`,
    unlocks: node.label,
  }))
  const flags = uncertain.slice(0, 10).map(node => ({
    flag: `${node.label} is ${node.status.replace('_', ' ')}.`,
    say_this: `We should resolve ${node.label.toLowerCase()} before committing the recommendation.`,
  }))
  const reverseBrief = nodes
    .filter(node => node.type_key !== 'private_notes')
    .map(node => ({ node: node.label, status: node.status, content: node.content }))
  const teamBriefing = {
    real_problem: nodeText(byKey.get('business_problem')),
    one_message: nodeText(byKey.get('single_message')),
    audience: nodeText(byKey.get('audience')),
    main_constraint: nodeText(byKey.get('budget')) || nodeText(byKey.get('timing')),
    competitor_context: nodeText(byKey.get('competitor_moves')),
  }
  const privateNotes = nodes
    .filter(node => node.assumption || node.type_key === 'private_notes')
    .map(node => ({ node: node.label, note: node.assumption || nodeText(node) }))

  return [
    buildBossSummary(brief, nodes),
    { kind: 'red_flags', flags, generated_at: new Date().toISOString() },
    { kind: 'client_questions', questions, generated_at: new Date().toISOString() },
    { kind: 'reverse_brief', title: brief.title, sections: reverseBrief, generated_at: new Date().toISOString() },
    { kind: 'team_briefing', ...teamBriefing, generated_at: new Date().toISOString() },
    { kind: 'private_notes', notes: privateNotes, generated_at: new Date().toISOString() },
  ]
}
