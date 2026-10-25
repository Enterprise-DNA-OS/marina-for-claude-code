---
description: Haul-outs: book a boat on the travel lift or hoist, lift it, put it on the hardstand, launch it. Checks the lift's certificate of inspection, capacity and beam first.
---

- Booked and out: `npm run marina -- haulouts` (`--all` for history). The lifts and their certificates: `npm run marina -- lifts`.
- Book: `npm run marina -- haul-book <vessel> --date=2026-11-03 [--lift=TL70] [--until=<agreed launch date>] [--notes="antifoul"]`.
- Lift it: `npm run marina -- haul <H-number> [--bay=HS-4] [--until=date]`.
- Back in: `npm run marina -- launch <H-number>`. It says if it is past the agreed date and which jobs are still open.
- A new certificate of inspection: `npm run marina -- lift-cert <lift> --cert="COI 2026-2207" --issued=date --expires=date [--inspector=".."]`. The history is kept, so a past lift is checked against the certificate in force that day.

The CLI refuses to book or lift on a lift whose certificate has expired, that is out of service, or that is too small or too narrow for the boat. Never work around that: tell the operator what is needed.
