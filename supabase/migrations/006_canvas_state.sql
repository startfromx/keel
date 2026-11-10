-- M7: Persist the user's canvas composition and layout.
alter table briefs
  add column if not exists canvas_state jsonb not null default '{}'::jsonb;
