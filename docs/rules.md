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
- Every service needs a cook, someone on the floor and someone in charge.
- Nobody works two shifts in a day. Full-timers work at most 5 days, part-timers at most 4.

## Product
- Keep the top Claude model (Opus) and the full web searches. BECHARA wants the best information. Don't downgrade to save money.
- BECHARA wants to offer the app free to the public. To keep that affordable at launch: reuse recent area results, set fair-use limits, set a spending cap, and look for sponsors or referral partners.
- Design: serious retro (1960s–70s modernist). BECHARA rejected a "clean professional" design and an Art Deco design.
