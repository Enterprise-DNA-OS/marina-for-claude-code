---
description: Boatyard jobs: open one, record labour and parts against it, check it against the quote, and mark it done so it goes on the next invoice run.
---

- Open jobs and how each tracks against its quote: `npm run marina -- jobs` (`--open`, `--all`).
- One job: `npm run marina -- job <J-number>`.
- New: `npm run marina -- job-new <vessel> "Antifoul and anodes" [--haulout=H-0002] [--quote=1800]`.
- Labour: `npm run marina -- job-add <J> --labour=3.5 --desc="Water blast and sand" [--rate=95] [--date]`.
- Parts: `npm run marina -- job-add <J> --parts="Antifoul 4 L" --qty=2 --unit=385`.
- Finished: `npm run marina -- job-done <J>`. It refuses a job with nothing recorded against it.

Flag any job OVER QUOTE before it is invoiced, and offer to draft a note to the owner explaining the difference.
