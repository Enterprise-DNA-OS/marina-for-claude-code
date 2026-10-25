---
description: The berth board: who is on every berth, mooring and dry stack space, what is free, and what fits a given boat. Or one berth's card with its licence history and power readings.
---

- The whole board: `npm run marina -- berths`. Free only: `--free`. One pier: `--pier=B`. Spaces that take a given length: `--fits=13.5`. Moorings or dry stack: `--kind=mooring`.
- One berth: `npm run marina -- berth <code>` (A04, b04 and A4 all work only if unambiguous).
- Fee roll and occupancy by pier: `npm run marina -- occupancy`.

Present the board grouped by pier. Call out anything marked TOO LONG, and any free space that fits someone on the waiting list (`npm run marina -- match`). Answer "can you fit a 14 metre launch?" with `--free --fits=14` and the beam check from the berth card.
