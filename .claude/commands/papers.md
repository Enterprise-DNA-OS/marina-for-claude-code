---
description: Insurance certificates, liability cover, electrical checks and liveaboard approvals: what has lapsed, what ends soon, and record what a berth holder has just sent in.
---

- What needs chasing: `npm run marina -- papers` (lapsed, under the minimum cover, or ending in 30 days; `--days=60` to look further).
- Record what came in, one boat at a time:
  - New insurance certificate: `npm run marina -- papers <vessel> --insurer="Harbour Mutual" --policy=HM-1234 --cover=5m --insured-to=2027-10-31`
  - Electrical check (EWOF or lead test): `npm run marina -- papers <vessel> --ewof=2027-10-31`
  - Plugged in or off shore power: `--on-power` or `--off-power`
  - Living aboard approved: `npm run marina -- papers <vessel> --liveaboard --approved-to=2027-04-30`

Read the certificate the operator pastes or attaches and pull the insurer, policy number, third-party liability amount and expiry from it. Say back what you are about to record before you record it. The minimum cover is in `npm run marina -- settings`.

To chase what is missing, use /draft-papers-reminder. Nothing is sent from here.
