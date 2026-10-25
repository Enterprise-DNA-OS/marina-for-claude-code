# Compliance: the rules this system checks

`/compliance` (or `npm run marina -- compliance`) checks the records against the rules below and reports every breach with the rule and its source. They are written for a New Zealand marina, because that is where this was first built. Most of them come from the marina's own berth licence and marina rules, so the first job on installing it is to set the numbers to yours: `npm run marina -- settings --min-cover=5m` and the electrical check interval.

This is a records check. It finds what the records say. It is not legal advice, and it does not replace your berth licence, your lawyer, your insurer, WorkSafe or MPI. Confirm each rule against the current version of its source before you rely on it, and when a rule changes, change the setting or the check (`complianceRows` in `scripts/marina.mjs`) and this page in the same edit.

| Rule | What a breach looks like in the data | Source |
|---|---|---|
| R1 Insurance in date | A vessel on a berth, booked for a haul-out or on the hardstand with no insurance expiry on file, or one in the past | Your berth licence. Marinas commonly require every vessel to be insured: for example Gulf Harbour Marina says all vessels must carry full insurance cover to berth there ([gulfharbourmarina.co.nz](https://gulfharbourmarina.co.nz/insurance-oil-spills-and-doing-our-bit/)) |
| R2 Liability cover at the minimum | A vessel on a berth whose third-party liability cover on file is under `min_liability_cents` (default $5,000,000) | Your berth licence. Gulf Harbour Marina's minimum is $5 million third-party liability with $10 million recommended. Bayview Yacht Racing Association's marina rules (NSW) ask for public liability and removal of wreck cover of at least $10 million ([bys.asn.au](https://bys.asn.au/wp-content/uploads/2026/08/BYSMarinaRulesApril12026.pdf)) |
| R3 Electrical check in date | A vessel on a berth and marked as on shore power with no electrical check on file, or one past its date | AS/NZS 3004.1 (electrical installations, marinas) and AS/NZS 3004.2 (recreational boats) set the standard for the pedestal and the boat. Marinas set the check interval: Royal Melbourne Yacht Squadron asks for boats on shore power to comply with AS/NZS 3004.2 and for leads to be test-and-tagged every 12 months ([rmys.com.au](https://www.rmys.com.au/wp-content/uploads/2019/04/Berthing-Instructions-connection-to-AC-Power-Supply-March-2015.pdf)) |
| R4 Lift certificate of inspection | A haul-out booked on a lift whose current certificate has expired by the booked date, or a lift in the last year on a day no certificate on file covered | Health and Safety in Employment (Pressure Equipment, Cranes, and Passenger Ropeways) Regulations 1999, regulation 10(2): equipment is not to be operated without a current certificate of inspection ([legislation.govt.nz](https://legislation.govt.nz/secondary-legislation/pco-drafted/1999/128/en/latest/)). Confirm with your inspection body that your travel lift or hoist is a crane under the regulations |
| R5 Biofouling evidence for overseas arrivals | A booked or active licence marked as arrived from overseas with no biofouling evidence recorded | MPI's Craft Risk Management Standard for vessels arriving in New Zealand requires a clean hull on arrival, met by cleaning before arrival, continual maintenance or treatment, with evidence. It binds the vessel's operator; the marina keeps the evidence so it knows what it has let in ([mpi.govt.nz](https://www.mpi.govt.nz/dmsdocument/17296/direct)) |
| R6 A signed licence | A vessel occupying a berth under a licence with no signed date | Your berth licence. The licence is the agreement the fees, the rules and every notice rest on; Westhaven Marina, for example, issues written berth licences for its existing marina and its extension ([westhaven.co.nz](https://www.westhaven.co.nz/media/bfunuvqh/berth-licence-existing-marina-december-2022.pdf)) |
| R7 The vessel fits the berth | A vessel whose length overall or beam is more than the berth's | Your marina rules and berth plan. A boat longer than its berth sticks into the fairway and loads the finger beyond its design |
| R8 Liveaboard approved | A vessel marked as lived aboard with no approval, or an approval past its date | Your marina rules. Most marinas limit living aboard and approve it in writing |

## Why each one matters

- **R1 and R2.** A marina fire or a breakaway in a storm becomes the marina's problem when the boat that started it is not insured. The licence asks for cover; this checks the certificate on file says so.
- **R3.** Shore power is the most common cause of electrical faults on the piers. An out-of-date check means the marina is supplying power to a boat nobody has tested.
- **R4.** Lifting a boat on equipment without a current certificate is the marina's legal exposure, not the owner's, and the record of the lift is kept.
- **R5.** A fouled hull from overseas carries organisms into the marina's own water. The evidence takes one minute to ask for at arrival and is hard to get afterwards.
- **R6.** An unsigned licence is a berth holder with no agreed rules, fees or notice period.
- **R7 and R8.** Both are common sources of complaints from neighbouring berth holders, and both are easy to miss when they start as a favour.

## Changing a rule

Ask in plain words ("our minimum cover is $10 million", "electrical checks every 24 months", "liveaboards are not allowed at all"). Claude Code changes the setting or the check and this page together, and runs `npm test`.
