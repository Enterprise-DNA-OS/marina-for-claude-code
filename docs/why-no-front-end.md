# Why there is no front end

PacsoftNG is a database with a licence fee. The tables underneath it are ordinary: berths, berth holders, vessels, contracts, haul-outs, jobs, charges. What you pay for is the layer on top that lets the office find a berth, a boat or a balance without writing a query. Screens, filters, a berth plan, forms.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, ask "who on the waiting list fits B06?" or "which boats on shore power have an electrical check out of date?", and it runs the query and answers. Ask a question the vendor never built a report for and you still get an answer.

## What you gain

- **Better answers.** Your own questions, in your own words, against your own records.
- **No seats and no modules.** The yard, the office and the harbourmaster all look at the same records. Haul-outs, hardstand and power are not extra modules.
- **Your data in your own database.** Back it up, query it from anything, leave any time.
- **Your rules.** The minimum cover, the liveaboard rule, how the waiting list is matched: change them by asking.

## What a screen gives that this does not

- **A visual berth plan.** Here the berth board is a table, and `npm run view` renders it as a page. A drawn map of the piers is a front end.
- **A phone in the yard.** It runs where Claude Code runs. A yard hand recording hours on a phone at the travel lift wants an app.
- **Online booking for visitors.** A public booking page is a front end on top of these tables.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version for marinas that want someone to call.

Every one of these can be built on top of the same database. That is what Enterprise DNA does when a marina wants it: https://enterprisedna.co/omni/instead-of/pacsoftng
