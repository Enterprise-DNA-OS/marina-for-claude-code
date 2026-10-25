---
description: Check the records against the rules a marina works under (insurance and cover, shore power electrical checks, lift certificates, biofouling for overseas arrivals, signed licences, berth size, liveaboards) and report every breach with the rule cited.
---

1. Run `npm run marina -- compliance`. Each rule, its source and what a breach looks like are in `docs/compliance.md`.
2. Report as a table: rule, count, the worst example (boat and detail), the source. Breached first.
3. For each breach give the fix the operator can approve: the record to update (/papers, /licence, `marina evidence`), the reminder to draft (/draft-papers-reminder), or the boat to move.
4. If a rule in `docs/compliance.md` does not match this marina's own berth licence or rules (a different minimum cover, a different electrical check interval), say so and stop. The operator confirms the rule, then you update the setting or the doc and the check together.

Nothing here is legal advice. The doc records the rules the operator has told the system to enforce, with sources, and this command checks the data against them.
