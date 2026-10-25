---
description: Who owes what, aged 1 to 30, 31 to 60 and over 60 days, with their berth and their late invoices.
---

1. Run `npm run marina -- arrears`.
2. Present oldest first. For anyone over 30 days, read their card (`npm run marina -- customer <name>`) and notes before suggesting anything: a promise to pay or a dispute changes the next step.
3. Suggest one action each: a phone call, a statement (`npm run docs -- statement`), or a formal notice under the berth licence (/draft-arrears-notice).
4. Record what was agreed: `npm run marina -- log <customer> "Agreed to pay by 15 Nov" --by=Office`.
