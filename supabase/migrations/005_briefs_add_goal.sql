-- Add goal and node_keys to briefs for the goal-first compose flow.
-- goal: the user's stated goal (preset key or free text).
-- node_keys: the ordered list of node type keys the user composed; null means use all recipe nodes (backward compat).
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS node_keys jsonb;
