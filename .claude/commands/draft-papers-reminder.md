---
description: Draft reminders to berth holders whose insurance, liability cover, electrical check or liveaboard approval has lapsed or is about to.
---

1. Run `npm run marina -- papers --json`.
2. For each boat write `drafts/papers-<vessel>.md`: what is missing or ending and the date, what the licence asks for (`npm run marina -- settings` for the minimum cover and the electrical check interval), and how to send it in.
3. One reminder per owner, even if two things are missing. Lapsed before ending soon.
4. Never send them. When the papers arrive, record them with /papers.
