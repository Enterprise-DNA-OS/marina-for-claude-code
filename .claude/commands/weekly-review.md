---
description: The Monday review, written from three commands: the marina in numbers, what needs a decision, and the berths and yard for the week ahead.
---

Run these three and write the review from what they return. Nothing they do not support goes in.

```
npm run marina -- stats
npm run marina -- attention
npm run marina -- renewals --days=30
```

Then, no more than a page:

1. **The week in one line.** Spaces taken and free, boats on the hardstand, money owing and how much is more than 30 days late.
2. **Rules.** Every compliance breach with the boat and the fix. These lead because they are the marina's risk, not the berth holder's.
3. **Berths.** Free spaces and who on the waiting list they fit (`npm run marina -- match`), licences ending, visitors due out.
4. **Yard.** Haul-outs booked this week, boats past their launch date, jobs over quote.
5. **Money.** The three biggest debts and how old they are.
6. **Five things to do this week**, from the attention list, with why each made it.
7. **One thing to decide.** The single item that needs the manager, not the office.

`npm run view -- week`, `npm run view -- papers` and `npm run view -- money` render the same numbers as printable pages.
