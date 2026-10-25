---
description: Bring berth holders, boats, berths and licences across from PacsoftNG (or any marina system) from its berth holder or contract list saved as CSV.
---

1. Read `docs/replace-pacsoftng.md` with the operator: which report to run and which columns it needs.
2. Dry run: `npm run marina -- import pacsoftng <file.csv> --dry-run`. It writes nothing and lists every row it could not read.
3. If the columns are named differently, map them: open the file, compare the header to the names in the guide, and either rename the header row in a copy or extend the `pick(...)` lists in `scripts/marina.mjs` (`importCmd`).
4. Import: `npm run marina -- import pacsoftng <file.csv>`. Running it twice changes nothing.
5. Check: `npm run marina -- berths` against PacsoftNG's berth plan, and `npm run marina -- licences` against its contract list, before the first invoice run.
