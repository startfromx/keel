import Anthropic from '@anthropic-ai/sdk'
import {
  parseRecipe,
  getDoorOrder,
  type Recipe,
  type RecipeNodeDef,
} from '@/lib/recipe/loader'
import { checkCap, type GraphNode, type GraphEdge } from '@/lib/engine/rules'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUILD_MODEL = process.env.BUILD_MODEL ?? 'claude-sonnet-4-6'

export interface BuildInput {
  briefId: string
  brand: string
  role: string
  brief_type: string
  brief_raw: string
  recipeYaml: string
  /** When present, only build nodes whose key is in this list. Null/undefined builds all recipe nodes (backward compat). */
  nodeKeys?: string[]
  supabase: SupabaseClient
  onProgress: (msg: string) => void
}

interface NodeResult {
  key: string
  content: Record<string, unknown>
  status: string
  assumption?: string
}

const VALID_NODE_STATUSES = new Set(['confirmed', 'drafted', 'vague', 'missing', 'rejected'])

function normalizeNodeContent(content: unknown): Record<string, unknown> {
  if (content && typeof content === 'object' && !Array.isArray(content)) return content as Record<string, unknown>
  return { value: content == null ? '[CONFIRM]' : String(content) }
}

/** Build only edges whose source and target nodes were actually persisted. */
export function buildEdgeRecords(
  nodeDefs: RecipeNodeDef[],
  nodeKeyToId: Record<string, string>,
  insertedIds: Set<string>,
): GraphEdge[] {
  const intakePorts = new Set(['role', 'brand', 'due_date', 'brief_raw', 'attachments', 'start_door'])
  const providesToNodeKey: Record<string, string> = {}
  for (const nodeDef of nodeDefs) providesToNodeKey[nodeDef.provides] = nodeDef.key

  const edges: GraphEdge[] = []
  for (const nodeDef of nodeDefs) {
    const targetId = nodeKeyToId[nodeDef.key]
    if (!targetId || !insertedIds.has(targetId)) continue

    for (const port of [...(nodeDef.requires ?? []), ...(nodeDef.optional ?? [])]) {
      const required = (nodeDef.requires ?? []).includes(port)
      if (port === '*' || intakePorts.has(port)) continue
      const sourceId = nodeKeyToId[providesToNodeKey[port]]
      if (!sourceId || !insertedIds.has(sourceId)) continue
      edges.push({ id: crypto.randomUUID(), from_node: sourceId, to_node: targetId, port_key: port, required })
    }
  }
  return edges
}

function shouldBuildNode(node: RecipeNodeDef, role: string): boolean {
  if (!node.only_when) return true
  const ow = node.only_when.toLowerCase()
  if (ow.includes('attachment')) return false
  if (ow.includes('agency')) return role === 'agency'
  return true
}

function buildSystemPrompt(recipe: Recipe, role: string): string {
  const voiceKey = role === 'agency' ? 'agency' : 'client_side'
  const voice = recipe.voice[voiceKey] ?? recipe.voice.base
  const rulesText = Object.entries(recipe.rules)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return [
    'You are building a structured brief map.',
    '',
    '## Rules',
    rulesText,
    '',
    '## Voice',
    voice,
    '',
    '## Build instructions',
    recipe.intake.build_prompt,
  ].join('\n')
}

function buildDoorUserMessage(
  recipe: Recipe,
  door: string,
  doorNodes: RecipeNodeDef[],
  brief: { brand: string; role: string; brief_type: string; brief_raw: string },
  context: Record<string, NodeResult>
): string {
  const doorDef = recipe.doors.find(d => d.key === door)!
  const contextStr =
    Object.keys(context).length === 0
      ? 'None — this is the first door.'
      : JSON.stringify(context, null, 2)

  const nodeDescriptions = doorNodes
    .map(n => {
      const statusRules = n.status_rules
        ? Object.entries(n.status_rules)
            .map(([s, rule]) => `  ${s}: ${rule}`)
            .join('\n')
        : ''
      return [
        `### ${n.label} (key: "${n.key}")`,
        `Prompt: ${n.prompt}`,
        `Schema: ${JSON.stringify(n.schema, null, 2)}`,
        statusRules ? `Status rules:\n${statusRules}` : '',
        n.only_when ? `Include only if: ${n.only_when}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  return [
    '## Brief inputs',
    `Brand: ${brief.brand}`,
    `Role: ${brief.role}`,
    `Brief type: ${brief.brief_type}`,
    `Brief:`,
    brief.brief_raw,
    '',
    '## Previously built nodes',
    contextStr,
    '',
    `## Task: build all nodes for the "${doorDef.label}" door`,
    '',
    nodeDescriptions,
    '',
    'Use submit_door_nodes to submit every node listed above.',
    'Never omit a node — if unknown, set status "missing" and content with [CONFIRM] placeholders.',
  ].join('\n')
}

const SUBMIT_TOOL: Anthropic.Tool = {
  name: 'submit_door_nodes',
  description: 'Submit all generated nodes for this door of the brief map',
  input_schema: {
    type: 'object' as const,
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            content: { type: 'object' },
            status: {
              type: 'string',
              enum: ['confirmed', 'drafted', 'vague', 'missing', 'rejected'],
            },
            assumption: { type: 'string' },
          },
          required: ['key', 'content', 'status'],
        },
      },
    },
    required: ['nodes'],
  },
}

async function callAIForDoor(
  client: Anthropic,
  recipe: Recipe,
  door: string,
  doorNodes: RecipeNodeDef[],
  brief: { brand: string; role: string; brief_type: string; brief_raw: string },
  context: Record<string, NodeResult>,
  systemPrompt: string
): Promise<NodeResult[]> {
  const userMsg = buildDoorUserMessage(recipe, door, doorNodes, brief, context)

  const response = await client.messages.create({
    model: BUILD_MODEL,
    max_tokens: 4096,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
    tools: [SUBMIT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_door_nodes' },
  })

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )
  if (!toolUse) throw new Error(`No tool_use block returned for door "${door}"`)

  const result = toolUse.input as { nodes?: NodeResult[] }
  return result.nodes ?? []
}

export async function buildMap(input: BuildInput): Promise<void> {
  const { briefId, brand, role, brief_type, brief_raw, recipeYaml, nodeKeys, supabase, onProgress } = input
  const recipe = parseRecipe(recipeYaml)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const nodeKeyFilter = nodeKeys ? new Set(nodeKeys) : null

  // Pre-generate IDs for every node we'll build
  const nodeKeyToId: Record<string, string> = {}
  const nodesToBuild: RecipeNodeDef[] = []
  for (const nodeDef of recipe.nodes) {
    if (nodeKeyFilter && !nodeKeyFilter.has(nodeDef.key)) continue
    if (shouldBuildNode(nodeDef, role)) {
      nodeKeyToId[nodeDef.key] = crypto.randomUUID()
      nodesToBuild.push(nodeDef)
    }
  }

  const systemPrompt = buildSystemPrompt(recipe, role)
  const brief = { brand, role, brief_type, brief_raw }
  const accumulatedContext: Record<string, NodeResult> = {}

  const allNodeRecords: GraphNode[] = []

  // Process main doors in order; skip 'outputs' (M5 scope)
  const mainDoors = getDoorOrder(recipe).filter(d => d !== 'outputs')

  for (const door of mainDoors) {
    const doorDef = recipe.doors.find(d => d.key === door)!
    const doorNodes = nodesToBuild.filter(n => n.door === door)
    if (doorNodes.length === 0) continue

    onProgress(`${doorDef.label}…`)

    let results: NodeResult[]
    try {
      results = await callAIForDoor(client, recipe, door, doorNodes, brief, accumulatedContext, systemPrompt)
    } catch {
      onProgress(`Retrying ${doorDef.label}…`)
      results = await callAIForDoor(client, recipe, door, doorNodes, brief, accumulatedContext, systemPrompt)
    }

    for (const r of results) {
      if (!nodeKeyToId[r.key]) continue
      if (allNodeRecords.some(node => node.type_key === r.key)) continue
      const normalizedStatus = VALID_NODE_STATUSES.has(r.status) ? r.status : 'missing'
      const normalizedContent = normalizeNodeContent(r.content)
      const normalizedResult = { ...r, status: normalizedStatus, content: normalizedContent }
      accumulatedContext[r.key] = normalizedResult
      allNodeRecords.push({
        id: nodeKeyToId[r.key],
        type_key: r.key,
        door,
        status: normalizedStatus as GraphNode['status'],
        content: normalizedContent,
        assumption: typeof r.assumption === 'string' ? r.assumption : undefined,
        version: 1,
        built_from: {},
      })
    }

    onProgress(`${doorDef.label} done`)
  }

  // The model is instructed to return every recipe node, but a valid map must
  // remain complete even when a tool response omits one. Make the omission
  // visible as a client question instead of silently dropping the node.
  for (const nodeDef of nodesToBuild) {
    if (allNodeRecords.some(node => node.type_key === nodeDef.key)) continue
    allNodeRecords.push({
      id: nodeKeyToId[nodeDef.key],
      type_key: nodeDef.key,
      door: nodeDef.door,
      status: 'missing',
      content: { question: `[CONFIRM] ${nodeDef.label} was not returned by the build and needs review.` },
      assumption: 'The AI build did not return this node.',
      version: 1,
      built_from: {},
    })
  }

  if (allNodeRecords.length === 0) throw new Error('AI returned no nodes')

  // Insert nodes
  const { error: nodeErr } = await supabase.from('nodes').insert(
    allNodeRecords.map(n => ({
      id: n.id,
      brief_id: briefId,
      type_key: n.type_key,
      door: n.door,
      status: n.status,
      content: n.content,
      assumption: n.assumption ?? null,
      version: n.version,
      built_from: n.built_from,
    }))
  )
  if (nodeErr) throw new Error(`Node insert failed: ${nodeErr.message}`)

  // Re-read the persisted IDs before wiring edges. This protects the build from
  // partial inserts or RLS-filtered rows producing a foreign-key failure.
  const { data: persistedNodes, error: persistedNodesErr } = await supabase
    .from('nodes')
    .select('id')
    .eq('brief_id', briefId)
    .in('id', allNodeRecords.map(n => n.id))
  if (persistedNodesErr) throw new Error(`Node verification failed: ${persistedNodesErr.message}`)

  // Build and insert edges — only between nodes confirmed in the database.
  const insertedIds = new Set((persistedNodes ?? []).map(n => n.id))
  const edgeRecords = buildEdgeRecords(nodesToBuild, nodeKeyToId, insertedIds)

  if (edgeRecords.length > 0) {
    const { error: edgeErr } = await supabase.from('edges').insert(
      edgeRecords.map(e => ({ ...e, brief_id: briefId }))
    )
    if (edgeErr) {
      // A map with nodes is still useful if a single connection is rejected by
      // the database. Keep the build usable and surface the issue in the log.
      console.error('[build] edge insert warning:', edgeErr.message)
      onProgress('Some connections were skipped')
    }
  }

  // Apply cap rules — downgrade any AI-confirmed node whose required input is missing
  onProgress('Checking rules…')
  const capUpdates: Array<{ id: string; assumption: string }> = []
  for (const n of allNodeRecords) {
    const cap = checkCap(n, edgeRecords, allNodeRecords)
    if (cap.capped) {
      capUpdates.push({ id: n.id, assumption: cap.note ?? '' })
    }
  }
  for (const u of capUpdates) {
    await supabase
      .from('nodes')
      .update({ status: 'drafted', assumption: u.assumption })
      .eq('id', u.id)
  }
}
