---
description: Render the marina's paperwork from the records in its own brand: tax invoices, berth licence schedules and statements of account.
---

- Everything: `npm run docs`. One kind: `npm run docs -- tax-invoice`, `npm run docs -- berth-licence`, `npm run docs -- statement`. One record: add the first characters of its id.
- Files land in `docs-out/<kind>/`, one HTML page each. Print to PDF from the browser.
- The business name, GST number and logo come from `brand.json` and `npm run marina -- settings --name=".." --gst=".."`.

A tax invoice shows the supplier's name and GST number, the date, the customer, each charge, and GST. Check those are set before the first real run. Add a document by adding an entry to `documents.json` (or ask /customise).
