---
description: Licences coming to the end of their term with no renewal booked, and who on the waiting list would take the berth if the holder does not renew.
---

1. Run `npm run marina -- renewals` (90 days ahead; `--days=30` for the urgent ones).
2. Present by end date. For each: berth, vessel, holder, end date, current rate, and how many people on the waiting list fit that berth.
3. Note anything that affects the renewal: money owing (`npm run marina -- customer <holder>`), lapsed papers, a boat too long for the berth.
4. Offer to draft the renewal letters with /draft-renewal. A renewal is entered as a new licence when the holder accepts: `npm run marina -- licence-new <berth> <vessel> --term=annual --from=<day after the old one ends> --signed=<date>`.
