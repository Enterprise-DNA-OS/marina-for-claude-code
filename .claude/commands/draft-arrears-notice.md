---
description: Draft a firm, fair notice to a berth holder who is behind on fees: what is owed, since when, the date to pay by, and what the licence says happens next.
---

1. Run `npm run marina -- customer <name> --json` and `npm run marina -- arrears --json`. Read the notes first.
2. Render the statement: `npm run docs -- statement`.
3. Write `drafts/arrears-<customer>.md`: each unpaid invoice with its date and amount, the total, a pay-by date (14 days unless the operator says otherwise), how to pay, and the step the marina's berth licence allows if it is not paid. Quote the operator's own licence wording if they give it; never invent a legal consequence.
4. Never send it. Attach the statement when a person sends it.
