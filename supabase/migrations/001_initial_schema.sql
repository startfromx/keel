-- M1: Initial schema
-- Paste this into Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

-- ── WORKSPACES ────────────────────────────────────────────────────────────────

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table workspaces enable row level security;

create policy "workspace_owner_all"
  on workspaces for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── RECIPES ───────────────────────────────────────────────────────────────────

create table recipes (
  id           uuid primary key default gen_random_uuid(),
  module       text not null,
  version      text not null,
  status       text not null check (status in ('draft', 'published')),
  source_yaml  text not null,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (module, version)
);

alter table recipes enable row level security;

create policy "recipe_authenticated_read"
  on recipes for select
  using (auth.role() = 'authenticated');

-- ── BRIEFS ────────────────────────────────────────────────────────────────────

create table briefs (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  title          text not null,
  brand          text,
  brief_type     text,
  role           text,
  recipe_id      uuid references recipes(id),
  recipe_version text,
  status         text not null default 'draft',
  created_at     timestamptz not null default now()
);

alter table briefs enable row level security;

create policy "brief_workspace_owner_all"
  on briefs for all
  using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- ── ATTACHMENTS ───────────────────────────────────────────────────────────────

create table attachments (
  id             uuid primary key default gen_random_uuid(),
  brief_id       uuid not null references briefs(id) on delete cascade,
  storage_path   text not null,
  kind           text not null,
  extracted_text text,
  created_at     timestamptz not null default now()
);

alter table attachments enable row level security;

create policy "attachment_brief_owner_all"
  on attachments for all
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── NODES ─────────────────────────────────────────────────────────────────────

create table nodes (
  id         uuid primary key default gen_random_uuid(),
  brief_id   uuid not null references briefs(id) on delete cascade,
  type_key   text not null,
  door       text not null,
  status     text not null default 'missing'
               check (status in ('confirmed','drafted','vague','missing','rejected','needs_review','changed')),
  content    jsonb not null default '{}',
  assumption text,
  version    integer not null default 1,
  built_from jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nodes enable row level security;

create policy "node_brief_owner_all"
  on nodes for all
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── EDGES ─────────────────────────────────────────────────────────────────────

create table edges (
  id        uuid primary key default gen_random_uuid(),
  brief_id  uuid not null references briefs(id) on delete cascade,
  from_node uuid not null references nodes(id) on delete cascade,
  to_node   uuid not null references nodes(id) on delete cascade,
  port_key  text not null,
  required  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table edges enable row level security;

create policy "edge_brief_owner_all"
  on edges for all
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── THREADS ───────────────────────────────────────────────────────────────────

create table threads (
  id         uuid primary key default gen_random_uuid(),
  node_id    uuid not null references nodes(id) on delete cascade,
  role       text not null check (role in ('user', 'ai')),
  text       text not null,
  created_at timestamptz not null default now()
);

alter table threads enable row level security;

create policy "thread_node_owner_all"
  on threads for all
  using (
    node_id in (
      select n.id from nodes n
      join briefs b on n.brief_id = b.id
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    node_id in (
      select n.id from nodes n
      join briefs b on n.brief_id = b.id
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── PROPOSALS ────────────────────────────────────────────────────────────────

create table proposals (
  id               uuid primary key default gen_random_uuid(),
  node_id          uuid not null references nodes(id) on delete cascade,
  proposed_content jsonb not null,
  proposed_status  text,
  affects          jsonb not null default '{}',
  state            text not null default 'pending'
                     check (state in ('pending', 'applied', 'dismissed')),
  created_at       timestamptz not null default now()
);

alter table proposals enable row level security;

create policy "proposal_node_owner_all"
  on proposals for all
  using (
    node_id in (
      select n.id from nodes n
      join briefs b on n.brief_id = b.id
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    node_id in (
      select n.id from nodes n
      join briefs b on n.brief_id = b.id
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── EVENTS ───────────────────────────────────────────────────────────────────

create table events (
  id       uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  node_id  uuid references nodes(id) on delete set null,
  actor    text not null,
  action   text not null,
  before   jsonb,
  after    jsonb,
  at       timestamptz not null default now()
);

alter table events enable row level security;

create policy "event_brief_owner_select"
  on events for select
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

create policy "event_brief_owner_insert"
  on events for insert
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── OUTPUTS ──────────────────────────────────────────────────────────────────

create table outputs (
  id         uuid primary key default gen_random_uuid(),
  brief_id   uuid not null references briefs(id) on delete cascade,
  kind       text not null,
  content    jsonb not null default '{}',
  built_from jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table outputs enable row level security;

create policy "output_brief_owner_all"
  on outputs for all
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── SHARE LINKS ──────────────────────────────────────────────────────────────

create table share_links (
  id          uuid primary key default gen_random_uuid(),
  brief_id    uuid not null references briefs(id) on delete cascade,
  output_kind text not null,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table share_links enable row level security;

create policy "share_link_brief_owner_all"
  on share_links for all
  using (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  )
  with check (
    brief_id in (
      select b.id from briefs b
      join workspaces w on b.workspace_id = w.id
      where w.owner_id = auth.uid()
    )
  );

-- ── RECIPE TESTS ─────────────────────────────────────────────────────────────

create table recipe_tests (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references recipes(id) on delete cascade,
  name         text not null,
  input        jsonb not null,
  expectations jsonb not null,
  last_result  jsonb,
  created_at   timestamptz not null default now()
);

alter table recipe_tests enable row level security;

create policy "recipe_test_authenticated_read"
  on recipe_tests for select
  using (auth.role() = 'authenticated');

-- ── SEED: recipe v1.0.0 ──────────────────────────────────────────────────────
-- The actual YAML is stored in brief-recipe-v1.yaml in the repo.
-- This row marks the slot; the source_yaml column is updated by Recipe Studio.

insert into recipes (module, version, status, source_yaml, published_at)
values ('brief', '1.0.0', 'published', '# see brief-recipe-v1.yaml in repo', now());
