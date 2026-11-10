import { describe, expect, it } from 'vitest'
import { buildOutputs, type OutputNode } from './build-output'

const nodes: OutputNode[] = [
  { type_key: 'business_problem', label: 'The problem', status: 'drafted', content: { the_real_problem: 'Trial is weak.' } },
  { type_key: 'objective', label: 'Objective', status: 'drafted', content: { business_objective: 'Increase trial.' } },
  { type_key: 'single_message', label: 'Single message', status: 'drafted', content: { message: 'Try the egg product.' } },
  { type_key: 'audience', label: 'Audience', status: 'drafted', content: { who: 'CNY shoppers.' } },
  { type_key: 'budget', label: 'Budget', status: 'missing', content: { question: '[CONFIRM] budget range' } },
  { type_key: 'rejected_option', label: 'Rejected option', status: 'rejected', content: { option: 'Generic film', why: 'It blends in.' } },
]

describe('buildOutputs', () => {
  it('builds the complete v1 output set', () => {
    const outputs = buildOutputs({ title: 'Test brief', brand: 'Test brand' }, nodes)
    expect(outputs.map(output => output.kind)).toEqual([
      'boss_summary',
      'red_flags',
      'client_questions',
      'reverse_brief',
      'team_briefing',
      'private_notes',
    ])
  })

  it('turns missing nodes into client questions and red flags', () => {
    const outputs = buildOutputs({ title: 'Test brief' }, nodes)
    const questions = outputs.find(output => output.kind === 'client_questions') as { questions: unknown[] }
    const flags = outputs.find(output => output.kind === 'red_flags') as { flags: unknown[] }
    expect(questions.questions).toHaveLength(1)
    expect(flags.flags).toHaveLength(1)
  })

  it('keeps rejected options in the boss summary', () => {
    const outputs = buildOutputs({ title: 'Test brief' }, nodes)
    const boss = outputs.find(output => output.kind === 'boss_summary') as { rejected: string[] }
    expect(boss.rejected.join(' ')).toContain('Generic film')
  })
})
