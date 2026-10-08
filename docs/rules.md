# Rules and decisions from BECHARA (Restaurateur Wizard)

These are the things BECHARA has told Claude about how restaurants work and how the app should behave. Every rule here is already built into the app's code (GitHub: becharaaoun1/restaurateur-wizard, file src/app.html).

## Customers
- Premium restaurants get fewer customers than casual and fast food. Built in at about 0.9 customers per seat a day for premium, 1.4 for casual premium, 1.7 for casual and 2.3 for value (pizzeria example).
- Eat-in numbers must come from a proper local analysis, worked out service by service: who is nearby (office workers, residents, station users, visitors), with sources, and how busy comparable places are.
- Always check competitors before calling a site feasible.
- Competitors must be places that are still open. Name the ones that have closed.

## Costs
- Running costs must be realistic. Sales are shown after 20% VAT.
- Staff are sized to the customers actually served.

## Staffing and rota
- Premium needs more people on the floor per customer than casual. It also gets bartenders.
- Premium needs more kitchen staff per customer, because the dishes are more complex and plated.
- The team changes with the cuisine (its kitchen roles and how many customers each cook handles).
- The team changes with how busy each service and each day is.
- Never one pizzaiolo/cook alone at dinner: at least 2 in the kitchen every service (plus a porter at night).
- Never one front of house alone at lunch: at least 2 on the floor at lunch and 3 at dinner, including the manager or supervisor who works the floor.
- Busy periods get extra rush shifts (about 12:00–15:00 and 18:00–22:00). Full-timers may work doubles.
- Cafés, bakeries and brunch places trade daytime (about 07:00–18:00), not evenings.
- The team size and staff costs come from the rota, so they always match.
- Nobody works two shifts in a day. Full-timers work at most 5 days, part-timers at most 4.

## Product
- Keep the top Claude model (Opus) and the full web searches. BECHARA wants the best information. Don't downgrade to save money.
- BECHARA wants to offer the app free to the public. To keep that affordable at launch: reuse recent area results, set fair-use limits, set a spending cap, and look for sponsors or referral partners.
- Design: professional first. A clean dark dashboard with one subtle warm neon-orange accent. Full pink neon glow was rejected as too playful. No emojis next to cuisines. The report is split into tabs, never one long crowded page.
- Design history: serious retro (1960s–70s modernist). BECHARA rejected a "clean professional" design and an Art Deco design.

## Area and competitor data (8 Oct 2026)
- Never present a closed restaurant as open. Names must come from live Google listings or a web source from the last 12 months; anything Google lists as closed is dropped from every list.
- Analyse what is actually open around the exact address, all cuisines, split by price level. London areas are big and mixed and can support premium and casual side by side, so judge the level from the nearby mix, not the borough reputation.

## Labour and delivery (8 Oct 2026)
- Staff cost target: full service (premium casual, premium) about 40% of sales, with most staff on Friday and Saturday evenings; casual and value 30–35%, running one fewer person per service than full service.
- Always at least 2 chefs in the kitchen every evening.
- Food cost depends on the cuisine.
- Full service does much less delivery: default 15% for premium casual, none for premium, 25% for casual and value.

## Calibration to London benchmarks (8 Oct 2026)
- Casual pizzeria about £1.2m a year (Pizza Pilgrims reports about £1.3m a site). Covers per seat a day for a pizzeria: value 2.4, casual 1.9, premium casual 1.5, premium 1.2.
- Spend per head multipliers: value 0.75, casual 1, premium casual 1.5, premium 2.8 (e.g. Modern British premium about £112 including VAT).
- Default delivery: value 25%, casual 20%, premium casual 5%, premium 0%. Pizza food cost 23%.
- Labour lands about 30–38% casual and 35–42% full service; Franco Manca filed about 37%.
