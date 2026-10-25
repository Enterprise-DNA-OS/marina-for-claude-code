---
description: The monthly invoice run: draft one invoice per customer for monthly licences, annual licences due, visitor nights, haul-outs and hardstand days, shore power and finished yard jobs. Drafts first, then issue.
---

1. Dry run first: `npm run marina -- invoice-run --dry-run [--through=date]`. It writes nothing. Present the drafts by customer with what each is for.
2. Check anything odd with the operator: a large hardstand bill, a power bill far above last month, a job over quote.
3. On a yes: `npm run marina -- invoice-run`. Running it twice never bills the same thing twice.
4. Look at one: `npm run marina -- invoice <INV>`. Issue them: `npm run marina -- issue --all` (or one number). Issuing sets the due date; it sends nothing.
5. Render them for sending: `npm run docs -- tax-invoice`. A person sends them.
6. Payments in: `npm run marina -- pay <INV> <amount including GST> [--ref] [--date]`.
