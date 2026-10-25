<h1 align="center">Marina for Claude Code</h1>

<p align="center">
  <strong>The open-source marina and boatyard system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your PacsoftNG data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=pacsoftng">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/pacsoftng?utm_source=github&utm_medium=readme&utm_campaign=pacsoftng">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-pacsoftng">Instead of PacsoftNG</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Marina for Claude Code does the marina and boatyard work you pay PacsoftNG for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the PacsoftNG screens cannot.

PacsoftNG publishes no price: it is quoted per module (core berths, rental and recurring charges, finance and accounting, boatyard haul-out, interfaces), so the bill grows with every part of the marina you run through it (Capterra and GetApp listings, checked 25 October 2026). This costs nothing, or a setup fee and a retainer if Enterprise DNA runs it for you.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=pacsoftng).

It is built for a marina, boatyard, harbour board or yacht club with twenty to a few hundred berths, moorings and dry stack spaces: the berth board, berth holders and their vessels, the papers the berth licence asks for (insurance, third-party liability cover, the shore power electrical check, liveaboard approval), annual, monthly and visitor licences, the waiting list, the travel lift and its certificate of inspection, haul-outs and the hardstand, yard jobs, shore power readings, and the invoice run that bills all of it. The words are the words a marina office already uses.

**Nothing sends or talks to another system on its own.** Renewal letters, offers, reminders and arrears notices are drafted here and a person sends them. The gates are real, though: a boat is refused a berth it is too long or too wide for, a berth already licensed, or a second berth; a haul-out is refused on a lift whose certificate of inspection has expired, that is too small for the boat or too narrow for its beam; a meter reading lower than the last one is refused; and the invoice run never bills the same night, day, kWh or job twice.

```
/attention                 everything that wants a decision, worst first
/berths                    the berth board: who is where, what is free, what fits a 14 m boat
/papers                    insurance, cover and electrical checks lapsed or ending, and record new ones
/waitlist                  the waiting list matched against free spaces, longest wait first
/arrivals                  tie up a visitor for three nights, with biofouling evidence for overseas boats
/haulout                   book, lift and launch, with the lift certificate, capacity and beam checked
/invoice-run               draft every invoice due: licences, visitors, hardstand, power, yard jobs
/compliance                eight rules: insurance, cover, electrical checks, lift certificates, biofouling, signed licences, berth size, liveaboards
/weekly-review             the Monday review, written from three commands
```

Every "who is on this berth" answer reads one view, `berth_board`: the berths joined to the licence covering today. The berth list, the waiting list match, the compliance check and the invoice run can never disagree about who is where.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no modules: haul-outs, hardstand and shore power are part of it, not add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/marina-for-claude-code.git
cd marina-for-claude-code
npm install
npm run demo
```

`npm run demo` creates the database and loads Kotare Bay Marina (a made-up Northland marina with three piers, swing moorings and a dry stack: 24 spaces, 19 boats on them, four people waiting, a 70 tonne travel lift and a 12 tonne hoist, three boats on the hardstand and six months of invoices; with a launch whose insurance lapsed 12 days ago, a yacht with $2 million cover where the licence asks for $5 million, a catamaran on shore power with its electrical check 40 days out of date, a boat lifted on the hoist after its certificate of inspection expired and another booked on it, a yacht in from Fiji with no biofouling evidence, a berth holder in for a month on an unsigned licence, a 13.4 metre launch on a 12 metre berth, someone living aboard on an approval that ran out, a launch a week past its agreed date on the hardstand, and a berth holder 85 days behind), then prints the marina in five lines, the compliance check and the waiting list match.

Then open the folder in Claude Code and type:

```
/attention
```

Try `/berths`, `/waitlist`, `/hardstand`, `/arrears`, `/invoice-run`. When you are ready for real data, delete `.data/` and start with `/import`.

Fill in the "Who this is for" block in [CLAUDE.md](CLAUDE.md), put your name, logo and colours in [brand.json](brand.json), and set your rules (`npm run marina -- settings --min-cover=5m --gst=...`) so the invoices, licences and checks carry them.

## Your first hour: ten things to ask for

1. "What needs attention today?"
2. "Can we fit a 14 metre launch with a 4.6 metre beam this weekend?"
3. "Here is Dean Harrow's new insurance certificate. Record it."
4. "Who on the waiting list gets B06?"
5. "A yacht called Wanderer is in from Noumea for four nights. Put her on a visitor berth."
6. "Book Second Wind on the travel lift for Tuesday, back in by the following Friday."
7. "Here are this month's meter readings." (paste the list)
8. "Run the invoices for the month, dry run first."
9. "Draft the renewal letters for everyone whose licence ends before Christmas."
10. "Bring in this PacsoftNG berth holder list."

## Ten questions answered from your own records

Every one is a real command or query on the demo data today.

1. Which boats on our piers have lapsed insurance, or cover under the licence minimum? (`papers`, `compliance` R1 and R2)
2. Who on the waiting list fits the spaces free right now, longest wait first, smallest space that fits? (`match`)
3. Which licences end in the next 90 days with no renewal, and how many people are waiting for each of those berths? (`renewals`)
4. Which boats are past their agreed launch date on the hardstand, and what is holding them? (`hardstand`)
5. Who is more than 30 days behind, on which berth, and on which invoices? (`arrears`)
6. Which boats are longer or wider than the berth they are on? (`compliance` R7, `berths`)
7. Which haul-outs were done or are booked on a lift past its certificate of inspection? (`compliance` R4, `lifts`)
8. Which boats in from overseas have no biofouling evidence on file? (`compliance` R5)
9. What does each pier earn a year, per metre of berth, and how full is it? (`occupancy`)
10. Which yard jobs are running over their quote, and by how much? (`jobs`, `job`)

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat or per-module fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything that wants a decision, worst first: rules, money, the yard, berths, papers coming up. |
| `/weekly-review` | The Monday review, written from three commands. |
| `/berths` | The berth board, free spaces, what fits a given length, one berth's card. |
| `/occupancy` | Spaces taken and the yearly fee roll by pier, with the fee per metre. |
| `/vessel` | One boat or one customer in full: papers, licences, haul-outs, jobs, balance, notes. |
| `/papers` | Insurance, cover, electrical checks and liveaboard approvals lapsed or ending; record new ones. |
| `/licence` | Put a boat on a berth, record the signed licence, end one. |
| `/renewals` | Licences ending with no renewal, and who is waiting for those berths. |
| `/waitlist` | The waiting list matched against free spaces, and offer one. |
| `/arrivals` | Visitors in and out, by the night, with biofouling evidence for overseas boats. |
| `/haulout` | Book, lift and launch, with the lift certificate, capacity and beam checked. |
| `/hardstand` | Every boat out of the water, days out and days past the agreed launch. |
| `/yard-job` | Open a job, record labour and parts, check it against the quote, finish it. |
| `/power` | Shore power meter readings and kWh used. |
| `/invoice-run` | Draft every invoice due, then issue them. Never bills anything twice. |
| `/arrears` | Who owes what, aged, with their late invoices. |
| `/compliance` | Eight rules checked against the records, each with its source. |
| `/documents` | Tax invoices, berth licence schedules and statements in your brand. |
| `/view` | The week, papers and money dashboards as printable pages. |
| `/new-view` | Add a dashboard in plain language. |
| `/draft-renewal` | Draft the licence renewal letter. |
| `/draft-offer` | Draft the berth offer to the next person on the waiting list. |
| `/draft-papers-reminder` | Draft reminders for lapsed or ending papers. |
| `/draft-arrears-notice` | Draft a firm, fair notice to a berth holder behind on fees. |
| `/import` | Bring berth holders, boats, berths and licences across from a PacsoftNG export. |
| `/export` | Every table to CSV. |
| `/log` | A dated note on a boat or a person. |
| `/customise` | Change a field, a rule or a rate in plain language. |

Every command is a short recipe over one CLI: `npm run marina -- help` lists it all.

## Instead of PacsoftNG

Set up your settings and lifts by asking for them, export the berth holder or contract list from PacsoftNG as CSV, then:

```
npm run marina -- import pacsoftng berth-holders.csv --dry-run
npm run marina -- import pacsoftng berth-holders.csv
```

Put the berth board next to PacsoftNG's berth plan, and a dry run of the invoice run next to its next billing run, before you switch. The full guide, what maps and what does not: [docs/replace-pacsoftng.md](docs/replace-pacsoftng.md). The rules the compliance check uses, with sources: [docs/compliance.md](docs/compliance.md).

## Architecture

```
marina-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/marina.mjs        the one CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis, the compliance rules and the PacsoftNG guide
  documents.json, views.json  the paperwork and dashboards, as SQL
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Marina for Claude Code for your marina, migrates your PacsoftNG data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=pacsoftng)
- Read more: [enterprisedna.co/omni/instead-of/pacsoftng](https://enterprisedna.co/omni/instead-of/pacsoftng?utm_source=github&utm_medium=readme&utm_campaign=pacsoftng)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
