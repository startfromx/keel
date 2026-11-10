# Keel Build Status

Updated: 2026-11-10

## Current state

- Active milestone: M7 — Canvas UX rethink (pipeline model).
- M7 Phase 1 (recipe refactor) and Phase 2 (goal-first intake) are code-complete and TypeScript-clean.
- Initial canvas UX improvements are implemented: actionable status guidance, add/remove node controls, and readable Boss view output.
- Canvas interaction polish is implemented: floating nodes preserve their positions, chain insertion uses a narrow drop zone, marquee multi-select is enabled, and Brief Input/Goal anchors are draggable.
- Migration 006 (`canvas_state`) has been applied; canvas persistence is ready for authenticated runtime verification.
- Remaining environment blocker: migration 005 still needs to be applied before authenticated goal-first intake testing.
- Latest handoff: section-level node actions use the official Lucide wand trigger. Paragraph-level proposals are targeted by content path and render inline with Apply here/Dismiss; Add answer and Search online can propose a replacement without changing unrelated node content.
- Production fix: the Cloudflare Worker was failing on authenticated project pages because the canvas loaded `brief-recipe-v1.yaml` with runtime `fs.readFileSync`, which Workers do not implement. The default recipe is now bundled into the app; local file loading remains available when an explicit path is supplied.
- Production build validation: `npx tsc --noEmit`, `npm test -- --run` (20 tests), `git diff --check`, and `npm run build:cf` pass.
- Ask client generates a separate client-facing question card with Copy and Add to Questions for client; it does not revise the paragraph. Citation-only sources show Find source ↗, while real HTTP/HTTPS URLs open directly.
- Clicking outside attention tooltips closes them; attention markers are left-aligned colored text and Leave unresolved collapses to a small unresolved indicator.
- Latest validation after the comment UI changes: `npx tsc --noEmit` and `git diff --check` pass.
- Workspace navigation shell is now account-first: the dashboard and canvas use a persistent left sidebar grouping briefs under brand accounts, with project-style entries and nested brief labels; the existing canvas remains intact. `npx tsc --noEmit` and `git diff --check` pass after this change.
- Detail panel width is now shared across node panels and Goal recommendation, so resizing one panel persists when switching to the other. `npx tsc --noEmit` and `git diff --check` pass.
- New project now opens as an inline dashboard composer instead of navigating away: Goal selection, AI-suggested map editing, and project context are handled in a Keel-style conversational card; successful submission still enters the existing canvas build flow. `npx tsc --noEmit` and `git diff --check` pass.
- New project composer now covers the main workspace area as a distinct state, keeping the account sidebar visible while hiding the All projects header/list to avoid mixed navigation and intake views. `npx tsc --noEmit` and `git diff --check` pass.
- Sidebar New project is now route-aware: from `/dashboard` it opens inline immediately; from a brief canvas it routes to `/dashboard?new=1`, where the composer opens automatically. `npx tsc --noEmit` and `git diff --check` pass.
- Section comment/chat triggers now use a wand-and-sparkles icon matching the provided reference instead of speech bubbles. `npx tsc --noEmit` and `git diff --check` pass.
- Wand trigger icon refined to the supplied eight-ray sparkle burst with a thick rounded diagonal stroke. `npx tsc --noEmit` and `git diff --check` pass.
- Wand sparkle rays were spaced apart to prevent rounded stroke caps from merging into a blob; the icon remains a discrete burst plus diagonal wand. `npx tsc --noEmit` and `git diff --check` pass.
- Section comment triggers now use the official Lucide `wand` SVG geometry from the user-provided shadcn.io reference, replacing the custom-drawn icon. `npx tsc --noEmit` and `git diff --check` pass.
- `[CONFIRM]` and `[CONFIRM – detail]` markers in node content now render as amber clickable “Needs input” chips with Add answer, Ask client, Search online (Possible), and Leave unresolved actions; selecting an action shows contextual guidance in the panel. `npx tsc --noEmit` and `git diff --check` pass.
- Confirm markers refined to colored inline text without a box; Add answer, Ask client, and Search online open compact one-line inputs, while Leave unresolved collapses to a small `!` indicator. Search currently captures the research question only; actual AI web-search execution remains to be wired. `npx tsc --noEmit` and `git diff --check` pass.
- Confirm tooltips now close on outside click; the action label is “Search online,” and it uses the marker’s paragraph context directly instead of asking for a second search question. `npx tsc --noEmit` and `git diff --check` pass.
- Inline attention actions now submit targeted requests through the existing node thread/proposal workflow: Add answer, Ask client, and Search online create paragraph-scoped proposals shown with Apply/Dismiss; Leave unresolved keeps the marker visible and marks it unresolved. `npx tsc --noEmit` and `git diff --check` pass.
- Section-targeted proposals now carry the exact content path, render inline beside the paragraph with Apply here/Dismiss, and patch only that path when applied; unrelated node content is preserved. Full-node proposals retain the existing bottom Thread workflow. `npx tsc --noEmit` and `git diff --check` pass.
- Ask client is now a separate client-question flow: it generates a concise question card with Copy and Add to Questions for client, without changing the paragraph or creating a revision proposal. `npx tsc --noEmit` and `git diff --check` pass.
- Confirm marker text is now explicitly left-aligned and uses an inline-block wrapper, preventing wrapped attention text from centering relative to the paragraph. `npx tsc --noEmit` and `git diff --check` pass.
- Source URLs embedded inside longer text are now detected and rendered as clickable external links; bare citation names without URLs remain plain text. `npx tsc --noEmit` and `git diff --check` pass.
- Citation-only source fields now show a “Find source ↗” search link, while real URLs continue to open directly; this works for existing nodes without rebuilding. `npx tsc --noEmit` and `git diff --check` pass.
- Development-server note: `npm run dev` is a long-running Next.js development process required only while testing locally. The workspace may clean it up between sessions, so `ERR_CONNECTION_REFUSED` means it needs to be started again; stopping it does not change or delete project data.

## Canvas UX rethink (decided 2026-11-06, partially built)

Pivoting canvas from "auto-built 15-node door graph" to a **user-composed pipeline**:

- **Brief Node** (left anchor) → **floating intermediate nodes** → **Goal Node** (right anchor, deliverable document)
- Intermediate nodes (Target Market, Competitors, Strategy, etc.) exist on canvas but unconnected by default
- User drags a node onto the Brief→Goal spine to wire it in; wired nodes run as mini AI agents (each has a skill definition)
- Goal Node generates on demand ("Build" button); produces a structured document (Campaign Brief, Strategy Paper, etc.) — downloadable
- No more Boss View, no more door/backdrop groups, no more 15-node auto-build
- Zoom out further (drop `minZoom` to ~0.1)
- Custom node types: user can add their own

**Refactor plan (order):**
1. Zoom fix
2. Strip canvas to Brief + Goal anchors + floating nodes (visual)
3. Active/inactive node states + drag-to-insert mechanic
4. Node skill system + pipeline execution
5. Goal Node document renderer + download

**Components to remove:** `BossView.tsx`, `BuildingOverlay.tsx`, `CanvasDecorations.tsx`, `LaneEdge.tsx`
**Components to refactor:** `BriefCanvas.tsx`, `BriefNode.tsx`, `NodePanel.tsx`, `layout.ts`
**Components to add:** Goal Node renderer, node skill files
- Branch: `main`
- Latest committed milestone: `291e1a0` — `M2: canvas, node panel, Marrybrown seed`
- Workspace: local Orca workspace, currently in progress.
- The working tree contains uncommitted user/agent changes. Do not discard them.

## Implemented in the current working tree

- Brief intake form and `/api/briefs` creation route.
- AI brief-map build route with streamed progress.
- Door-grouped canvas for Research Interpreter, Objective Finder, and Brief Decoder.
- Visible Brief Input card and color-coded graph edges.
- Graph / Boss view toggle.
- Preliminary Boss view assembled from existing graph nodes.
- Boss view redesigned as a compact decision-summary layout with recommendation, evidence, risks, and open items.
- Graph edges now use staggered smooth-step lanes to reduce visual overlap.
- Node detail section labels now use stronger contrast and weight.
- Clickable node detail panel with content previews.
- Resizable node detail panel, from 320px up to 640px.
- Defensive handling so decorative canvas nodes do not crash the detail panel.
- Node threads with AI-generated proposals and explicit Apply/Dismiss actions.
- Pending proposals now show their proposed content before Apply.
- Applying a proposal increments the node version and propagates `needs_review` downstream.
- Stored Boss summary output generation with Save output, Print/PDF, and share-link actions.
- Server-generated Boss-view PDF download at `/api/briefs/[id]/pdf`, with browser Print retained as a fallback.
- Output generation now stores the full v1 set: Boss summary, red flags, client questions, reverse brief, team briefing, and private notes.
- Read-only shared Boss view route at `/share/[token]` with public-read policies in migration 003.
- Public share rendering uses the server-only Supabase service client for token-scoped reads, so local testing does not depend on manually applying migration 003 first.
- M6 Recipe Studio baseline at `/dashboard/recipes`: edit recipe YAML, run the three built-in fixture checks, and publish an authenticated recipe version. Migration 004 adds authenticated recipe insert/update policies.

## Validation

- `npx tsc --noEmit` passes.
- `npm test -- --run` passes: 20 tests across 3 files.
- Latest validation after Boss view redesign: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest validation after edge/label polish: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M3 persistence validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M3 retry validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M4 foundation validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M5 output/share validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M4 proposal UX validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest share-route validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest full-output validation: `npx tsc --noEmit`, tests, and `git diff --check` pass.
- Latest M6 validation: clean `npm run build` passes; dev server restarted on `http://localhost:3000`; invalid share-token smoke test returns 404.
- Latest failure-path audit: invalid/missing recipes now mark builds `failed`; proposal apply rejects unknown actions and surfaces propagation/event persistence errors. TypeScript, 20 tests, diff check, and clean production build pass.
- Latest M3 wiring validation: deterministic edge construction is unit-tested for required/optional ports, intake/wildcard exclusions, and missing persisted sources; 20 tests pass and the clean production build passes.
- M3 AI-output hardening: malformed status/content values are normalized, and omitted recipe nodes become explicit `missing` client-question nodes rather than disappearing from the map.
- Authenticated runtime evidence: existing brief route loads with HTTP 200; Boss view visibly renders; PDF endpoint returns HTTP 200 and the browser downloaded a valid one-page PDF; Save output POST returns HTTP 200 twice.
- Clean `npm run build` passes with M4/M5 routes; dev server restarted afterward on `http://localhost:3000`.
- Latest full validation: `npx tsc --noEmit`, `npm test -- --run` (18/18), `git diff --check`, and clean `npm run build` all pass.
- `npm run build` passed previously, but do not run it while `next dev` is active because both use `.next`.
- Development server is normally run with `npm run dev` at `http://localhost:3000`.

## M7 — Node Library + Goal-First Compose (in progress)

### Phase 1 — Recipe refactor ✓
- `brief-recipe-v1.yaml`: added `starter_graphs` section with 4 preset goals (Campaign Brief, Strategy Paper, Research Readout, Competitive Review). Each lists its working node keys; output nodes are always appended by the engine.
- `src/lib/recipe/loader.ts`: added `StarterGraph` type, `starter_graphs` on `Recipe`, `getStarterGraph()` and `getNodePalette()` helpers.
- Validation: 20/20 tests pass, `npx tsc --noEmit` clean.

### Phase 2 — Goal-first intake ✓ (pending migration)
- `supabase/migrations/005_briefs_add_goal.sql`: adds `goal text` and `node_keys jsonb` to `briefs`. **Must be applied before testing.**
- `src/lib/ai/suggestComposition.ts`: Haiku-model AI call for custom goals; validates keys against palette.
- `src/app/api/briefs/compose/route.ts`: `POST /api/briefs/compose` — preset goals resolve from `starter_graphs` instantly, custom goals go through AI. Stateless, auth-gated.
- `src/lib/ai/build-map.ts`: accepts optional `nodeKeys[]`; when set, only builds those nodes. `undefined` = all nodes (old briefs unaffected).
- `src/app/api/briefs/[id]/build/route.ts`: reads `goal` and `node_keys` from brief; passes both to buildMap.
- `src/app/api/briefs/route.ts`: accepts `goal` and `node_keys[]`; `brief_type` now optional.
- `src/app/dashboard/new/page.tsx`: 3-step flow — (1) goal picker with 4 preset cards + free-text, (2) suggested node list (removable rows), (3) brief details form.
- Validation: 20/20 tests pass, `npx tsc --noEmit` clean. Runtime goal-first testing remains pending migration 005.

### Next step
1. Apply migration 005 to Supabase (SQL Editor or `npx supabase db push` with Docker).
2. `npm run dev`, go to `/dashboard/new`, test all three paths: preset card → custom goal → submit.
3. Confirm brief builds with only the selected nodes.
4. Verify migration 006 persistence: move anchors/nodes, add a node, build Goal, return to Dashboard, and reopen the brief.

### Phase 3 — Canvas node management (started)
- Added a graph-level `+ Add node` menu with common recipe node types.
- Added selected-node removal with confirmation.
- Added persisted node routes: `POST /api/briefs/[id]/nodes` and `DELETE /api/nodes/[id]`.
- New nodes start as `Missing`, with guidance to add evidence or client direction through the node thread.
- Add/remove now updates the canvas in place so generated content and positions are preserved.
- Floating nodes no longer snap back to a computed palette grid when chain membership changes.
- Users can drag-select multiple intermediate nodes; selected nodes can be removed together.
- Brief Input and Goal nodes can be repositioned freely on the canvas.
- Brief Input and Goal cards now show a move cursor and are explicitly draggable in the initial graph state.
- Chain insertion now follows the live Brief Input → Goal line, including when either anchor is moved; it no longer depends on a fixed horizontal drop band.
- Added a full recipe-backed node library menu so each Goal can be extended with any available intermediate node, not only the nodes suggested during intake.
- Added recipe prompt previews for empty nodes and an enabled Goal build action that sends the currently chained node IDs to a Goal-generation endpoint; unknowns remain marked `[CONFIRM]`.
- Goal generation now includes every node present on the canvas as context; spine-connected nodes are additionally marked as the user's intentional working order.
- Adding a node now performs a focused contextual fill from the current brief, Goal, existing canvas nodes, and that node's recipe prompt; if generation fails, it remains a clear `[CONFIRM]` question instead of an empty shell.
- Adding nodes now updates the canvas in place instead of reloading the page, preserving previously generated node content, selection, chain layout, and Goal state.
- Selected nodes use a dark border/ring for contrast; MiniMap has a light grey border; Goal changes switch the action to an amber `Update Goal` state until rebuilt.
- Selected nodes now use the exact cyan `#38bdf8` chain-line color without an additional mixed-color ring; the selected-only `×` control is black with a light-grey border.
- Goal dirty state now compares the current ordered chain with the last built ordered chain: floating-node changes do not signal an update, and removing a newly chained node restores the no-change state.
- Goal build results now open in a dedicated right-side `Goal recommendation` panel; the Goal canvas card stays compact and no longer renders the full recommendation inline.
- Goal recommendation panels now follow the same global panel rules as node panels: 320px default width, 640px expanded width, drag-resize handle, shared header spacing, expand control, close control, and scrollable content padding.
- Node and Goal panels now share one `DetailPanelHeader` component based on the Goal panel reference: identical title/subtitle hierarchy, spacing, expand icon, and close control.
- Detail-panel controls now use the requested split-rectangle expand icon and a matching 20px SVG close icon with aligned baselines and identical stroke weight.
- Build/Update Goal now opens the right panel immediately with live progress messages, then reveals the completed recommendation line by line.
- Goal progress now yields a browser paint before the API call, cycles through preparation stages during the full AI request, and reveals finished lines at a slower 520ms cadence.
- Final Goal output now renders completely as soon as the API response is ready; only the live preparation stages animate, preventing a partial/unfinished recommendation from remaining visible.
- Goal generation now uses a real Anthropic text stream: the panel opens before the request, shows preparation status, then renders incoming text chunks live with a working cursor until the stream completes.
- Streaming validation checkpoint: `npx tsc --noEmit`, 20 tests, and `git diff --check` pass after converting the Goal route to a chunked text response and the client to a streaming reader.
- In-canvas Goal editing is implemented: the Goal card offers preset options (Strategy paper, Creative brief, Marketing brief, Campaign brief) plus a custom Goal field, persists to `briefs.goal`, preserves all nodes/positions, and marks the Goal for rebuild.
- Goal updates now show a highlighted “Changes in this update” summary in the Goal panel for Goal changes and added, removed, or reordered chain nodes; clicking the summary marks it as read.
- Node detail sections now have their own comment box and “Ask AI to revise this section” action; comments create targeted proposals while preserving the existing Apply/Dismiss workflow, with body typography aligned to the Goal panel.
- Section comments are now collapsed behind a subtle inline action so the panel stays clean; explicit HTTP/HTTPS source values render as clickable external links.
- Paragraph comment bubbles now attach to the final text line of each paragraph item, using the requested filled speech-box icon and compact Claude-style return icon for submission.
- Node library is now presented in a white canvas toolbar; each option is a compact card with a short description, and outside clicks close the menu.
- Library cards now use consistent padding, show `Add` or `Added`, and keep the recipe description visible without clipping.
- Selecting `Add` immediately places a lightweight pending node on the canvas with a "Reading this brief and the existing canvas context…" state while contextual fill completes.
- Brief node previews and assumptions no longer use line-clamping/truncation; long content wraps within the card.
- Add Node now overlays the existing page header without creating a second white bar; bulk removal was removed in favor of a selected-node corner `×` action.
- Canvas state persistence is implemented in migration 006 and `/api/briefs/[id]/canvas`: node positions, Brief/Goal anchor positions, chain membership, and Goal output restore when returning to a brief.
- Migration 006 was applied by the user; persistence verification remains the next runtime check.
- Remaining: replace the temporary list with the full recipe palette and complete the Brief → floating nodes → Goal Node pipeline pivot.

## M7 plan — original notes

Architecture pivot: recipe goes from fixed template → node library + starter graph registry. User states a goal (preset card or free text) → AI suggests a composition from the library → user customises → pastes brief → AI fills.

**Phase 1 — Recipe refactor (no UI change)**
- Restructure `brief-recipe-v1.yaml`: add `node_types[]` (palette) and `starter_graphs` (goal → type_key list). "Brief" starter = current 15 nodes.
- Update recipe loader to parse new structure; existing behavior preserved.
- Done when: 20 tests still pass, Brief goal still builds same map.

**Phase 2 — Goal-first intake + AI composition**
- New 3-step intake: goal picker → suggested node list (editable) → paste brief.
- `POST /api/briefs/compose` (stateless): given goal text + node library, returns `type_key[]`.
- `src/lib/ai/suggestComposition.ts`: small-model call for non-preset goals; preset goals use `starter_graphs` directly.
- `POST /api/briefs` accepts `goal` and `node_keys[]` instead of inferring from recipe.
- Migration 005: `ALTER TABLE briefs ADD COLUMN goal text`.
- Done when: type "competitive positioning deck" → AI suggests nodes → build → canvas renders → propagation works.

**Phase 3 — Palette panel on canvas (historical plan)**
- Initial add/remove controls are now implemented; the full palette/sidebar and pipeline model remain future work.

**Open questions before Phase 1:**
1. Which 3–4 preset goal cards to show on intake?
2. Should the composition system prompt live in the recipe YAML or be hardcoded?

## Known limitations / next work

- Boss view output is now storable/shareable and has a server-generated PDF endpoint; output regeneration strategy remains future hardening.
- M4 still needs broader runtime testing and proposal conflict/error handling.
- M4 proposal actions are now guarded against unknown actions and duplicate pending-state transitions; full authenticated concurrency testing remains.
- M3 build flow needs further runtime testing and should eventually meet the under-90-second target.
- M3 persistence hardened: node IDs are verified before edge wiring, duplicate AI node keys are ignored, and a malformed edge no longer prevents the completed node map from being usable.
- M3 retry handling hardened: only `built` briefs short-circuit; failed or partial builds are marked `failed` and cleaned up before retry.
- M6 runtime publish still needs verification against the configured Supabase database and an authenticated session; the route and UI compile successfully.
- Canvas UX validation: `npm test -- --run` passes all 20 tests and `npm run build` passes after the node-management and Boss view changes.
- Latest canvas interaction validation: `npx tsc --noEmit`, 20 tests, and `git diff --check` pass.
- Latest selection styling validation: `npx tsc --noEmit` and `git diff --check` pass.
- Development server is available at `http://localhost:3000` when `npm run dev` is running; the workspace may terminate long-running shell sessions between interactions.
- PDF route smoke test returns 401 when unauthenticated; authenticated binary-content verification remains a user-session check.
- Share-link creation was not clicked during runtime verification because it creates a new access-granting public link; requires explicit user confirmation before exercising that final side effect.
- Share view now shows an explicit confirmation warning before creating the public read-only link.
- The current app relies on Supabase and Anthropic environment configuration in `.env.local`.

## Handoff rule

Agents should read `PLAN.md`, `CLAUDE.md`, and this file before making changes. Update this file at meaningful checkpoints: beginning or ending a milestone, after validation, when discovering a blocker, and before handing work to another agent. Keep the status factual and concise.
