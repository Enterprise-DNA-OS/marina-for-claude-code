#!/usr/bin/env node
// End-to-end smoke test on a throwaway embedded database: migrate, seed, then every command
// that matters, asserting on the JSON. Passes on Windows and Linux. No network, no Postgres install.
// TEST_DATABASE_URL runs the same test against a real Postgres (CI does this).

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = mkdtempSync(path.join(tmpdir(), 'marina-smoke-'));
const exportDir = path.join(dataDir, 'export');
const env = { ...process.env, DATA_DIR: dataDir };
delete env.DATABASE_URL;
if (process.env.TEST_DATABASE_URL) env.DATABASE_URL = process.env.TEST_DATABASE_URL;

let step = 0;
function run(label, args, { json = true, expectFail = false } = {}) {
  step++;
  const argv = [path.join(root, 'scripts', args[0]), ...args.slice(1), ...(json ? ['--json'] : [])];
  const res = spawnSync(process.execPath, argv, { cwd: root, env, encoding: 'utf8' });
  const ok = expectFail ? res.status === 1 : res.status === 0;
  if (!ok) {
    console.error(`\nFAIL step ${step} (${label}): exit ${res.status}\n--- stdout\n${res.stdout}\n--- stderr\n${res.stderr}`);
    process.exit(1);
  }
  console.log(`  ok  ${String(step).padStart(2)}  ${label}`);
  if (!json || expectFail) return { stdout: res.stdout, stderr: res.stderr };
  try { return JSON.parse(res.stdout); } catch {
    console.error(`\nFAIL step ${step} (${label}): output is not JSON\n${res.stdout}\n${res.stderr}`);
    process.exit(1);
  }
}
function assert(cond, msg) { if (!cond) { console.error(`\nFAIL assertion: ${msg}`); process.exit(1); } }
const n = (v) => Number(v ?? 0);
const M = (...a) => ['marina.mjs', ...a];
const counts = (rows) => Object.fromEntries(rows.map((x) => [x.id, x.count]));

console.log(`smoke: ${env.DATABASE_URL ? 'Postgres' : 'embedded database in ' + dataDir}`);
try {
  run('migrate', ['migrate.mjs'], { json: false });
  run('migrate again (idempotent)', ['migrate.mjs'], { json: false });
  run('seed', ['seed.mjs'], { json: false });
  run('seed again (idempotent)', ['seed.mjs'], { json: false });

  // ---- the overview
  const stats = run('stats', M('stats'));
  assert(stats.spaces === 23 && stats.occupied === 19 && stats.free === 4 && stats.out_of_service === 1 && stats.visitors === 2, `berth counts ${JSON.stringify(stats)}`);
  assert(stats.on_hardstand === 3 && stats.open_jobs === 2 && stats.waiting === 4 && stats.compliance_breaches === 9, `yard and rules ${JSON.stringify(stats)}`);
  assert(stats.owing_cents === 548000 && stats.arrears_cents === 460000, `money ${stats.owing_cents} ${stats.arrears_cents}`);
  const free = run('free berths', M('berths', '--free'));
  assert(free.map((b) => b.code).sort().join(',') === 'A08,B06,DS-04,M3', `free berths ${free.map((b) => b.code)}`);
  assert(run('berths that take 14 m', M('berths', '--fits=14')).every((b) => n(b.length_m) >= 14), 'fits filter');
  const a07 = run('berth card', M('berth', 'a07'));
  assert(a07.now.oversize && a07.now.vessel === 'Island Time', 'A07 holds a launch too long for it');
  run('unknown berth exits 1', M('berth', 'Z99'), { json: false, expectFail: true });
  run('ambiguous vessel lists and exits 1', M('vessel', 'Harbour Mutual'), { json: false, expectFail: true });
  const kereru = run('vessel by name, any case', M('vessel', 'kereru'));
  assert(kereru.papers.liveaboard_unapproved && kereru.licences[0].berth === 'M1', 'Kereru lives aboard M1 unapproved');
  const dean = run('customer by part name', M('customer', 'Dean'));
  assert(dean.balance.oldest_days_overdue === 85 && dean.invoices.length === 2, 'Dean is 85 days behind on two invoices');
  const occ = run('occupancy', M('occupancy'));
  assert(n(occ.find((p) => p.pier === 'A').fee_roll_cents) === 3996000, 'pier A fee roll');

  // ---- compliance and attention
  const c0 = counts(run('compliance', M('compliance')));
  assert(c0.R1 === 1 && c0.R2 === 1 && c0.R3 === 1 && c0.R4 === 2 && c0.R5 === 1 && c0.R6 === 1 && c0.R7 === 1 && c0.R8 === 1, `compliance counts ${JSON.stringify(c0)}`);
  const att = run('attention', M('attention'));
  assert(att[0].area === 'rules' && att[0].who === 'Reel Easy', 'lapsed insurance leads');
  assert(att.some((a) => a.area === 'money' && a.who === 'Dean Harrow') && att.some((a) => a.area === 'yard' && a.who === "Brannigan's Law"), 'arrears and the overstayer');
  assert(att.filter((a) => /is free and fits/.test(a.what)).length === 3, 'one offer per free space, not one per pair');
  const papers = run('papers', M('papers'));
  assert(papers.length === 4, `four vessels with paper problems (${papers.length})`);
  const ren = run('renewals', M('renewals'));
  assert(ren.length === 3 && ren[0].number === 'L-0011', 'three renewals, B04 first');
  const match = run('waiting list match', M('match'));
  assert(match.matches.find((m) => m.full_name === 'Anna Rees').berth === 'A08' && match.matches.find((m) => m.full_name === 'Kiri Moana').berth === null, 'smallest berth that fits, and nothing for 18 m');
  assert(match.still_free.join() === 'M3', 'M3 left free');
  run('waitlist', M('waitlist'));
  run('licences', M('licences'));
  run('lifts', M('lifts'));
  run('haulouts', M('haulouts'));
  run('hardstand', M('hardstand'));
  run('jobs', M('jobs'));
  run('customers', M('customers'));
  run('vessels', M('vessels'));
  run('arrears', M('arrears'));
  run('settings', M('settings'));

  // ---- fix the papers and the rules
  run('lift refused on an expired certificate', M('haul', 'H-0006'), { json: false, expectFail: true });
  run('booking refused on an expired certificate', M('haul-book', 'Mako', '--date=+5', '--lift=HOIST'), { json: false, expectFail: true });
  run('booking refused over the lift capacity', M('haul-book', 'Te Ra', '--date=+5', '--lift=HOIST'), { json: false, expectFail: true });
  run('hoist re-inspected', M('lift-cert', 'HOIST', '--cert=COI 2026-2207', '--expires=+365'));
  const h6 = run('Gale Force lifted', M('haul', 'H-0006', '--bay=HS-5'));
  assert(h6.vessel === 'Gale Force', 'lifted once the certificate is current');
  run('new insurance certificate', M('papers', 'Reel Easy', '--insured-to=+365'));
  run('cover raised', M('papers', 'Whio', '--cover=5m'));
  run('electrical check done', M('papers', 'Pukeko', '--ewof=+365'));
  run('liveaboard approved', M('papers', 'Kereru', '--approved-to=+180'));
  run('biofouling evidence on file', M('evidence', 'L-0014', 'Hull cleaned and antifouled Suva 2026-10-01, invoice SY-4471'));
  run('licence signed', M('sign', 'L-0006'));
  const c1 = counts(run('compliance after the fixes', M('compliance')));
  assert(c1.R1 === 0 && c1.R2 === 0 && c1.R3 === 0 && c1.R5 === 0 && c1.R6 === 0 && c1.R8 === 0 && c1.R4 === 1 && c1.R7 === 1, `left: the past hoist lift and the long launch ${JSON.stringify(c1)}`);

  // ---- move the long launch, place the waiting list
  run('a vessel cannot hold two berths', M('licence-new', 'B06', 'Island Time'), { json: false, expectFail: true });
  run('too long for the berth is refused', M('licence-new', 'A08', 'Island Time'), { json: false, expectFail: true });
  const end7 = run('end the A07 licence', M('end', 'L-0007'));
  assert(end7.waiting_that_fit.length >= 1, 'A07 free, someone waiting fits');
  const l = run('Island Time to B06', M('licence-new', 'B06', 'Island Time', '--term=annual', '--signed=today'));
  assert(l.number === 'L-0020' && l.rate_cents === 750000, `B06 at the B pier rate (${l.number} ${l.rate_cents})`);
  run('an occupied berth is refused', M('licence-new', 'B06', 'Halcyon'), { json: false, expectFail: true });
  run('out of service berth is refused', M('licence-new', 'C03', 'Halcyon'), { json: false, expectFail: true });
  run('offer A08 to Anna Rees', M('offer', 'Anna Rees', 'A08'));
  const anna = run('Halcyon on A08', M('licence-new', 'A08', 'Halcyon', '--signed=today'));
  assert(anna.term === 'annual' && anna.to, 'annual licence for a year');
  const wl = run('waitlist after placing', M('waitlist'));
  assert(!wl.some((w) => w.full_name === 'Anna Rees') && wl.length === 3, 'Anna placed and off the list');
  const c2 = counts(run('compliance, long launch fixed', M('compliance')));
  assert(c2.R7 === 0, 'R7 clean');

  // ---- visitors
  run('visitor needs a free berth', M('arrive', 'B05', 'Kotuku'), { json: false, expectFail: true });
  const cust = run('new visitor', M('customer-add', 'Jamie Ford', '--kind=visitor', '--email=jamie@example.com'));
  const ves = run('their yacht', M('vessel-add', 'Wanderer', '--loa=10.8', `--owner=${cust.code}`, '--kind=yacht'));
  const arr = run('arrives on A07 for 3 nights', M('arrive', 'A07', ves.code, '--nights=3', '--overseas'));
  assert(arr.term === 'casual' && arr.rate_cents === Math.round(10.8 * 650), `per metre per night (${arr.rate_cents})`);
  const c3 = counts(run('overseas arrival flagged', M('compliance')));
  assert(c3.R5 === 1, 'no biofouling evidence yet');

  // ---- the yard
  const job = run('job on Gale Force', M('job-new', 'Gale Force', 'Hull clean and antifoul', '--haulout=H-0006', '--quote=900'));
  run('done with no work recorded is refused', M('job-done', job.number), { json: false, expectFail: true });
  run('labour', M('job-add', job.number, '--labour=4', '--desc=Water blast and antifoul'));
  run('parts', M('job-add', job.number, '--parts=Antifoul 4 L', '--qty=1', '--unit=385'));
  run('job done', M('job-done', job.number));
  const jc = run('job card', M('job', job.number));
  assert(jc.total_cents === 4 * 9500 + 38500, `job total ${jc.total_cents}`);
  run('launch Gale Force', M('launch', 'H-0006'));
  run('launch twice is refused', M('launch', 'H-0006'), { json: false, expectFail: true });
  run('meter reading lower than the last is refused', M('power-read', 'A03', '10400'), { json: false, expectFail: true });
  const pr = run('meter reading', M('power-read', 'C01', '48500'));
  assert(pr.used_kwh === 67, `kWh since yesterday (${pr.used_kwh})`);

  // ---- money
  const dry = run('invoice run, dry', M('invoice-run', '--dry-run'));
  const live = run('invoice run', M('invoice-run'));
  assert(dry.invoices.length === live.invoices.length && dry.net_cents === live.net_cents && live.invoices.length >= 10, `dry run matches (${dry.invoices.length} ${live.invoices.length})`);
  const again = run('invoice run again bills nothing twice', M('invoice-run'));
  assert(again.invoices.length === 0, 'second run empty');
  const ben = live.invoices.find((i) => i.customer === 'Ben Okafor');
  assert(ben && ben.sources.includes('hardstand') && ben.sources.includes('haulout') && ben.sources.includes('licence'), 'monthly licence, lift and hardstand together');
  const pac = live.invoices.find((i) => i.customer === 'Pacific Charters Ltd');
  assert(pac.net_cents === Math.round((48500 - 48120) * 38), `power since the last billed reading (${pac.net_cents})`);
  const fiona = live.invoices.find((i) => i.customer === 'Fiona Gale');
  assert(fiona.net_cents === 22000 + 4 * 9500 + 38500, `lift and the job, no hardstand for a same-day lift and launch (${fiona.net_cents})`);
  run('issue all', M('issue', '--all'));
  const inv = run('invoice card', M('invoice', pac.invoice));
  assert(inv.invoice.status === 'issued' && n(inv.invoice.gst_cents) === Math.round(pac.net_cents * 0.15), 'issued with GST');
  run('issuing an issued invoice is refused', M('issue', pac.invoice), { json: false, expectFail: true });
  const p1 = run('part payment', M('pay', 'INV-0002', '1000', '--ref=HARROW'));
  assert(p1.status === 'issued' && p1.paid_cents === 100000, 'part paid');
  const p2 = run('rest of it', M('pay', 'INV-0002', '863'));
  assert(p2.status === 'paid', 'settled');
  const after = run('stats after', M('stats'));
  assert(after.arrears_cents === 460000 - 186300, `arrears down by INV-0002 (${after.arrears_cents})`);

  // ---- notes, import, export, documents, views
  run('note on a vessel', M('log', 'Kereru', 'Liveaboard approval letter sent', '--by=Office'));
  const csv = path.join(root, 'examples', 'pacsoftng-berth-holders.csv');
  const imp0 = run('import, dry run', M('import', 'pacsoftng', csv, '--dry-run'));
  assert(imp0.customers === 3 && imp0.licences === 4, `dry run counts ${JSON.stringify(imp0)}`);
  const imp = run('import', M('import', 'pacsoftng', csv));
  assert(imp.customers === 3 && imp.vessels === 4 && imp.berths === 4 && imp.licences === 4 && imp.problems.length === 1, `import counts ${JSON.stringify(imp)}`);
  const imp2 = run('import again changes nothing', M('import', 'pacsoftng', csv));
  assert(imp2.customers === 0 && imp2.licences === 0 && imp2.unchanged === 4, 'idempotent import');
  const d1 = run('imported berth', M('berth', 'D01'));
  assert(d1.now.vessel === 'Sea Biscuit' && d1.now.term === 'annual', 'imported licence on D01');
  const ex = run('export', M('export', `--out=${exportDir}`));
  assert(existsSync(path.join(exportDir, 'licences.csv')) && ex.counts.licences > 20, 'export written');
  run('documents', ['docs.mjs'], { json: false });
  for (const d of ['tax-invoice', 'berth-licence', 'statement']) assert(readdirSync(path.join(root, 'docs-out', d)).length > 0, `${d} rendered`);
  run('views', ['view.mjs'], { json: false });
  for (const v of ['week', 'papers', 'money']) assert(existsSync(path.join(root, 'views', `${v}.html`)), `${v} view`);
  run('help', ['marina.mjs', 'help'], { json: false });
  run('unknown command exits 1', ['marina.mjs', 'nope'], { json: false, expectFail: true });

  console.log(`\nPASS ${step} steps`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
