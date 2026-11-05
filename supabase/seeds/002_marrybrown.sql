-- M2 seed: Marrybrown Festive TVC brief
-- Paste into Supabase → SQL Editor → Run
-- This seeds a demo brief so the canvas has something to display.

do $$
declare
  v_user_id    uuid;
  v_ws_id      uuid;
  v_brief_id   uuid;
  v_recipe_id  uuid;

  -- node ids
  n_market_facts      uuid := gen_random_uuid();
  n_competitor_moves  uuid := gen_random_uuid();
  n_own_data          uuid := gen_random_uuid();
  n_biz_problem       uuid := gen_random_uuid();
  n_objective         uuid := gen_random_uuid();
  n_rejected          uuid := gen_random_uuid();
  n_audience          uuid := gen_random_uuid();
  n_rtb               uuid := gen_random_uuid();
  n_message           uuid := gen_random_uuid();
  n_mandatories       uuid := gen_random_uuid();
  n_deliverables      uuid := gen_random_uuid();
  n_timing            uuid := gen_random_uuid();
  n_budget            uuid := gen_random_uuid();
  n_approver          uuid := gen_random_uuid();
  n_success           uuid := gen_random_uuid();
  n_red_flags         uuid := gen_random_uuid();
  n_questions         uuid := gen_random_uuid();
  n_reverse_brief     uuid := gen_random_uuid();
  n_boss_summary      uuid := gen_random_uuid();
  n_team_briefing     uuid := gen_random_uuid();
  n_private_notes     uuid := gen_random_uuid();
begin
  -- get the first user (single-user dev setup)
  select id into v_user_id from auth.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'No user found. Sign up first.';
  end if;

  -- create workspace (skip if already exists)
  insert into workspaces (owner_id, name)
  values (v_user_id, 'My Workspace')
  on conflict do nothing;

  select id into v_ws_id from workspaces where owner_id = v_user_id limit 1;

  -- get recipe id
  select id into v_recipe_id from recipes where module = 'brief' and version = '1.0.0' limit 1;

  -- create brief
  insert into briefs (id, workspace_id, title, brand, brief_type, role, recipe_id, recipe_version, status)
  values (
    gen_random_uuid(),
    v_ws_id,
    'Egg Chicken Festive TVC 2027',
    'Marrybrown',
    'campaign',
    'agency',
    v_recipe_id,
    '1.0.0',
    'in_progress'
  )
  returning id into v_brief_id;

  -- ── RESEARCH DOOR ────────────────────────────────────────────────────────

  insert into nodes (id, brief_id, type_key, door, status, content, version) values
  (n_market_facts, v_brief_id, 'market_facts', 'research', 'vague', $j${
    "facts": [
      {
        "fact": "CNY 2027 falls on January 29, overlapping with Ramadan which begins January 25.",
        "source": "[CONFIRM]",
        "why_it_matters": "One campaign must work across two very different occasions and audiences simultaneously."
      },
      {
        "fact": "QSR egg-based items see a 15-20% sales uplift during festive periods in Malaysia.",
        "source": "[CONFIRM]",
        "why_it_matters": "Timing the push to festive peaks could amplify sales without increasing media spend."
      }
    ]
  }$j$::jsonb, 1),

  (n_competitor_moves, v_brief_id, 'competitor_moves', 'research', 'vague', $j${
    "competitors": [
      { "name": "McDonald's Malaysia", "move": "Ran dual CNY/Raya campaign in 2026 featuring togetherness theme.", "source": "[CONFIRM]" },
      { "name": "KFC Malaysia", "move": "Launched limited edition festive boxes for CNY with Chinese-inspired packaging.", "source": "[CONFIRM]" },
      { "name": "myBurgerLab", "move": "No major festive campaign detected.", "source": "[CONFIRM]" }
    ],
    "white_space": "Nobody has anchored a QSR festive campaign around a specific hero protein. First-mover opportunity for Egg Chicken."
  }$j$::jsonb, 1),

  (n_own_data, v_brief_id, 'own_data', 'research', 'missing', $j${
    "what_we_have": "",
    "what_we_need": "Sales by outlet for egg chicken SKUs; last 2 festive periods vs non-festive baseline.",
    "assumption_if_missing": "Egg chicken is a top-selling SKU with existing customer familiarity.",
    "client_question": "To make sure we build on what is already working, can you share the sales performance of egg chicken over the last two festive periods?"
  }$j$::jsonb, 1);

  -- ── OBJECTIVE DOOR ───────────────────────────────────────────────────────

  insert into nodes (id, brief_id, type_key, door, status, content, assumption, version) values
  (n_biz_problem, v_brief_id, 'business_problem', 'objective', 'drafted', $j${
    "the_ask": "Make a TVC to push egg chicken during CNY and Raya.",
    "the_real_problem": "Egg chicken lacks a clear festive occasion or emotional reason to buy — the brief assumes awareness solves this.",
    "problem_type": "trial",
    "evidence": [
      "No sales data provided to confirm current performance.",
      "CNY and Raya 2027 overlap, requiring one message to work for two distinct audiences."
    ],
    "challenge": "A single TVC must make egg chicken feel right for both CNY reunion dinners and Raya gatherings — two occasions with different food cultures."
  }$j$::jsonb, 'Own data not provided — assuming egg chicken is an established SKU.', 1),

  (n_objective, v_brief_id, 'objective', 'objective', 'drafted', $j${
    "business_objective": "Increase egg chicken sales during CNY and Raya 2027 festive windows.",
    "marketing_objective": {
      "who": "Existing Marrybrown customers aged 18-35 celebrating CNY or Raya",
      "behaviour": "Choose egg chicken as their festive QSR option",
      "how_much": "[CONFIRM]% uplift vs non-festive baseline",
      "by_when": "End of Raya 2027 (approx. April 2027)"
    },
    "communication_objective": "Make egg chicken feel like the natural, modern choice for festive sharing moments — not just a weekday meal."
  }$j$::jsonb, null, 1),

  (n_rejected, v_brief_id, 'rejected_option', 'objective', 'rejected', $j${
    "option": "Two separate ads — one for CNY, one for Raya",
    "why_it_loses": "Doubles production cost with no guarantee either ad outperforms a unified concept. The 2027 overlap is unusual — a campaign that bridges both occasions gets more attention.",
    "say_this_if_raised": "Running two ads doubles the budget and splits the media impact. The overlap in 2027 is an opportunity, not a problem."
  }$j$::jsonb, null, 1);

  -- ── BRIEF DOOR ───────────────────────────────────────────────────────────

  insert into nodes (id, brief_id, type_key, door, status, content, version) values
  (n_audience, v_brief_id, 'audience', 'brief', 'drafted', $j${
    "who": "Young Malaysians (18-35) who celebrate CNY or Raya and already eat at Marrybrown — the ones who bring family or friends for a quick festive meal.",
    "think_now": "Marrybrown is a regular QSR choice, not a festive destination. [CONFIRM]",
    "want_them_to_think": "Egg chicken from Marrybrown is the right food for festive sharing — familiar, feel-good, and made for this moment."
  }$j$::jsonb, 1),

  (n_rtb, v_brief_id, 'reason_to_believe', 'brief', 'vague', $j${
    "reasons": [
      { "claim": "Egg chicken is a uniquely Malaysian festive protein.", "proof": "[CONFIRM] — client to provide product story or heritage angle." },
      { "claim": "Available across all Marrybrown outlets during the festive period.", "proof": "[CONFIRM] — confirm outlet availability and stock." }
    ]
  }$j$::jsonb, 1),

  (n_message, v_brief_id, 'single_message', 'brief', 'drafted', $j${
    "message": "Egg chicken is the taste that brings everyone to the table, whatever the occasion.",
    "why_this": "Works across CNY and Raya without favouring one occasion. Everyone is inclusive. The table is a universal festive image.",
    "not_saying": [
      "Specific religious or cultural references that exclude one audience",
      "Price or value claims (not the positioning for a festive push)",
      "Product features or ingredients"
    ]
  }$j$::jsonb, 1),

  (n_mandatories, v_brief_id, 'mandatories', 'brief', 'missing', $j${
    "items": ["[CONFIRM] — client to list required logos, legal lines, pricing callouts, product shots"],
    "sensitivities": [
      "Halal certification must be clearly visible for Raya audience",
      "Avoid imagery that could be read as prioritising one festive occasion over the other"
    ]
  }$j$::jsonb, 1),

  (n_deliverables, v_brief_id, 'deliverables', 'brief', 'vague', $j${
    "items": [
      { "asset": "Hero TVC", "channel": "[CONFIRM] — TV, streaming, or both?", "length_or_size": "[CONFIRM] — 30s or 15s?" },
      { "asset": "Social cutdowns", "channel": "[CONFIRM] — Instagram, TikTok, Facebook?", "length_or_size": "[CONFIRM] — 15s or 6s?" }
    ],
    "note": "Format named without channels or sizes confirmed. Need to know which screens matter most before production begins."
  }$j$::jsonb, 1),

  (n_timing, v_brief_id, 'timing', 'brief', 'vague', $j${
    "live_date": "[CONFIRM] — CNY 2027 = Jan 29; Raya 2027 approx. Mar 30.",
    "phases": [
      { "name": "Creative development", "from": "[CONFIRM]", "to": "[CONFIRM]" },
      { "name": "Production", "from": "[CONFIRM]", "to": "[CONFIRM]" },
      { "name": "Media live", "from": "[CONFIRM]", "to": "[CONFIRM]" }
    ],
    "critical_path": "If airing before CNY (Jan 29 2027), creative must be signed off by early December 2026 at the latest."
  }$j$::jsonb, 1),

  (n_budget, v_brief_id, 'budget', 'brief', 'missing', $j${
    "production": "[CONFIRM]",
    "media": "[CONFIRM — not stated in brief]"
  }$j$::jsonb, 1),

  (n_approver, v_brief_id, 'approver', 'brief', 'missing', $j${
    "final_approver": "[CONFIRM]",
    "review_steps": ["[CONFIRM] — does this need legal/halal review before airing?"]
  }$j$::jsonb, 1),

  (n_success, v_brief_id, 'success_measure', 'brief', 'drafted', $j${
    "measures": [
      { "metric": "Egg chicken sales uplift during festive windows", "target": "[CONFIRM]% vs non-festive baseline", "source": "Client POS data" },
      { "metric": "Video completion rate", "target": "[CONFIRM]", "source": "Media agency report" }
    ]
  }$j$::jsonb, 1);

  -- ── OUTPUTS DOOR ─────────────────────────────────────────────────────────

  insert into nodes (id, brief_id, type_key, door, status, content, version) values
  (n_red_flags, v_brief_id, 'red_flags', 'outputs', 'drafted', $j${
    "flags": [
      { "flag": "No budget stated", "say_this": "Before we lock the creative direction, we need a budget range — it determines whether we are doing a full TVC or a social-first campaign." },
      { "flag": "Deliverables are a format, not a plan", "say_this": "A TVC tells us nothing about channels or lengths. Can we agree on what screens this needs to run on?" },
      { "flag": "One campaign for two occasions with different audiences", "say_this": "CNY and Raya have different emotional registers. We have proposed a unifying angle — it needs sign-off before we go to script." },
      { "flag": "No approver named", "say_this": "Who is the final sign-off on this? Knowing early saves a revision round later." }
    ]
  }$j$::jsonb, 1),

  (n_questions, v_brief_id, 'client_questions', 'outputs', 'drafted', $j${
    "questions": [
      { "question": "Can you share the egg chicken sales performance over the last two festive periods?", "unlocks": "own_data, business_problem" },
      { "question": "What is the budget range for production and media?", "unlocks": "budget, deliverables" },
      { "question": "Which screens does this need to run on — TV, streaming, social, or a mix?", "unlocks": "deliverables" },
      { "question": "What is the confirmed live date — before CNY (Jan 29) or Raya (approx. Mar 30 2027)?", "unlocks": "timing" },
      { "question": "Who gives final sign-off on the creative, and are there any legal or halal review steps?", "unlocks": "approver, mandatories" },
      { "question": "Are there mandatory elements we must include — logo placement, legal lines, specific product shots?", "unlocks": "mandatories" },
      { "question": "How do you want to measure success for this campaign?", "unlocks": "success_measure" }
    ]
  }$j$::jsonb, 1),

  (n_reverse_brief, v_brief_id, 'reverse_brief', 'outputs', 'drafted', $j${
    "content": "REVERSE BRIEF — Marrybrown Egg Chicken Festive 2027. Business objective: Increase egg chicken sales during CNY and Raya 2027. Single message: Egg chicken is the taste that brings everyone to the table, whatever the occasion. Deliverables: [CONFIRM — channels and lengths needed]. Timeline: [CONFIRM]. Budget: [CONFIRM]. Approver: [CONFIRM]."
  }$j$::jsonb, 1),

  (n_boss_summary, v_brief_id, 'boss_summary', 'outputs', 'drafted', $j${
    "content": "EGG CHICKEN FESTIVE 2027 — RECOMMENDATION. One campaign, two occasions, one message. CNY and Raya 2027 overlap unusually — a unified campaign outperforms two separate ads on cost and reach. The real job: make egg chicken feel right for festive sharing, not just a weekday meal. No competitor has anchored a QSR festive campaign around a specific hero protein — first-mover opportunity. Considered and set aside: two separate ads (doubles cost, halves impact). To start, we need: budget range, confirmed screens and lengths, live date, and final approver."
  }$j$::jsonb, 1),

  (n_team_briefing, v_brief_id, 'team_briefing', 'outputs', 'drafted', $j${
    "content": "THE REAL PROBLEM: Egg chicken is not seen as a festive food. We are changing that. THE ONE MESSAGE: It brings everyone to the table — whatever the occasion. THE AUDIENCE: Young Malaysians who already love Marrybrown and want to celebrate without overcomplicating it. THE MAIN CONSTRAINT: One campaign must work for two very different festive audiences without feeling generic. HOW TO BEAT THE COMPETITION: Nobody else has made a hero protein the centrepiece of a QSR festive campaign. We can own it."
  }$j$::jsonb, 1),

  (n_private_notes, v_brief_id, 'private_notes', 'outputs', 'drafted', $j${
    "content": "The brief says this year but CNY and Raya 2027 is an unusually tight overlap — the client may not have realised this creates a creative opportunity rather than a problem. Frame it as an advantage. If the client pushes back on a unified campaign, they may have internal politics around different PICs for CNY vs Raya activations. Ask gently who owns each occasion internally before recommending the unified route too strongly."
  }$j$::jsonb, 1);

  -- ── EDGES ────────────────────────────────────────────────────────────────

  insert into edges (brief_id, from_node, to_node, port_key, required) values
  -- required edges
  (v_brief_id, n_own_data,         n_biz_problem,  'own_data',         true),
  (v_brief_id, n_biz_problem,      n_objective,    'business_problem', true),
  (v_brief_id, n_biz_problem,      n_rejected,     'business_problem', true),
  (v_brief_id, n_objective,        n_audience,     'objective',        true),
  (v_brief_id, n_audience,         n_message,      'audience',         true),
  (v_brief_id, n_objective,        n_message,      'objective',        true),
  (v_brief_id, n_message,          n_deliverables, 'single_message',   true),
  (v_brief_id, n_timing,           n_deliverables, 'timing',           true),
  (v_brief_id, n_budget,           n_deliverables, 'budget',           true),
  (v_brief_id, n_objective,        n_success,      'objective',        true),
  -- optional edges
  (v_brief_id, n_market_facts,     n_biz_problem,  'market_facts',     false),
  (v_brief_id, n_competitor_moves, n_biz_problem,  'competitor_moves', false),
  (v_brief_id, n_own_data,         n_audience,     'own_data',         false),
  (v_brief_id, n_market_facts,     n_rtb,          'market_facts',     false),
  (v_brief_id, n_rtb,              n_message,      'reason_to_believe',false),
  (v_brief_id, n_competitor_moves, n_message,      'competitor_moves', false),
  (v_brief_id, n_mandatories,      n_deliverables, 'mandatories',      false),
  (v_brief_id, n_market_facts,     n_timing,       'market_facts',     false),
  (v_brief_id, n_objective,        n_rejected,     'objective',        false);

end $$;
