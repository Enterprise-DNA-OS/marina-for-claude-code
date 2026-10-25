# Moving off PacsoftNG

A day or two for one person, done in this order. Keep PacsoftNG running until a full berth board and a month's invoice run from this system match it, line by line.

## 1. Set up the marina

Short lists, quicker to enter by asking Claude Code than to export:

- **Settings.** Business name, GST number, the minimum liability cover your berth licence asks for, the electrical check interval, the hardstand day rate, the shore power rate and the visitor rate per metre per night: `npm run marina -- settings --name=".." --gst=".." --min-cover=5m --hardstand-rate=45 --power-rate=0.38 --casual-rate=6.50`.
- **Lifts.** Each travel lift, hoist or forklift with its capacity, maximum beam, and its certificate of inspection (number, issued, expires).
- **Berths with no one on them.** The import creates every berth that has a licence on it. Free berths, moorings and dry stack spaces you add by asking: "add A08 to A12, 12 metre berths, 15 amp power, $5,400 a year".

## 2. Export the berth holders

From PacsoftNG, run the berth holder, contract or occupancy report that lists one row per vessel on a berth, with every contract showing (not just those due), and save or export it as a spreadsheet. Save it as CSV. Insurance details are often in a separate vessel report: export that too and join it on vessel name, or enter the certificates as they come in.

## 3. Import

```
npm run marina -- import pacsoftng berth-holders.csv --dry-run
npm run marina -- import pacsoftng berth-holders.csv
```

The dry run writes nothing and reports every row it could not read. Running the import twice is harmless: a customer, vessel, berth and licence already here is matched and left alone.

### What maps

One row per vessel on a berth. Columns are matched by name, ignoring case, with the common variants of each heading. Report layouts differ between sites and versions; if yours uses other headings, rename them in a copy of the file or ask Claude Code to add them to the import.

| This system | Headings it accepts |
|---|---|
| Customer | Customer Name, Customer, Berth Holder, Owner, Account Name, Name |
| Customer id | Customer Code, Account Code, Account, Customer No, Customer ID |
| Contact | Email, Email Address, Phone, Mobile, Phone Number, Address, Postal Address |
| Vessel | Vessel Name, Vessel, Boat Name, Boat |
| Dimensions | LOA, Length Overall, Length, Vessel Length; Beam, Width; Draft, Draught |
| Registration | Registration, Rego, Vessel Rego, Sail Number |
| Insurance | Insurer, Insurance Company, Policy Number, Liability Cover, Public Liability, Insurance Expiry, Policy Expiry |
| Berth | Berth, Berth No, Berth Code, Location, Space, Mooring; Berth Type (berth, mooring, dry stack); Berth Length, Max Length |
| Term | Contract Type, Term, Rate Type, Period (annual, monthly, or casual, nightly, visitor) |
| Dates | Contract Start, Start Date, Start, From, Arrival; Contract End, End Date, Expiry, End, To, Departure |
| Fee | Rate, Contract Rate, Annual Fee, Amount, Fee, Price (before GST) |
| Billed to | Billed To, Paid To, Invoiced To (so the first invoice run starts from the right day) |
| Signed | Signed, Signed Date, Agreement Signed |

Dates in DD/MM/YYYY (the way NZ and AU exports write them) or YYYY-MM-DD both work. A sample file is in `examples/pacsoftng-berth-holders.csv`.

### What does not carry over

- **Invoice and payment history.** Old invoices stay in PacsoftNG and your accounting system. Bring across only what is still owing, as one opening invoice per customer ("add an opening balance of $2,484 for Dean Harrow, due today").
- **Haul-out and yard history.** Start the yard from today: book the boats already on the hardstand with `haul-book` and `haul --date=<the day it came out>`.
- **Power readings.** Take a reading of every meter on the day you switch and record it as billed, so the first power bill starts from there.
- **Gate cards, access control and online booking.** These are other systems. Enterprise DNA connects them as part of a customised version.

## 4. Check before you rely on it

1. `npm run marina -- berths` against PacsoftNG's berth plan: every berth, every boat.
2. `npm run marina -- compliance`: the rules will find papers missing that were never on file. That list is the first week's chasing.
3. `npm run marina -- invoice-run --dry-run` against PacsoftNG's next billing run. When they match, switch.
