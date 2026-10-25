---
description: Put a boat on a berth (annual, monthly or casual), record the signed licence, or end one and free the berth.
---

- New licence: `npm run marina -- licence-new <berth> <vessel> --term=annual|monthly|casual [--from=date] [--to=date] [--rate=5400] [--signed=date]`. The rate defaults to the berth's list fee. It refuses a boat longer or wider than the berth (add `--force` only if the berth really takes it), a berth already licensed over those dates, a boat that already holds another berth, and a berth out of service.
- Signed: `npm run marina -- sign <licence> [--date]`. A boat on a berth with no signed licence shows under rule R6.
- Ended: `npm run marina -- end <licence> [--date]`. It tells you who on the waiting list fits the berth now free.
- All of them: `npm run marina -- licences [--term=monthly] [--all]`.

Render the licence schedule for signing with `npm run docs -- berth-licence`.
