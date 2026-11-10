import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { buildBossSummary, type OutputNode } from '@/lib/outputs/build-output'

function wrap(text: string, maxChars = 92) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (!word) continue
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line)
      line = word
    } else line = (line + ' ' + word).trim()
  }
  if (line) lines.push(line)
  return lines
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: brief }, { data: nodes }] = await Promise.all([
    supabase.from('briefs').select('title, brand').eq('id', id).single(),
    supabase.from('nodes').select('type_key, status, content, assumption').eq('brief_id', id),
  ])
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const labels: Record<string, string> = {
    business_problem: 'The problem', audience: 'Who this is for', deliverables: 'What we need to deliver', timing: 'Timing',
  }
  const summary = buildBossSummary(brief, (nodes ?? []).map(node => ({ ...node, label: labels[node.type_key] ?? node.type_key })) as OutputNode[])
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = 612
  const margin = 54
  let page = pdf.addPage([pageWidth, 792])
  let y = 738

  const ensureSpace = (height: number) => {
    if (y - height < 54) { page = pdf.addPage([pageWidth, 792]); y = 738 }
  }
  const drawLines = (text: string, size: number, lineHeight: number, color = rgb(0.12, 0.15, 0.2), usedFont = font) => {
    for (const line of wrap(text)) {
      ensureSpace(lineHeight)
      page.drawText(line, { x: margin, y, size, font: usedFont, color })
      y -= lineHeight
    }
  }

  drawLines(summary.eyebrow, 11, 18, rgb(0.3, 0.35, 0.45), bold)
  y -= 10
  drawLines(summary.headline, 25, 31, rgb(0.05, 0.07, 0.12), bold)
  y -= 14
  if (summary.bullets.length) {
    drawLines('Recommendation', 13, 20, rgb(0.08, 0.1, 0.15), bold)
    for (const bullet of summary.bullets) { y -= 3; drawLines(`- ${bullet}`, 12, 19) }
  }
  if (summary.rejected.length) {
    y -= 14; drawLines('Considered and set aside', 13, 20, rgb(0.55, 0.28, 0.04), bold)
    for (const item of summary.rejected) { y -= 3; drawLines(`- ${item}`, 12, 19, rgb(0.35, 0.2, 0.08)) }
  }
  if (summary.open_items.length) {
    y -= 14; drawLines('Open before approval', 13, 20, rgb(0.35, 0.38, 0.45), bold)
    drawLines(summary.open_items.join(' · '), 12, 19)
  }
  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(brief.title || 'keel-boss-view').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
