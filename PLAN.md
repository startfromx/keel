# Brief Map: Build Plan v1

> Working name. Part of MOS. Put this file and `brief-recipe-v1.yaml` in the repo root.
> Claude Code reads both before every milestone.

---

## 1. What we're building (one paragraph)

A marketer pastes a rough brief. The app turns it into a **map**: every part of a
proper brief as a node, wired to what it depends on, each with a status
(confirmed, drafted, vague, missing, rejected, needs review). Each node has its own
thread. When the client answers, the node updates and everything downstream is
flagged. The marketer presents a clean **Boss view** and sends a **reverse brief**
for sign-off. The thinking lives in **recipes** the owner edits without code.

**Principle:** a generic graph engine + pluggable recipe modules. No brief-specific
logic in engine code. Brief is module 1; Brand, Marketing, Creative come later.

---

## 2. V1 scope

**In**
- Sign-in, personal workspace
- Intake: role, brand, brief type, due date, pasted brief, attachments, start door
- AI builds the map from the recipe (structured JSON, validated)
- Canvas: auto-laid-out nodes in door backdrops, zoom/pan/fit, no manual wiring
- Node panel: content, status, "feeds into", cap note, thread
- Thread: ask questions, paste client answers, **Apply to brief** (never auto-apply)
- Rules engine: cap, propagation, health score (deterministic code, not AI)
- Outputs: red flags, client questions, reverse brief, boss view, team briefing, private notes
- Share link for reverse brief (read-only, no login)
- Export boss view to PDF
- Recipe loader + minimal Recipe Studio (owner only)
- Event log (audit trail)

**Out (later)**
- Teams / agency workspaces and roles
- Brand, Marketing, Creative modules
- Client answering directly inside the share link
- BM and Chinese UI
- Billing
- Mobile-optimised canvas (works, not polished)

---

## 3. Core user flow

```
Intake ──► AI builds map ──► Canvas
                               │
             click node ──► Thread ──► paste client answer ──► Apply
                               │                                  │
                               │                     rules engine: cap + propagation
                               │                                  │
                               ◄──────────── downstream flagged ◄─┘
                               │
            Boss view / PDF ◄──┴──► Reverse brief share link
```

---

## 4. Stack

| Layer | Choice | Note |
|---|---|---|
| App | Next.js (App Router), TypeScript | |
| DB / auth / storage | Supabase | RLS on every table |
| Hosting | Cloudflare (OpenNext) | If long AI calls time out, move map-build to a background job |
| Canvas | React Flow (`@xyflow/react`) | Zoom, pan, nodes, edges built in |
| Layout | ELK (`elkjs`) | Left-to-right, grouped by door |
| AI | Anthropic SDK | Structured outputs, streaming, prompt caching for recipe text |
| Validation | Zod | Generated from recipe `schema` blocks |
| PDF | Server-side HTML to PDF | Boss view only in v1 |

**Model use (keep costs bootstrap-friendly)**
- Larger model: initial map build only.
- Smaller model: threads, status re-checks, output regeneration.
- Cache recipe prompts; they repeat on every call.

---

## 5. Data model

```
workspaces      id, owner_id, name
briefs          id, workspace_id, title, brand, brief_type, role,
                recipe_id, recipe_version, status, created_at
attachments     id, brief_id, storage_path, kind, extracted_text
nodes           id, brief_id, type_key, door, status, content jsonb,
                assumption text, version int, built_from jsonb  -- {input_node_id: version}
edges           id, brief_id, from_node, to_node, port_key, required bool
threads         id, node_id, role (user|ai), text, created_at
proposals       id, node_id, proposed_content jsonb, proposed_status,
                affects jsonb, state (pending|applied|dismissed)
events          id, brief_id, node_id, actor, action, before jsonb, after jsonb, at
outputs         id, brief_id, kind, content jsonb, built_from jsonb
share_links     id, brief_id, output_kind, token, expires_at
recipes         id, module, version, status (draft|published), source_yaml, published_at
recipe_tests    id, recipe_id, name, input jsonb, expectations jsonb, last_result jsonb
```

- `built_from` is how propagation works: a node is stale when any input's current
  version is higher than the version it was built from.
- A brief is pinned to `recipe_version`. New versions never touch old briefs.

---

## 6. Rules engine (pure functions, fully unit-tested)

1. **Cap:** status can't be `confirmed` if any `required` input is `missing`.
   Return the cap note listing those inputs.
2. **Propagation:** on apply, bump node version, then BFS downstream; mark each
   `needs_review` unless already `missing` or `rejected`. Return affected node and
   edge ids for highlighting.
3. **Health:** counts by status (confirmed, drafted, vague, missing).
4. **Assumption wires:** an edge from a `missing` node shows that node's `assumption`.
5. **Outputs stale:** any output whose `built_from` versions moved is regenerated
   on demand (button), not automatically.

---

## 7. AI pipeline

**Map build (intake submit)**
1. Extract text from attachments.
2. Load the pinned recipe; build the system prompt from `rules`, `voice`, `intake.build_prompt`.
3. One call per door (research → objective → brief), each receiving the previous
   doors' output. Smaller, more reliable than one giant call.
4. Validate each node against its Zod schema; on failure, retry that node once.
5. Rules engine sets caps and health. Then generate outputs.
6. Stream progress to the UI ("Reading the brief… Checking the market… Drafting…").

**Context assembly (any node call)**
- The node, direct parents in full, further ancestors summarised, plus brand and role.

**Thread call**
- Recipe `threads.prompt` + context + thread history.
- If the user pastes a client answer, return a **proposal** (new content, new status,
  nodes it would flag). The user presses Apply. Nothing changes without that click.

**Guardrails**
- Never invent facts: researched facts must carry a source URL; otherwise `[CONFIRM]`.
- Private notes never appear in shareable outputs (enforced in code, not just prompt).

---

## 8. Recipe system

- `brief-recipe-v1.yaml` is seeded as version 1.0.0, published.
- **Recipe Studio v1 (owner only):** list recipes, edit YAML in a code editor,
  validate, run against `recipe_tests`, view old vs new output side by side, publish.
- Fancier editors (forms per node, prompt diffing) come later.
- **To add before build: brief types** (v1.1). `brief_type` on intake selects a
  variant of type-specific nodes, starting with Deliverables:
  - *Campaign:* assets, channels, lengths, versions
  - *Website:* audiences, sitemap, content owner, maintenance, languages, CMS
  - Add *Event* and *Packaging* later.
  - Standard red flag for digital briefs: "who maintains it after launch?"

---

## 9. Milestones (each ends with something you can click)

| # | Milestone | Done when |
|---|---|---|
| M0 | Repo, Supabase, auth, CLAUDE.md, deploy pipeline | You can sign in on the live URL |
| M1 | Schema + recipe loader + rules engine with tests | Recipe seeds; cap/propagation tests pass |
| M2 | Canvas, read-only, with the Marrybrown map seeded by hand | Zoom/pan/fit, click a node, panel shows it |
| M3 | Intake → AI map build | Paste the PCCS brief, get a valid map in < 90 s |
| M4 | Threads + proposals + Apply | Paste a client answer, apply it, downstream lights up |
| M5 | Outputs, Boss view, PDF, share link | Send a reverse brief link to yourself and open it logged out |
| M6 | Recipe Studio (minimal) + brief types | Edit a prompt, test on 3 briefs, publish v1.1 |
| M7 | Pilot | 3 real users, 3 real briefs each |

Rough pace with Claude Code: M0–M2 week 1, M3–M4 week 2, M5–M6 week 3, pilot week 4.

---

## 10. Pilot (M7)

- **Who:** 1 client-side marketing manager, 2 agency juniors. People you know, real briefs.
- **Watch for:** where they get stuck; which nodes they never open; whether they
  use Boss view in a real meeting; whether they'd pay.
- **Measure:** time from paste to first client questions sent; number of questions
  that came back answered; one sentence from each: "what would you lose if this went away?"

---

## 11. Decisions for you (my default in brackets)

1. **Name** [keep "Brief Map" internally until pilot]
2. **Who signs up in v1:** individuals only, or agency teams? [individuals]
3. **Languages:** English UI, but briefs in BM and Chinese read correctly? [yes]
4. **Where client data lives:** Supabase region [Singapore]
5. **Private notes:** visible only to the author, ever? [yes]
6. **Pricing test in pilot:** free, or a small paid commitment? [free, ask willingness to pay at the end]
7. **Desk research in the map build:** on by default? [on, with sources shown]

---

## 12. Working with Claude Code

**CLAUDE.md (put in repo root)**
```
- Read PLAN.md and brief-recipe-v1.yaml before any work.
- Engine code must never contain brief-specific logic; everything comes from the recipe.
- Rules engine is pure TypeScript with unit tests; AI never decides statuses alone.
- Never auto-apply AI changes to nodes; always via a proposal the user applies.
- Private notes must never be included in shareable outputs (enforce in code).
- Supabase RLS on every table. No secrets in client code.
- Small, surgical changes. Explain the plan before editing files.
- Work one milestone at a time; stop and show me when its "done when" is met.
```

**Prompt to start each milestone**
```
Read PLAN.md and CLAUDE.md. We're starting milestone M<n>: <name>.
First, give me a short plan: files you'll create or change, and how you'll test
the "done when" condition. Wait for my OK before writing code.
```
