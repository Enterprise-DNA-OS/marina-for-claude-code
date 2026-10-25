# Marina for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs doing, what is wrong, what is late | `/attention` |
| The Monday review | `/weekly-review` |
| Who is on which berth, what is free, what fits a boat | `/berths` |
| How full each pier is, what it earns | `/occupancy` |
| One boat or one person in full | `/vessel` |
| Insurance, cover, electrical checks, liveaboards; a certificate to record | `/papers` |
| A boat onto a berth, a signed licence, a licence ended | `/licence` |
| Licences coming up for renewal | `/renewals` |
| The waiting list, who gets a free berth | `/waitlist` |
| A visitor arriving or leaving | `/arrivals` |
| A haul-out to book, a boat to lift or launch, lift certificates | `/haulout` |
| Boats on the hardstand | `/hardstand` |
| A yard job, labour or parts on it | `/yard-job` |
| Meter readings | `/power` |
| The monthly invoices | `/invoice-run` |
| Who owes what | `/arrears` |
| Are we compliant | `/compliance` |
| Invoices, licence schedules, statements to print | `/documents` |
| A dashboard | `/view`, `/new-view` |
| A renewal letter | `/draft-renewal` |
| A berth offer to someone waiting | `/draft-offer` |
| Reminders for missing papers | `/draft-papers-reminder` |
| A notice to someone behind on fees | `/draft-arrears-notice` |
| Data from PacsoftNG | `/import` |
| All the data out | `/export` |
| A note on a boat or a person | `/log` |
| Change a field, a rule, a rate | `/customise` |

If an ask fits nothing here, run the CLI directly (`npm run marina -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking ended or cancelled.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- Never record insurance, cover, an electrical check or a lift certificate you have not seen. Record what is on the certificate the operator shows you, and say back what you recorded.
- Never book or lift a boat around a refusal from the CLI (an expired lift certificate, a boat over the lift's capacity or beam). Tell the operator what is needed.
- Never put a boat on a berth it does not fit with `--force` unless the operator says the berth takes it.
- Never issue invoices without a dry run the operator has seen in this session.
- Never decide what the berth licence allows (removing a boat, a lien, a penalty). Quote the operator's own licence wording, or ask.

## Where things live

- `scripts/marina.mjs` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis, the compliance rules with their sources, and the guide for moving off PacsoftNG.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/pacsoftng
