---
description: The berth waiting list, longest wait first, matched against free spaces, and offer a space to the next person in line.
---

1. The list: `npm run marina -- waitlist`.
2. Who gets what: `npm run marina -- match`. It gives each free space to the longest-waiting person whose boat fits, using the smallest space that fits so the big berths stay free for big boats.
3. To offer one: `npm run marina -- offer <customer> <berth>`, then draft the offer letter with /draft-offer.
4. When they accept: `npm run marina -- licence-new <berth> <vessel> --term=annual --signed=<date>`. That takes them off the list.
5. Someone new: `npm run marina -- wait-add <customer> --length=12 [--kind=berth|mooring|dry_stack] [--vessel=<name>] [--deposit=250]`.

If the marina's policy is not strictly first come (members first, a length band, a deposit rule), say so and offer /customise to change the match.
