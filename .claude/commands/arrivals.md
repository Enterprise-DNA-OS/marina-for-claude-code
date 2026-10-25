---
description: Visitors: tie up a visiting boat for a number of nights, check its papers and, if it came from overseas, its biofouling evidence; and see it off.
---

1. Find a space that fits: `npm run marina -- berths --free --fits=<length>`.
2. If the skipper or boat is new: `npm run marina -- customer-add "name" --kind=visitor --email --phone`, then `npm run marina -- vessel-add "name" --loa=<m> --owner=<customer> --kind=yacht`.
3. Tie them up: `npm run marina -- arrive <berth> <vessel> --nights=3`. Add `--overseas` if their last port was outside New Zealand.
4. An overseas arrival needs biofouling evidence on file before it settles in: a hull clean or antifoul date and invoice, or an inspection report. Record it with `npm run marina -- evidence <licence> "Hull cleaned Suva 2026-10-01, invoice SY-4471"`. Until then it shows under rule R5 in /compliance.
5. When they leave: `npm run marina -- depart <licence>`. Nights are billed on the next invoice run.

Visitors are charged per metre per night (`npm run marina -- settings` shows the rate).
