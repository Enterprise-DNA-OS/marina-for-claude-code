---
description: One vessel or one customer, everything on file: the boat's dimensions and papers, licences, haul-outs, jobs, invoices, balance and notes.
---

1. A boat: `npm run marina -- vessel <name, code or rego>`. A person or company: `npm run marina -- customer <name or code>`.
2. If the name matches more than one, the CLI lists them and exits. Ask which one; never guess.
3. Present: who and what, the berth they are on, their papers (insurance, liability cover, electrical check, liveaboard approval) with anything lapsed stated first, money owing and how late, then history.
4. Before drafting anything to this person, read their notes (they are at the bottom of the card).

New people and boats: `npm run marina -- customer-add "name" --email --phone` and `npm run marina -- vessel-add "name" --loa=11.5 --owner=<customer> --beam --draft --weight`.
