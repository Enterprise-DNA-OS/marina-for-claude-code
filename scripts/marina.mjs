#!/usr/bin/env node
// marina-for-claude-code: the one CLI. The slash commands call this; so can you.
//
//   node scripts/marina.mjs <command> [args] [--flags] [--json]
//   npm run marina -- <command> ...
//
// Run with no arguments (or `help`) for the command list.
//
// This records what a marina, boatyard or harbour office runs every week: berths, moorings and dry
// stack spaces, berth holders and their vessels and papers, licences and casual visitors, the
// waiting list, the lifts and their certificates, haul-outs and the hardstand, boatyard jobs,
// shore power readings, and the invoices that come out of all of it. It sends nothing and talks
// to no other system: renewal letters, statements and notices are drafted here, a person sends them.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { table, isoDate, truncate, heading, money, price } from './lib/format.mjs';

// ---------------------------------------------------------------- settings

// How far ahead "coming up" looks for renewals, insurance and electrical checks.
const SOON_DAYS = 30;
// An issued invoice this many days past due is arrears that needs a call, not a reminder.
const ARREARS_DAYS = 30;
// A visitor still on the berth this many days after their booked departure is flagged.
const OVERSTAY_GRACE_DAYS = 0;

const TERMS = ['annual', 'monthly', 'casual'];
const SOURCE_WORDS = { licence: 'berth fees', casual: 'visitor nights', haulout: 'lift', hardstand: 'hardstand', power: 'power', job: 'yard job', other: 'other' };
const KINDS = ['berth', 'pile', 'mooring', 'dry_stack'];

const RULES = [
  { id: 'R1', rule: 'Insurance in date for every vessel on a berth or in the yard' },
  { id: 'R2', rule: 'Third-party liability cover at or above the licence minimum' },
  { id: 'R3', rule: 'Electrical check in date for every vessel on shore power' },
  { id: 'R4', rule: 'No lift used or booked past its certificate of inspection' },
  { id: 'R5', rule: 'Biofouling evidence on file for every overseas arrival' },
  { id: 'R6', rule: 'A signed licence on file for every vessel on a berth' },
  { id: 'R7', rule: 'Every vessel fits its berth' },
  { id: 'R8', rule: 'Nobody living aboard without approval' },
];

// ---------------------------------------------------------------- arguments

const BOOL_FLAGS = new Set(['json', 'help', 'all', 'dry-run', 'free', 'open', 'overseas', 'on-power', 'off-power', 'liveaboard', 'not-liveaboard']);

function parseArgv(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') { flags.help = true; continue; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      let name, value;
      if (eq > -1) { name = a.slice(2, eq); value = a.slice(eq + 1); }
      else {
        name = a.slice(2);
        const next = argv[i + 1];
        if (BOOL_FLAGS.has(name) || next === undefined || next.startsWith('--')) value = true;
        else value = argv[++i];
      }
      flags[name] = value;
    } else args.push(a);
  }
  return { args, flags };
}

class CliError extends Error {
  constructor(message, code = 1) { super(message); this.code = code; }
}

const n = (v) => Number(v ?? 0);
const str = (v) => (v === true || v === undefined || v === null ? '' : String(v));
const m2 = (v) => (v === null || v === undefined || v === '' ? '' : n(v).toFixed(2));

function today() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const addDays = (date, days) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const monthEnd = (date) => { const d = new Date(`${date}T00:00:00Z`); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); };
const monthName = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function parseDate(v, what = 'date') {
  if (!v || v === true) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.toLowerCase() === 'today') return today();
  if (s.toLowerCase() === 'tomorrow') return addDays(today(), 1);
  if (s.toLowerCase() === 'yesterday') return addDays(today(), -1);
  const rel = s.match(/^([+-]\d+)d?$/);
  if (rel) return addDays(today(), Number(rel[1]));
  // NZ and AU exports write DD/MM/YYYY.
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  throw new CliError(`"${v}" is not a ${what}. Use YYYY-MM-DD.`);
}

function parseNum(v, what) {
  if (v === undefined || v === null || v === '' || v === true) return null;
  const x = Number(String(v).trim().replace(/[,$\s]/g, '').replace(/m$/i, ''));
  if (!Number.isFinite(x) || x < 0) throw new CliError(`"${v}" is not a number of ${what}.`);
  return x;
}
// Dollars in, cents stored. "5,400", "$5400.00", "5m" (millions, for insurance cover) all work.
function parseCents(v, what = 'dollars') {
  if (v === undefined || v === null || v === '' || v === true) return null;
  const s = String(v).trim().toLowerCase().replace(/[,$\s]/g, '').replace(/^nzd|^aud/, '');
  const mult = s.endsWith('m') ? 1e6 : s.endsWith('k') ? 1e3 : 1;
  const x = Number(mult === 1 ? s : s.slice(0, -1)) * mult;
  if (!Number.isFinite(x) || x < 0) throw new CliError(`"${v}" is not an amount of ${what}.`);
  return Math.round(x * 100);
}

// ---------------------------------------------------------------- lookups

let db;
let JSON_OUT = false;
let SETTINGS;

function ambiguous(what, rows, label) {
  return new CliError(`More than one ${what} matches. Be more specific:\n${rows.map((r) => `  ${label(r)}`).join('\n')}`);
}

async function findOne(what, ref, sql, exactKey, label, hint) {
  if (!ref || ref === true) throw new CliError(`Which ${what}? ${hint}`);
  const rows = await db.query(sql, [String(ref), `%${ref}%`]);
  const exact = rows.filter((r) => exactKey(r).some((k) => k && k.toLowerCase() === String(ref).toLowerCase()));
  if (exact.length === 1) return exact[0];
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw new CliError(`No ${what} "${ref}". ${hint}`);
  throw ambiguous(what, exact.length ? exact : rows, label);
}

const findBerth = (ref) => findOne('berth', ref, `select * from berths where lower(code) = lower($1) or code ilike $2 order by code`,
  (r) => [r.code], (r) => `${r.code}  ${r.kind} ${m2(r.length_m)} m`, 'Give its code, for example A04. Run: marina berths');
const findVessel = (ref) => findOne('vessel', ref, `select v.*, c.full_name as owner from vessels v left join customers c on c.id = v.customer_id
  where lower(v.code) = lower($1) or v.name ilike $2 or v.rego ilike $2 or c.full_name ilike $2 order by v.name`,
  (r) => [r.code, r.name, r.rego], (r) => `${r.code}  ${r.name}  (${r.owner || 'no owner'})`, 'Give its name, code (V0004) or registration. Run: marina vessels');
const findCustomer = (ref) => findOne('customer', ref, `select * from customers where lower(code) = lower($1) or full_name ilike $2 or email ilike $2 order by full_name`,
  (r) => [r.code, r.full_name, r.email], (r) => `${r.code}  ${r.full_name}`, 'Give their name or code (C0004). Run: marina customers');
const findLift = (ref) => findOne('lift', ref, `select * from lifts where lower(code) = lower($1) or name ilike $2 order by code`,
  (r) => [r.code], (r) => `${r.code}  ${r.name}`, 'Give its code, for example TL70. Run: marina lifts');

async function findByNumber(tbl, ref, what, prefix) {
  if (!ref || ref === true) throw new CliError(`Which ${what}? Give its number, for example ${prefix}0004.`);
  const s = String(ref).toUpperCase();
  const want = /^\d+$/.test(s) ? `${prefix}${s.padStart(4, '0')}` : s;
  const rows = await db.query(`select * from ${tbl} where upper(number) = $1 or upper(number) like $2 order by number`, [want, `%${s}%`]);
  const exact = rows.filter((r) => r.number.toUpperCase() === want);
  if (exact.length === 1) return exact[0];
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw new CliError(`No ${what} "${ref}".`);
  throw ambiguous(what, rows, (r) => r.number);
}

async function nextNumber(tbl, prefix, col = 'number') {
  const [r] = await db.query(`select coalesce(max(substring(${col} from '[0-9]+$')::int), 0) + 1 as next from ${tbl} where ${col} like $1`, [`${prefix}%`]);
  return `${prefix}${String(r.next).padStart(4, '0')}`;
}

function out(data, human) {
  if (JSON_OUT) console.log(JSON.stringify(data, null, 2));
  else console.log(typeof human === 'function' ? human(data) : human);
}

// ---------------------------------------------------------------- overview

async function stats() {
  const [s] = await db.query(`select
      count(*) filter (where berth_status = 'available') as spaces,
      count(*) filter (where occupancy = 'occupied') as occupied,
      count(*) filter (where occupancy = 'free') as free,
      count(*) filter (where occupancy = 'out of service') as out_of_service,
      count(*) filter (where term = 'casual') as visitors
    from berth_board`);
  const [y] = await db.query(`select (select count(*) from hardstand_now) as on_hardstand, (select count(*) from haulouts where status = 'booked' and booked_for <= current_date + 7) as haulouts_this_week,
      (select count(*) from jobs where status = 'open') as open_jobs, (select count(*) from waitlist where status = 'waiting') as waiting,
      (select coalesce(sum(owing_cents), 0) from customer_balances) as owing_cents,
      (select coalesce(sum(overdue_31_60_cents + overdue_60_plus_cents), 0) from customer_balances) as arrears_cents,
      (select count(*) from renewals_due where days_left <= ${SOON_DAYS}) as renewals_30d`);
  const comp = await complianceRows();
  const r = {
    spaces: n(s.spaces), occupied: n(s.occupied), free: n(s.free), out_of_service: n(s.out_of_service), visitors: n(s.visitors),
    occupancy_pct: s.spaces ? Math.round((n(s.occupied) / n(s.spaces)) * 100) : 0,
    on_hardstand: n(y.on_hardstand), haulouts_this_week: n(y.haulouts_this_week), open_jobs: n(y.open_jobs), waiting: n(y.waiting),
    owing_cents: n(y.owing_cents), arrears_cents: n(y.arrears_cents), renewals_30d: n(y.renewals_30d),
    compliance_breaches: comp.reduce((a, c) => a + c.count, 0),
  };
  out(r, (x) => [heading(`${SETTINGS.business_name}: the marina today`),
    `  Spaces      ${x.occupied} of ${x.spaces} in-service spaces taken (${x.occupancy_pct}%), ${x.free} free, ${x.out_of_service} out of service, ${x.visitors} visitors in`,
    `  Yard        ${x.on_hardstand} on the hardstand, ${x.haulouts_this_week} haul-outs in the next 7 days, ${x.open_jobs} open jobs`,
    `  Money       ${money(x.owing_cents)} owing, ${money(x.arrears_cents)} more than ${ARREARS_DAYS} days late`,
    `  Coming up   licences ending in ${SOON_DAYS} days with no renewal: ${x.renewals_30d}. On the waiting list: ${x.waiting}`,
    `  Rules       compliance breaches: ${x.compliance_breaches} (see marina compliance)`].join('\n'));
}

async function berths(flags) {
  const where = [];
  const params = [];
  if (flags.free) where.push(`occupancy = 'free'`);
  if (flags.pier) { params.push(String(flags.pier)); where.push(`lower(pier) = lower($${params.length})`); }
  if (flags.kind) { params.push(String(flags.kind)); where.push(`kind = $${params.length}`); }
  if (flags.fits) { params.push(parseNum(flags.fits, 'metres')); where.push(`length_m >= $${params.length}`); }
  const rows = await db.query(`select * from berth_board ${where.length ? 'where ' + where.join(' and ') : ''} order by pier, code`, params);
  out(rows, (d) => heading(`Berths${flags.free ? ', free' : ''}`) + '\n' + table(d, [
    { key: 'code', label: 'Berth' }, { key: 'kind', label: 'Kind' }, { key: 'length_m', label: 'Length', align: 'right', format: m2 }, { key: 'power_amps', label: 'Amps', align: 'right' },
    { key: 'occupancy', label: 'Status' }, { key: 'vessel', label: 'Vessel' }, { key: 'loa_m', label: 'LOA', align: 'right', format: m2 }, { key: 'holder', label: 'Holder' },
    { key: 'term', label: 'Term' }, { key: 'ends_on', label: 'Ends', format: isoDate }, { key: 'oversize', label: '', format: (v) => (v ? 'TOO LONG' : '') }]));
}

async function berthCard(args) {
  const b = await findBerth(args[0]);
  const [now] = await db.query(`select * from berth_board where id = $1`, [b.id]);
  const history = await db.query(`select l.number, l.term, l.starts_on, l.ends_on, l.status, v.name as vessel, c.full_name as holder from licences l
    join vessels v on v.id = l.vessel_id join customers c on c.id = l.customer_id where l.berth_id = $1 order by l.starts_on desc limit 10`, [b.id]);
  const power = await db.query(`select read_on, kwh, billed from meter_readings where berth_id = $1 order by read_on desc limit 4`, [b.id]);
  out({ berth: b, now, licences: history, power }, (d) => [heading(`Berth ${b.code}: ${b.kind}, ${m2(b.length_m)} m${b.beam_m ? ` x ${m2(b.beam_m)} m` : ''}${b.power_amps ? `, ${b.power_amps} A power` : ''}`),
    `  ${now.occupancy === 'occupied' ? `${now.vessel} (${m2(now.loa_m)} m), ${now.holder}, ${now.term} licence ${now.licence} from ${isoDate(now.starts_on)}${now.ends_on ? ` to ${isoDate(now.ends_on)}` : ''}${now.oversize ? '. VESSEL IS LONGER THAN THE BERTH' : ''}` : now.occupancy}`,
    `  Fees: ${b.annual_cents ? money(b.annual_cents) + ' a year' : ''}${b.monthly_cents ? `, ${money(b.monthly_cents)} a month` : ''} before GST${b.notes ? `\n  Note: ${b.notes}` : ''}`,
    '', table(d.licences, [{ key: 'number', label: 'Licence' }, { key: 'vessel', label: 'Vessel' }, { key: 'holder', label: 'Holder' }, { key: 'term', label: 'Term' },
      { key: 'starts_on', label: 'From', format: isoDate }, { key: 'ends_on', label: 'To', format: isoDate }, { key: 'status', label: 'Status' }])].join('\n'));
}

// Spaces taken and the yearly fee roll, by pier. Annual fee for annual licences, twelve months for
// monthly ones, visitors left out.
async function occupancy() {
  const rows = await db.query(`select pier, count(*) filter (where berth_status = 'available') as spaces, count(*) filter (where occupancy = 'occupied') as taken,
      count(*) filter (where occupancy = 'free') as free, sum(length_m) filter (where berth_status = 'available') as metres,
      coalesce(sum(case when bb.term = 'annual' then l.rate_cents when bb.term = 'monthly' then l.rate_cents * 12 else 0 end), 0)::bigint as fee_roll_cents
    from berth_board bb left join licences l on l.id = bb.licence_id group by pier order by pier`);
  const res = rows.map((r) => ({ ...r, spaces: n(r.spaces), taken: n(r.taken), free: n(r.free), pct: r.spaces ? Math.round((n(r.taken) / n(r.spaces)) * 100) : 0,
    per_metre_cents: n(r.metres) ? Math.round(n(r.fee_roll_cents) / n(r.metres)) : 0 }));
  out(res, (d) => heading('Occupancy and the yearly fee roll, by pier') + '\n' + table(d, [{ key: 'pier', label: 'Pier' }, { key: 'spaces', label: 'Spaces', align: 'right' },
    { key: 'taken', label: 'Taken', align: 'right' }, { key: 'pct', label: '%', align: 'right' }, { key: 'free', label: 'Free', align: 'right' },
    { key: 'fee_roll_cents', label: 'Fee roll a year', align: 'right', format: money }, { key: 'per_metre_cents', label: 'Per metre', align: 'right', format: money }]) +
    '\n\n  Fee roll: annual licences at their rate, monthly licences at twelve months. Visitors not included.');
}

// ---------------------------------------------------------------- customers and vessels

async function customers() {
  const rows = await db.query(`select c.code, c.full_name, c.kind, c.phone, c.email,
      (select string_agg(v.name, ', ' order by v.name) from vessels v where v.customer_id = c.id and v.status = 'active') as vessels,
      b.owing_cents, b.oldest_days_overdue from customers c join customer_balances b on b.id = c.id order by c.full_name`);
  out(rows, (d) => heading('Customers') + '\n' + table(d, [{ key: 'code', label: 'Code' }, { key: 'full_name', label: 'Name' }, { key: 'kind', label: 'Kind' },
    { key: 'vessels', label: 'Vessels' }, { key: 'phone', label: 'Phone' }, { key: 'owing_cents', label: 'Owing', align: 'right', format: (v) => (n(v) ? money(v) : '') }]));
}

async function customerCard(args) {
  const c = await findCustomer(args.join(' '));
  const vessels = await db.query(`select code, name, loa_m, insurance_expires_on from vessels where customer_id = $1 order by name`, [c.id]);
  const licences = await db.query(`select l.number, b.code as berth, v.name as vessel, l.term, l.starts_on, l.ends_on, l.rate_cents, l.status, l.signed_on from licences l
    join berths b on b.id = l.berth_id join vessels v on v.id = l.vessel_id where l.customer_id = $1 order by l.starts_on desc`, [c.id]);
  const invoices = await db.query(`select number, issued_on, due_on, status, total_cents, paid_cents, days_overdue from invoice_totals where customer_id = $1 order by issued_on desc`, [c.id]);
  const [bal] = await db.query(`select * from customer_balances where id = $1`, [c.id]);
  const notes = await db.query(`select created_at, author, body from notes where customer_id = $1 order by created_at desc limit 10`, [c.id]);
  const waiting = await db.query(`select wants_length_m, wants_kind, joined_on, status from waitlist where customer_id = $1`, [c.id]);
  out({ customer: c, vessels, licences, invoices, balance: bal, notes, waiting }, (d) => [heading(`${c.full_name} (${c.code}), ${c.kind.replace('_', ' ')}`),
    `  ${[c.email, c.phone].filter(Boolean).join('  ')}`, `  Owing ${money(bal.owing_cents)}${bal.oldest_days_overdue > 0 ? `, oldest ${bal.oldest_days_overdue} days late` : ''}`,
    '', table(d.licences, [{ key: 'number', label: 'Licence' }, { key: 'berth', label: 'Berth' }, { key: 'vessel', label: 'Vessel' }, { key: 'term', label: 'Term' },
      { key: 'starts_on', label: 'From', format: isoDate }, { key: 'ends_on', label: 'To', format: isoDate }, { key: 'status', label: 'Status' }, { key: 'signed_on', label: 'Signed', format: (v) => isoDate(v) || 'NOT SIGNED' }]),
    '', table(d.invoices, [{ key: 'number', label: 'Invoice' }, { key: 'issued_on', label: 'Issued', format: isoDate }, { key: 'status', label: 'Status' },
      { key: 'total_cents', label: 'Total', align: 'right', format: money }, { key: 'paid_cents', label: 'Paid', align: 'right', format: money }]),
    d.notes.length ? '\n' + d.notes.map((x) => `  ${isoDate(x.created_at)} ${x.author || ''}: ${x.body}`).join('\n') : ''].join('\n'));
}

async function vessels(flags) {
  const rows = await db.query(`select p.*, bb.code as berth from vessel_papers p left join berth_board bb on bb.vessel_id = p.id ${flags.all ? '' : ''} order by p.name`);
  out(rows, (d) => heading('Vessels') + '\n' + table(d, [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Vessel' }, { key: 'loa_m', label: 'LOA', align: 'right', format: m2 },
    { key: 'owner', label: 'Owner' }, { key: 'berth', label: 'Berth' }, { key: 'insurance_expires_on', label: 'Insured to', format: isoDate }, { key: 'ewof_expires_on', label: 'Electrical to', format: isoDate }]));
}

async function vesselCard(args) {
  const v = await findVessel(args.join(' '));
  const [p] = await db.query(`select * from vessel_papers where id = $1`, [v.id]);
  const licences = await db.query(`select l.number, b.code as berth, l.term, l.starts_on, l.ends_on, l.status from licences l join berths b on b.id = l.berth_id where l.vessel_id = $1 order by l.starts_on desc`, [v.id]);
  const haulouts = await db.query(`select h.number, h.booked_for, h.hauled_on, h.launched_on, h.status, l.code as lift from haulouts h left join lifts l on l.id = h.lift_id where h.vessel_id = $1 order by h.booked_for desc`, [v.id]);
  const jobs = await db.query(`select number, title, status, opened_on, done_on from jobs where vessel_id = $1 order by opened_on desc`, [v.id]);
  const notes = await db.query(`select created_at, author, body from notes where vessel_id = $1 order by created_at desc limit 10`, [v.id]);
  const flagsOut = [p?.insurance_lapsed && 'INSURANCE LAPSED', p?.cover_short && 'LIABILITY COVER UNDER MINIMUM', p?.ewof_lapsed && 'ELECTRICAL CHECK OUT OF DATE', p?.liveaboard_unapproved && 'LIVING ABOARD WITHOUT APPROVAL'].filter(Boolean);
  out({ vessel: v, papers: p, licences, haulouts, jobs, notes }, (d) => [heading(`${v.name} (${v.code}): ${v.make_model || v.kind}, ${m2(v.loa_m)} m LOA${v.beam_m ? `, ${m2(v.beam_m)} m beam` : ''}${v.draft_m ? `, ${m2(v.draft_m)} m draft` : ''}`),
    `  Owner ${v.owner || 'none'}. Rego ${v.rego || 'none'}. ${v.weight_t ? `${n(v.weight_t)} t.` : ''}`,
    `  Insurance ${v.insurer || 'none on file'}${v.policy_no ? ` ${v.policy_no}` : ''}, liability ${v.liability_cents ? money(v.liability_cents) : 'unknown'}, to ${isoDate(v.insurance_expires_on) || 'unknown'}`,
    `  Electrical check to ${isoDate(v.ewof_expires_on) || 'none on file'}${v.on_shore_power ? ', on shore power' : ''}${v.liveaboard ? `. Lives aboard, approved to ${isoDate(v.liveaboard_approved_until) || 'never'}` : ''}`,
    flagsOut.length ? `  ${flagsOut.join('. ')}` : '',
    '', table(d.licences, [{ key: 'number', label: 'Licence' }, { key: 'berth', label: 'Berth' }, { key: 'term', label: 'Term' }, { key: 'starts_on', label: 'From', format: isoDate }, { key: 'ends_on', label: 'To', format: isoDate }, { key: 'status', label: 'Status' }]),
    d.haulouts.length ? '\n' + table(d.haulouts, [{ key: 'number', label: 'Haul-out' }, { key: 'lift', label: 'Lift' }, { key: 'booked_for', label: 'Booked', format: isoDate }, { key: 'hauled_on', label: 'Out', format: isoDate }, { key: 'launched_on', label: 'In', format: isoDate }, { key: 'status', label: 'Status' }]) : '',
    d.jobs.length ? '\n' + table(d.jobs, [{ key: 'number', label: 'Job' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }]) : '',
    d.notes.length ? '\n' + d.notes.map((x) => `  ${isoDate(x.created_at)} ${x.author || ''}: ${x.body}`).join('\n') : ''].filter((x) => x !== '').join('\n'));
}

async function vesselAdd(args, flags) {
  const name = args.join(' ').trim();
  if (!name || !flags.loa) throw new CliError('marina vessel-add "name" --loa=11.5 --owner=<customer> [--beam --draft --kind --make --rego --weight]');
  const owner = flags.owner ? await findCustomer(flags.owner) : null;
  const code = await nextNumber('vessels', 'V', 'code');
  const [v] = await db.query(`insert into vessels (code, name, customer_id, rego, kind, make_model, loa_m, beam_m, draft_m, weight_t) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning code, name`,
    [code, name, owner?.id || null, str(flags.rego) || null, str(flags.kind) || 'launch', str(flags.make) || null, parseNum(flags.loa, 'metres'), parseNum(flags.beam, 'metres'), parseNum(flags.draft, 'metres'), parseNum(flags.weight, 'tonnes')]);
  out(v, (x) => `  ${x.code} ${x.name} added${owner ? ` for ${owner.full_name}` : ''}.`);
}

async function customerAdd(args, flags) {
  const name = args.join(' ').trim();
  if (!name) throw new CliError('marina customer-add "full name" [--email --phone --kind=berth_holder|visitor|yard_only|company]');
  const code = await nextNumber('customers', 'C', 'code');
  const [c] = await db.query(`insert into customers (code, full_name, email, phone, kind) values ($1,$2,$3,$4,$5) returning code, full_name`,
    [code, name, str(flags.email) || null, str(flags.phone) || null, str(flags.kind) || 'berth_holder']);
  out(c, (x) => `  ${x.code} ${x.full_name} added.`);
}

// Record what the berth holder sent: a new insurance certificate, an electrical check, liveaboard approval.
async function papers(args, flags) {
  if (!args.length) return papersList(flags);
  const v = await findVessel(args.join(' '));
  const sets = [];
  const params = [v.id];
  const set = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (flags.insurer) set('insurer', str(flags.insurer));
  if (flags.policy) set('policy_no', str(flags.policy));
  if (flags.cover) set('liability_cents', parseCents(flags.cover, 'cover'));
  if (flags['insured-to']) set('insurance_expires_on', parseDate(flags['insured-to']));
  if (flags.ewof) set('ewof_expires_on', parseDate(flags.ewof));
  if (flags['on-power']) set('on_shore_power', true);
  if (flags['off-power']) set('on_shore_power', false);
  if (flags.liveaboard) set('liveaboard', true);
  if (flags['not-liveaboard']) set('liveaboard', false);
  if (flags['approved-to']) set('liveaboard_approved_until', parseDate(flags['approved-to']));
  if (!sets.length) throw new CliError('Nothing to change. marina papers <vessel> [--insurer --policy --cover=5m --insured-to=date] [--ewof=date] [--on-power|--off-power] [--liveaboard --approved-to=date]');
  await db.query(`update vessels set ${sets.join(', ')} where id = $1`, params);
  const [p] = await db.query(`select * from vessel_papers where id = $1`, [v.id]);
  out(p, (x) => `  ${x.name}: insured to ${isoDate(x.insurance_expires_on) || 'unknown'} for ${money(x.liability_cents)} liability, electrical check to ${isoDate(x.ewof_expires_on) || 'none'}.` +
    ([x.insurance_lapsed && 'insurance lapsed', x.cover_short && 'cover under the minimum', x.ewof_lapsed && 'electrical check out of date', x.liveaboard_unapproved && 'living aboard without approval'].filter(Boolean).map((s) => ` Still: ${s}.`).join('')));
}

async function papersList(flags) {
  const days = n(flags.days || SOON_DAYS);
  const rows = await db.query(`select * from vessel_papers where insurance_lapsed or cover_short or ewof_lapsed or liveaboard_unapproved
    or insurance_days_left <= $1 or (on_shore_power and ewof_days_left <= $1) order by least(insurance_days_left, coalesce(ewof_days_left, 9999)) nulls first`, [days]);
  const res = rows.map((r) => ({ ...r, problem: [r.insurance_lapsed && 'insurance lapsed', r.cover_short && `cover ${money(r.liability_cents)} under ${money(SETTINGS.min_liability_cents)}`,
    r.ewof_lapsed && 'electrical check out of date', r.liveaboard_unapproved && 'living aboard, not approved',
    !r.insurance_lapsed && r.insurance_days_left <= days && `insurance ends in ${r.insurance_days_left} days`,
    !r.ewof_lapsed && r.on_shore_power && r.ewof_days_left !== null && r.ewof_days_left <= days && `electrical check ends in ${r.ewof_days_left} days`].filter(Boolean).join('; ') }));
  out(res, (d) => heading(`Vessel papers: lapsed, short, or ending in ${days} days`) + '\n' + table(d, [{ key: 'name', label: 'Vessel' }, { key: 'owner', label: 'Owner' },
    { key: 'on_berth', label: 'On berth', format: (v) => (v ? 'yes' : '') }, { key: 'problem', label: 'Problem' }]));
}

// ---------------------------------------------------------------- licences

async function licences(flags) {
  const where = [`l.status = 'active'`];
  if (flags.all) where.length = 0;
  if (flags.term) where.push(`l.term = '${TERMS.includes(flags.term) ? flags.term : 'x'}'`);
  const rows = await db.query(`select l.number, b.code as berth, v.name as vessel, c.full_name as holder, l.term, l.starts_on, l.ends_on, l.rate_cents, l.billed_to, l.signed_on, l.status
    from licences l join berths b on b.id = l.berth_id join vessels v on v.id = l.vessel_id join customers c on c.id = l.customer_id
    ${where.length ? 'where ' + where.join(' and ') : ''} order by b.code, l.starts_on`);
  out(rows, (d) => heading('Licences') + '\n' + table(d, [{ key: 'number', label: 'Licence' }, { key: 'berth', label: 'Berth' }, { key: 'vessel', label: 'Vessel' }, { key: 'holder', label: 'Holder' },
    { key: 'term', label: 'Term' }, { key: 'starts_on', label: 'From', format: isoDate }, { key: 'ends_on', label: 'To', format: isoDate },
    { key: 'rate_cents', label: 'Rate', align: 'right', format: (v, r) => `${money(v)}/${r.term === 'annual' ? 'yr' : r.term === 'monthly' ? 'mo' : 'night'}` },
    { key: 'billed_to', label: 'Billed to', format: isoDate }, { key: 'signed_on', label: 'Signed', format: (v) => isoDate(v) || 'NO' }]));
}

async function renewals(flags) {
  const days = n(flags.days || 90);
  const rows = await db.query(`select r.*, (select count(*) from waitlist w where w.status = 'waiting' and w.wants_length_m <= b.length_m and w.wants_kind = b.kind) as waiting_that_fit
    from renewals_due r join licences l on l.id = r.id join berths b on b.id = l.berth_id where r.days_left <= $1 order by r.ends_on`, [days]);
  out(rows, (d) => heading(`Licences ending in the next ${days} days with nothing after them`) + '\n' + table(d, [{ key: 'number', label: 'Licence' }, { key: 'berth', label: 'Berth' },
    { key: 'vessel', label: 'Vessel' }, { key: 'holder', label: 'Holder' }, { key: 'ends_on', label: 'Ends', format: isoDate }, { key: 'days_left', label: 'Days', align: 'right' },
    { key: 'rate_cents', label: 'Rate', align: 'right', format: money }, { key: 'waiting_that_fit', label: 'Waiting', align: 'right' }]) +
    '\n\n  Waiting: people on the waiting list whose boat fits this berth if the holder does not renew.');
}

async function licenceNew(args, flags) {
  const b = await findBerth(args[0]);
  const v = await findVessel(args.slice(1).join(' '));
  const term = str(flags.term) || 'annual';
  if (!TERMS.includes(term)) throw new CliError(`--term must be one of ${TERMS.join(', ')}`);
  const from = parseDate(flags.from) || today();
  const [busy] = await db.query(`select l.number, v.name from licences l join vessels v on v.id = l.vessel_id where l.berth_id = $1 and l.status in ('active', 'booked')
    and l.starts_on <= coalesce($3::date, '9999-12-31') and coalesce(l.ends_on, '9999-12-31') >= $2`, [b.id, from, parseDate(flags.to)]);
  if (busy) throw new CliError(`${b.code} is already licensed to ${busy.name} (${busy.number}) over those dates.`);
  if (b.status === 'out_of_service') throw new CliError(`${b.code} is out of service${b.notes ? `: ${b.notes}` : ''}.`);
  if (!v.customer_id) throw new CliError(`${v.name} has no owner on file. Add one first.`);
  const [elsewhere] = await db.query(`select l.number, b.code from licences l join berths b on b.id = l.berth_id where l.vessel_id = $1 and l.status in ('active', 'booked') and l.berth_id <> $2
    and l.starts_on <= coalesce($4::date, '9999-12-31') and coalesce(l.ends_on, '9999-12-31') >= $3`, [v.id, b.id, from, parseDate(flags.to)]);
  if (elsewhere) throw new CliError(`${v.name} already has ${elsewhere.number} on ${elsewhere.code} over those dates. End it first: marina end ${elsewhere.number}`);
  const to = parseDate(flags.to) || (term === 'annual' ? addDays(addDays(from, 365), -1) : null);
  if (term === 'casual' && !to) throw new CliError('A visitor needs a departure date: --to=date or --nights=3');
  const rate = parseCents(flags.rate) ?? (term === 'annual' ? n(b.annual_cents) : term === 'monthly' ? n(b.monthly_cents) : Math.round(n(v.loa_m) * SETTINGS.casual_cents_per_metre_night));
  const warnings = [];
  if (n(v.loa_m) > n(b.length_m)) warnings.push(`${v.name} is ${m2(v.loa_m)} m, longer than ${b.code} (${m2(b.length_m)} m)`);
  if (b.beam_m && n(v.beam_m) > n(b.beam_m)) warnings.push(`${v.name} is ${m2(v.beam_m)} m wide, ${b.code} takes ${m2(b.beam_m)} m`);
  if (warnings.length && !flags.force) throw new CliError(`${warnings.join('. ')}. Add --force if the berth really takes it.`);
  const number = await nextNumber('licences', 'L-');
  const status = from > today() ? 'booked' : 'active';
  await db.query(`insert into licences (number, berth_id, vessel_id, customer_id, term, starts_on, ends_on, rate_cents, signed_on, arrived_from_overseas, biofouling_evidence, status, notes)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [number, b.id, v.id, v.customer_id, term, from, to, rate, parseDate(flags.signed), !!flags.overseas, str(flags.evidence) || null, status, str(flags.notes) || null]);
  if (term !== 'casual') await db.query(`update waitlist set status = 'placed' where customer_id = $1 and status in ('waiting', 'offered')`, [v.customer_id]);
  out({ number, berth: b.code, vessel: v.name, term, from, to, rate_cents: rate, status, warnings }, (x) => `  ${x.number}: ${x.vessel} on ${x.berth}, ${x.term} from ${x.from}${x.to ? ` to ${x.to}` : ''} at ${money(x.rate_cents)}. ${x.status}.` +
    (flags.signed ? '' : ' Not signed yet: record it with marina sign ' + x.number));
}

// A visitor tied up today: a casual licence by the night.
async function arrive(args, flags) {
  const nights = n(flags.nights || 1);
  return licenceNew(args, { ...flags, term: 'casual', from: flags.from || today(), to: flags.to || addDays(parseDate(flags.from) || today(), nights), signed: flags.signed || today() });
}

async function sign(args, flags) {
  const l = await findByNumber('licences', args[0], 'licence', 'L-');
  await db.query(`update licences set signed_on = $2 where id = $1`, [l.id, parseDate(flags.date) || today()]);
  out({ number: l.number, signed_on: parseDate(flags.date) || today() }, (x) => `  ${x.number} signed ${x.signed_on}.`);
}

async function evidence(args) {
  const l = await findByNumber('licences', args[0], 'licence', 'L-');
  const text = args.slice(1).join(' ').trim();
  if (!text) throw new CliError('marina evidence <licence> "Hull cleaned Suva 2026-10-01, invoice 4471"');
  await db.query(`update licences set biofouling_evidence = $2, arrived_from_overseas = true where id = $1`, [l.id, text]);
  out({ number: l.number, biofouling_evidence: text }, (x) => `  ${x.number}: biofouling evidence recorded.`);
}

async function endLicence(args, flags) {
  const l = await findByNumber('licences', args[0], 'licence', 'L-');
  const on = parseDate(flags.date) || today();
  await db.query(`update licences set status = 'ended', ended_on = $2, ends_on = least(coalesce(ends_on, $2), $2) where id = $1`, [l.id, on]);
  const [b] = await db.query(`select code, length_m, kind from berths where id = $1`, [l.berth_id]);
  const fit = await waitingFor(b);
  out({ number: l.number, ended_on: on, berth: b.code, waiting_that_fit: fit }, (x) => `  ${x.number} ended ${x.ended_on}. ${x.berth} is free.` +
    (fit.length ? ` First on the waiting list who fits: ${fit[0].full_name} (${m2(fit[0].wants_length_m)} m, waiting since ${isoDate(fit[0].joined_on)}).` : ''));
}

const depart = (args, flags) => endLicence(args, flags);

// ---------------------------------------------------------------- waiting list

async function waitingFor(b) {
  return db.query(`select w.*, c.full_name, c.code as customer_code, v.name as vessel, v.loa_m from waitlist w join customers c on c.id = w.customer_id left join vessels v on v.id = w.vessel_id
    where w.status = 'waiting' and w.wants_kind = $1 and coalesce(v.loa_m, w.wants_length_m) <= $2 order by w.joined_on`, [b.kind, b.length_m]);
}

async function waitlist() {
  const rows = await db.query(`select c.code as customer_code, c.full_name, v.name as vessel, coalesce(v.loa_m, w.wants_length_m) as length_m, w.wants_kind, w.joined_on,
      (current_date - w.joined_on) as days_waiting, w.deposit_cents, w.status, ob.code as offered_berth, w.offered_on, w.notes
    from waitlist w join customers c on c.id = w.customer_id left join vessels v on v.id = w.vessel_id left join berths ob on ob.id = w.offered_berth_id
    where w.status in ('waiting', 'offered') order by w.joined_on`);
  out(rows, (d) => heading('Waiting list, longest first') + '\n' + table(d, [{ key: 'full_name', label: 'Name' }, { key: 'vessel', label: 'Vessel' },
    { key: 'length_m', label: 'Length', align: 'right', format: m2 }, { key: 'wants_kind', label: 'Wants' }, { key: 'days_waiting', label: 'Days', align: 'right' },
    { key: 'deposit_cents', label: 'Deposit', align: 'right', format: (v) => (n(v) ? money(v) : '') }, { key: 'status', label: 'Status' }, { key: 'offered_berth', label: 'Offered' }]));
}

async function waitAdd(args, flags) {
  const c = await findCustomer(args.join(' '));
  const v = flags.vessel ? await findVessel(flags.vessel) : null;
  const len = parseNum(flags.length, 'metres') ?? (v ? n(v.loa_m) : null);
  if (!len) throw new CliError('How long a berth? --length=12 or --vessel=<name>');
  const kind = str(flags.kind) || 'berth';
  if (!KINDS.includes(kind)) throw new CliError(`--kind must be one of ${KINDS.join(', ')}`);
  await db.query(`insert into waitlist (customer_id, vessel_id, wants_length_m, wants_kind, joined_on, deposit_cents, notes) values ($1,$2,$3,$4,$5,$6,$7)`,
    [c.id, v?.id || null, len, kind, parseDate(flags.date) || today(), parseCents(flags.deposit) || 0, str(flags.notes) || null]);
  out({ customer: c.full_name, length_m: len, kind }, (x) => `  ${x.customer} added to the waiting list for a ${m2(x.length_m)} m ${x.kind}.`);
}

// Free spaces against the waiting list, longest wait first. A space goes to the first person whose
// boat fits; the smallest space that fits is suggested so the big ones stay free for big boats.
async function matches() {
  const free = await db.query(`select * from berth_board where occupancy = 'free' order by length_m, code`);
  const waiting = await db.query(`select w.id, c.full_name, c.code as customer_code, v.name as vessel, coalesce(v.loa_m, w.wants_length_m) as length_m, w.wants_kind, w.joined_on, (current_date - w.joined_on) as days_waiting
    from waitlist w join customers c on c.id = w.customer_id left join vessels v on v.id = w.vessel_id where w.status = 'waiting' order by w.joined_on`);
  const taken = new Set();
  const res = [];
  for (const w of waiting) {
    const b = free.find((f) => !taken.has(f.code) && f.kind === w.wants_kind && n(f.length_m) >= n(w.length_m));
    if (b) taken.add(b.code);
    res.push({ ...w, berth: b?.code || null, berth_length_m: b?.length_m || null, annual_cents: b?.annual_cents || null });
  }
  return { res, empty: free.filter((f) => !taken.has(f.code)).map((f) => f.code) };
}

async function match() {
  const { res, empty } = await matches();
  out({ matches: res, still_free: empty }, (d) => heading('Free spaces against the waiting list') + '\n' + table(d.matches, [{ key: 'full_name', label: 'Waiting' }, { key: 'vessel', label: 'Vessel' },
    { key: 'length_m', label: 'Length', align: 'right', format: m2 }, { key: 'wants_kind', label: 'Wants' }, { key: 'days_waiting', label: 'Days', align: 'right' },
    { key: 'berth', label: 'Offer', format: (v) => v || 'nothing fits yet' }, { key: 'annual_cents', label: 'Fee a year', align: 'right', format: (v) => (v ? money(v) : '') }]) +
    `\n\n  Still free after offers: ${d.still_free.join(', ') || 'none'}. Make an offer with: marina offer <customer> <berth>`);
}

async function offer(args, flags) {
  const c = await findCustomer(args[0]);
  const b = await findBerth(args[1]);
  const [w] = await db.query(`select * from waitlist where customer_id = $1 and status = 'waiting' order by joined_on limit 1`, [c.id]);
  if (!w) throw new CliError(`${c.full_name} is not waiting for a space.`);
  const [occ] = await db.query(`select occupancy from berth_board where id = $1`, [b.id]);
  if (occ.occupancy !== 'free') throw new CliError(`${b.code} is ${occ.occupancy}.`);
  await db.query(`update waitlist set status = 'offered', offered_berth_id = $2, offered_on = $3 where id = $1`, [w.id, b.id, parseDate(flags.date) || today()]);
  out({ customer: c.full_name, berth: b.code }, (x) => `  ${x.berth} offered to ${x.customer}. Draft the offer letter with /draft-offer; nothing is sent from here.`);
}

// ---------------------------------------------------------------- the yard

async function lifts() {
  const rows = await db.query(`select l.*, (l.certificate_expires_on - current_date) as days_left,
      (select count(*) from haulouts h where h.lift_id = l.id and h.status = 'booked') as booked from lifts l order by l.code`);
  out(rows, (d) => heading('Lifts and their certificates of inspection') + '\n' + table(d, [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Lift' },
    { key: 'capacity_t', label: 'Tonnes', align: 'right', format: (v) => String(n(v)) }, { key: 'certificate_no', label: 'Certificate' },
    { key: 'certificate_expires_on', label: 'Expires', format: isoDate }, { key: 'days_left', label: 'Days', align: 'right', format: (v) => (n(v) < 0 ? `${v} EXPIRED` : v) }, { key: 'booked', label: 'Booked', align: 'right' }]));
}

async function liftCert(args, flags) {
  const l = await findLift(args[0]);
  const expires = parseDate(flags.expires);
  if (!flags.cert || !expires) throw new CliError('marina lift-cert <lift> --cert="COI 2026-2001" --expires=YYYY-MM-DD');
  const issued = parseDate(flags.issued) || today();
  if (expires <= issued) throw new CliError('The certificate expires before it was issued.');
  await db.query(`insert into lift_certificates (lift_id, certificate_no, issued_on, expires_on, inspector) values ($1,$2,$3,$4,$5)
    on conflict (lift_id, certificate_no) do update set issued_on = excluded.issued_on, expires_on = excluded.expires_on, inspector = coalesce(excluded.inspector, lift_certificates.inspector)`,
    [l.id, str(flags.cert), issued, expires, str(flags.inspector) || null]);
  await db.query(`update lifts set certificate_no = $2, certificate_expires_on = $3 where id = $1`, [l.id, str(flags.cert), expires]);
  out({ lift: l.code, certificate_no: str(flags.cert), issued, expires }, (x) => `  ${x.lift}: certificate ${x.certificate_no} to ${x.expires}.`);
}

async function haulouts(flags) {
  const rows = await db.query(`select h.number, v.name as vessel, v.loa_m, v.weight_t, l.code as lift, h.booked_for, h.hauled_on, h.hardstand_bay, h.hardstand_until, h.launched_on, h.status
    from haulouts h join vessels v on v.id = h.vessel_id left join lifts l on l.id = h.lift_id
    ${flags.all ? '' : `where h.status in ('booked', 'out')`} order by coalesce(h.hauled_on, h.booked_for)`);
  out(rows, (d) => heading('Haul-outs') + '\n' + table(d, [{ key: 'number', label: 'No' }, { key: 'vessel', label: 'Vessel' }, { key: 'weight_t', label: 'Tonnes', align: 'right', format: (v) => (v ? String(n(v)) : '') },
    { key: 'lift', label: 'Lift' }, { key: 'booked_for', label: 'Booked', format: isoDate }, { key: 'hauled_on', label: 'Out', format: isoDate }, { key: 'hardstand_bay', label: 'Bay' },
    { key: 'hardstand_until', label: 'Back in by', format: isoDate }, { key: 'status', label: 'Status' }]));
}

async function hardstand() {
  const rows = await db.query(`select * from hardstand_now order by days_over desc, hauled_on`);
  out(rows, (d) => heading('On the hardstand now') + '\n' + table(d, [{ key: 'number', label: 'No' }, { key: 'vessel', label: 'Vessel' }, { key: 'owner', label: 'Owner' },
    { key: 'hardstand_bay', label: 'Bay' }, { key: 'hauled_on', label: 'Out since', format: isoDate }, { key: 'days_out', label: 'Days', align: 'right' },
    { key: 'hardstand_until', label: 'Agreed back in', format: isoDate }, { key: 'days_over', label: 'Over', align: 'right', format: (v) => (n(v) ? v : '') }, { key: 'open_jobs', label: 'Open jobs', align: 'right' }]));
}

async function liftCheck(lift, vessel, date) {
  const problems = [];
  if (lift.status === 'out_of_service') problems.push(`${lift.code} is out of service`);
  if (!lift.certificate_expires_on || isoDate(lift.certificate_expires_on) < date) problems.push(`${lift.code}'s certificate of inspection ${lift.certificate_expires_on ? `expired ${isoDate(lift.certificate_expires_on)}` : 'is not on file'}`);
  if (vessel.weight_t && n(vessel.weight_t) > n(lift.capacity_t)) problems.push(`${vessel.name} weighs ${n(vessel.weight_t)} t, over ${lift.code}'s ${n(lift.capacity_t)} t`);
  if (vessel.beam_m && lift.max_beam_m && n(vessel.beam_m) > n(lift.max_beam_m)) problems.push(`${vessel.name} is ${m2(vessel.beam_m)} m wide, ${lift.code} takes ${m2(lift.max_beam_m)} m`);
  return problems;
}

async function haulBook(args, flags) {
  const v = await findVessel(args.join(' '));
  const date = parseDate(flags.date);
  if (!date) throw new CliError('marina haul-book <vessel> --date=YYYY-MM-DD [--lift=TL70] [--until=date] [--notes=".."]');
  const lift = await findLift(flags.lift || 'TL70');
  const problems = await liftCheck(lift, v, date);
  if (problems.length) throw new CliError(`Cannot book: ${problems.join('; ')}.`);
  const number = await nextNumber('haulouts', 'H-');
  const lift_cents = parseCents(flags.price) ?? (n(v.loa_m) >= 12 ? 85000 : n(v.loa_m) >= 9 ? 65000 : 22000);
  await db.query(`insert into haulouts (number, vessel_id, lift_id, booked_for, hardstand_until, lift_cents, notes) values ($1,$2,$3,$4,$5,$6,$7)`,
    [number, v.id, lift.id, date, parseDate(flags.until), lift_cents, str(flags.notes) || null]);
  out({ number, vessel: v.name, lift: lift.code, date }, (x) => `  ${x.number}: ${x.vessel} on ${x.lift}, ${x.date}.`);
}

async function haul(args, flags) {
  const h = await findByNumber('haulouts', args[0], 'haul-out', 'H-');
  if (h.status !== 'booked') throw new CliError(`${h.number} is ${h.status}.`);
  const date = parseDate(flags.date) || today();
  const [v] = await db.query(`select * from vessels where id = $1`, [h.vessel_id]);
  const [lift] = await db.query(`select * from lifts where id = $1`, [h.lift_id]);
  const problems = lift ? await liftCheck(lift, v, date) : ['no lift recorded'];
  if (problems.length) throw new CliError(`Do not lift: ${problems.join('; ')}.`);
  await db.query(`update haulouts set status = 'out', hauled_on = $2, hardstand_bay = coalesce($3, hardstand_bay), hardstand_until = coalesce($4, hardstand_until) where id = $1`,
    [h.id, date, str(flags.bay) || null, parseDate(flags.until)]);
  out({ number: h.number, vessel: v.name, hauled_on: date }, (x) => `  ${x.vessel} out on ${x.hauled_on} (${x.number}).`);
}

async function launch(args, flags) {
  const h = await findByNumber('haulouts', args[0], 'haul-out', 'H-');
  if (h.status !== 'out') throw new CliError(`${h.number} is ${h.status}, not on the hardstand.`);
  const date = parseDate(flags.date) || today();
  const open = await db.query(`select number from jobs where haulout_id = $1 and status = 'open'`, [h.id]);
  await db.query(`update haulouts set status = 'launched', launched_on = $2 where id = $1`, [h.id, date]);
  out({ number: h.number, launched_on: date, open_jobs: open.map((j) => j.number) }, (x) => `  ${x.number} launched ${x.launched_on}. ${(date > isoDate(h.hardstand_until || date)) ? `${daysBetween(isoDate(h.hardstand_until), date)} days past the agreed date. ` : ''}` +
    (x.open_jobs.length ? `Jobs still open: ${x.open_jobs.join(', ')}.` : ''));
}

async function jobs(flags) {
  const rows = await db.query(`select j.number, v.name as vessel, j.title, j.status, j.opened_on, j.done_on, j.quoted_cents,
      coalesce((select sum(round(l.qty * l.unit_cents)) from job_lines l where l.job_id = j.id), 0)::bigint as to_date_cents,
      coalesce((select sum(l.qty) from job_lines l where l.job_id = j.id and l.kind = 'labour'), 0) as hours
    from jobs j join vessels v on v.id = j.vessel_id ${flags.open ? `where j.status = 'open'` : flags.all ? '' : `where j.status in ('open', 'done')`} order by j.number`);
  out(rows, (d) => heading('Boatyard jobs') + '\n' + table(d, [{ key: 'number', label: 'Job' }, { key: 'vessel', label: 'Vessel' }, { key: 'title', label: 'Title', format: (v) => truncate(v, 40) },
    { key: 'status', label: 'Status' }, { key: 'hours', label: 'Hours', align: 'right', format: (v) => String(n(v)) }, { key: 'to_date_cents', label: 'To date', align: 'right', format: money },
    { key: 'quoted_cents', label: 'Quoted', align: 'right', format: (v) => (v ? money(v) : '') }, { key: 'over', label: '', format: (_, r) => (r.quoted_cents && n(r.to_date_cents) > n(r.quoted_cents) ? 'OVER QUOTE' : '') }]));
}

async function jobCard(args) {
  const j = await findByNumber('jobs', args[0], 'job', 'J-');
  const [v] = await db.query(`select name from vessels where id = $1`, [j.vessel_id]);
  const lines = await db.query(`select kind, description, qty, unit_cents, round(qty * unit_cents)::bigint as amount_cents, worked_on from job_lines where job_id = $1 order by worked_on, created_at`, [j.id]);
  const total = lines.reduce((a, l) => a + n(l.amount_cents), 0);
  out({ job: j, vessel: v.name, lines, total_cents: total }, (d) => [heading(`${j.number} ${j.title}: ${v.name}, ${j.status}`),
    table(d.lines, [{ key: 'worked_on', label: 'Date', format: isoDate }, { key: 'kind', label: 'Kind' }, { key: 'description', label: 'Work' }, { key: 'qty', label: 'Qty', align: 'right', format: (x) => String(n(x)) },
      { key: 'unit_cents', label: 'Rate', align: 'right', format: price }, { key: 'amount_cents', label: 'Amount', align: 'right', format: money }]),
    `\n  To date ${money(total)}${j.quoted_cents ? ` against a quote of ${money(j.quoted_cents)}${total > n(j.quoted_cents) ? ', OVER' : ''}` : ''}, before GST.`].join('\n'));
}

async function jobNew(args, flags) {
  const v = await findVessel(args[0]);
  const title = args.slice(1).join(' ').trim();
  if (!title) throw new CliError('marina job-new <vessel> "title" [--haulout=H-0002] [--quote=1800]');
  const h = flags.haulout ? await findByNumber('haulouts', flags.haulout, 'haul-out', 'H-') : null;
  const number = await nextNumber('jobs', 'J-');
  await db.query(`insert into jobs (number, vessel_id, haulout_id, title, quoted_cents) values ($1,$2,$3,$4,$5)`, [number, v.id, h?.id || null, title, parseCents(flags.quote)]);
  out({ number, vessel: v.name, title }, (x) => `  ${x.number} opened on ${x.vessel}: ${x.title}.`);
}

async function jobAdd(args, flags) {
  const j = await findByNumber('jobs', args[0], 'job', 'J-');
  if (j.status !== 'open') throw new CliError(`${j.number} is ${j.status}.`);
  const kind = flags.labour !== undefined ? 'labour' : flags.parts !== undefined ? 'parts' : 'other';
  const qty = kind === 'labour' ? parseNum(flags.labour, 'hours') : parseNum(flags.qty || 1, 'items');
  const unit = parseCents(flags.rate ?? flags.unit ?? (kind === 'labour' ? 95 : null));
  const desc = str(flags.desc) || (kind === 'parts' ? str(flags.parts) : '');
  if (!qty || unit === null || !desc) throw new CliError('marina job-add <job> --labour=3 --desc="Sand hull" [--rate=95]  or  --parts="Antifoul 4 L" --qty=2 --unit=385');
  await db.query(`insert into job_lines (job_id, kind, description, qty, unit_cents, worked_on) values ($1,$2,$3,$4,$5,$6)`, [j.id, kind, desc, qty, unit, parseDate(flags.date) || today()]);
  out({ number: j.number, kind, desc, qty, unit_cents: unit }, (x) => `  ${x.number}: ${x.kind} ${x.desc}, ${x.qty} x ${money(x.unit_cents)}.`);
}

async function jobDone(args, flags) {
  const j = await findByNumber('jobs', args[0], 'job', 'J-');
  if (j.status !== 'open') throw new CliError(`${j.number} is ${j.status}.`);
  const [c] = await db.query(`select count(*) as lines from job_lines where job_id = $1`, [j.id]);
  if (!n(c.lines)) throw new CliError(`${j.number} has no labour or parts recorded. Add them before marking it done.`);
  await db.query(`update jobs set status = 'done', done_on = $2 where id = $1`, [j.id, parseDate(flags.date) || today()]);
  out({ number: j.number, status: 'done' }, (x) => `  ${x.number} done. It goes on the next invoice run.`);
}

// ---------------------------------------------------------------- power, invoices and money

async function powerRead(args, flags) {
  const b = await findBerth(args[0]);
  const kwh = parseNum(args[1], 'kWh');
  if (kwh === null) throw new CliError('marina power-read <berth> <meter reading in kWh> [--date]');
  const date = parseDate(flags.date) || today();
  const [last] = await db.query(`select read_on, kwh from meter_readings where berth_id = $1 and read_on < $2 order by read_on desc limit 1`, [b.id, date]);
  if (last && kwh < n(last.kwh)) throw new CliError(`${kwh} is lower than the last reading (${n(last.kwh)} on ${isoDate(last.read_on)}). Check the meter.`);
  await db.query(`insert into meter_readings (berth_id, read_on, kwh) values ($1,$2,$3) on conflict (berth_id, read_on) do update set kwh = excluded.kwh`, [b.id, date, kwh]);
  out({ berth: b.code, read_on: date, kwh, used_kwh: last ? kwh - n(last.kwh) : null }, (x) => `  ${x.berth} meter ${x.kwh} kWh on ${x.read_on}${x.used_kwh !== null ? `, ${x.used_kwh.toFixed(1)} kWh since ${isoDate(last.read_on)}` : ''}.`);
}

// Builds the draft invoices for everything owed up to a date: monthly licences a month ahead,
// annual licences for the year, visitors by the night, lift fees and hardstand days, shore power
// since the last billed reading, and finished boatyard jobs. One draft per customer. Nothing is
// issued or sent: `issue` does the first, a person does the second.
async function invoiceRun(flags) {
  const through = parseDate(flags.through) || today();
  const lines = [];
  const add = (customer_id, source, source_id, description, qty, unit_cents, after) => lines.push({ customer_id, source, source_id, description, qty, unit_cents, amount_cents: Math.round(qty * unit_cents), after });

  for (const l of await db.query(`select l.*, b.code as berth from licences l join berths b on b.id = l.berth_id where l.status = 'active' and l.term = 'monthly'`)) {
    let from = l.billed_to ? addDays(isoDate(l.billed_to), 1) : isoDate(l.starts_on);
    let billed = null;
    while (from <= through && (!l.ends_on || from <= isoDate(l.ends_on))) {
      const end = l.ends_on && isoDate(l.ends_on) < monthEnd(from) ? isoDate(l.ends_on) : monthEnd(from);
      add(l.customer_id, 'licence', l.id, `Berth ${l.berth} monthly licence, ${monthName(from)}`, 1, n(l.rate_cents));
      billed = end;
      from = addDays(end, 1);
    }
    if (billed) lines[lines.length - 1].after = ['update licences set billed_to = $2 where id = $1', [l.id, billed]];
  }
  for (const l of await db.query(`select l.*, b.code as berth from licences l join berths b on b.id = l.berth_id where l.status = 'active' and l.term = 'annual'`)) {
    const from = l.billed_to ? addDays(isoDate(l.billed_to), 1) : isoDate(l.starts_on);
    if (from > through || (l.ends_on && from > isoDate(l.ends_on))) continue;
    const to = isoDate(l.ends_on) || addDays(addDays(from, 365), -1);
    add(l.customer_id, 'licence', l.id, `Berth ${l.berth} annual licence, ${from} to ${to}`, 1, n(l.rate_cents), ['update licences set billed_to = $2 where id = $1', [l.id, to]]);
  }
  for (const l of await db.query(`select l.*, b.code as berth from licences l join berths b on b.id = l.berth_id where l.status in ('active', 'ended') and l.term = 'casual'`)) {
    const from = l.billed_to ? addDays(isoDate(l.billed_to), 1) : isoDate(l.starts_on);
    const end = [through, isoDate(l.ends_on), l.ended_on && isoDate(l.ended_on)].filter(Boolean).sort()[0];
    const nights = daysBetween(from, end);
    if (nights <= 0) continue;
    add(l.customer_id, 'casual', l.id, `Berth ${l.berth} visitor, ${nights} night${nights === 1 ? '' : 's'} from ${from}`, nights, n(l.rate_cents), ['update licences set billed_to = $2 where id = $1', [l.id, addDays(end, -1)]]);
  }
  for (const h of await db.query(`select h.*, v.customer_id, v.name as vessel from haulouts h join vessels v on v.id = h.vessel_id where h.status in ('out', 'launched') and h.hauled_on <= $1`, [through])) {
    if (!h.customer_id) continue;
    if (!h.lift_billed) add(h.customer_id, 'haulout', h.id, `Haul and launch, ${h.vessel} (${h.number})`, 1, n(h.lift_cents), ['update haulouts set lift_billed = true where id = $1', [h.id]]);
    const from = h.billed_to ? addDays(isoDate(h.billed_to), 1) : isoDate(h.hauled_on);
    const end = h.launched_on ? [isoDate(h.launched_on), addDays(through, 1)].sort()[0] : addDays(through, 1);
    const days = daysBetween(from, end);
    if (days > 0) add(h.customer_id, 'hardstand', h.id, `Hardstand ${h.hardstand_bay || ''}, ${days} day${days === 1 ? '' : 's'} from ${from} (${h.number})`.replace('  ', ' '), days, SETTINGS.hardstand_cents_per_day,
      ['update haulouts set billed_to = $2 where id = $1', [h.id, addDays(end, -1)]]);
  }
  for (const r of await db.query(`select b.id as berth_id, b.code as berth, bb.customer_id,
      (select row_to_json(x) from (select id, read_on, kwh from meter_readings m where m.berth_id = b.id and not m.billed and m.read_on <= $1 order by read_on desc limit 1) x) as latest,
      (select row_to_json(x) from (select read_on, kwh from meter_readings m where m.berth_id = b.id and m.billed order by read_on desc limit 1) x) as previous
    from berths b join berth_board bb on bb.id = b.id where bb.customer_id is not null`, [through])) {
    const latest = typeof r.latest === 'string' ? JSON.parse(r.latest) : r.latest;
    const previous = typeof r.previous === 'string' ? JSON.parse(r.previous) : r.previous;
    if (!latest || !previous) continue;
    const kwh = Math.round((n(latest.kwh) - n(previous.kwh)) * 10) / 10;
    if (kwh <= 0) continue;
    add(r.customer_id, 'power', r.berth_id, `Shore power ${r.berth}, ${kwh} kWh, ${isoDate(previous.read_on)} to ${isoDate(latest.read_on)}`, kwh, SETTINGS.power_cents_per_kwh,
      ['update meter_readings set billed = true where berth_id = $1 and read_on <= $2', [r.berth_id, isoDate(latest.read_on)]]);
  }
  for (const j of await db.query(`select j.*, v.customer_id, coalesce((select sum(round(l.qty * l.unit_cents)) from job_lines l where l.job_id = j.id), 0)::bigint as total
    from jobs j join vessels v on v.id = j.vessel_id where j.status = 'done' and j.done_on <= $1`, [through])) {
    if (!j.customer_id) continue;
    add(j.customer_id, 'job', j.id, `${j.number} ${j.title}`, 1, n(j.total), [`update jobs set status = 'invoiced' where id = $1`, [j.id]]);
  }

  const byCustomer = new Map();
  for (const l of lines) { if (!byCustomer.has(l.customer_id)) byCustomer.set(l.customer_id, []); byCustomer.get(l.customer_id).push(l); }
  const result = [];
  await db.exec('BEGIN');
  try {
    for (const [customer_id, ls] of byCustomer) {
      const [c] = await db.query(`select code, full_name from customers where id = $1`, [customer_id]);
      let [inv] = await db.query(`select id, number from invoices where customer_id = $1 and status = 'draft' order by created_at limit 1`, [customer_id]);
      if (!inv) {
        const number = await nextNumber('invoices', 'INV-');
        [inv] = await db.query(`insert into invoices (number, customer_id, issued_on, due_on, status) values ($1,$2,$3,$4,'draft') returning id, number`, [number, customer_id, through, addDays(through, SETTINGS.invoice_terms_days)]);
      }
      for (const l of ls) {
        await db.query(`insert into invoice_lines (invoice_id, source, source_id, description, qty, unit_cents, amount_cents) values ($1,$2,$3,$4,$5,$6,$7)`, [inv.id, l.source, l.source_id, l.description, l.qty, l.unit_cents, l.amount_cents]);
        if (l.after) await db.query(l.after[0], l.after[1]);
      }
      const net = ls.reduce((a, l) => a + l.amount_cents, 0);
      result.push({ invoice: inv.number, customer: c.full_name, lines: ls.length, net_cents: net, gst_cents: Math.round(net * n(SETTINGS.gst_rate)), sources: [...new Set(ls.map((l) => l.source))] });
    }
    await db.exec(flags['dry-run'] ? 'ROLLBACK' : 'COMMIT');
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
  result.sort((a, b) => a.invoice.localeCompare(b.invoice));
  const total = result.reduce((a, r) => a + r.net_cents, 0);
  out({ through, dry_run: !!flags['dry-run'], invoices: result, net_cents: total }, (d) => heading(`${d.dry_run ? 'Dry run: would draft' : 'Drafted'} ${d.invoices.length} invoices for everything up to ${d.through}`) + '\n' +
    table(d.invoices, [{ key: 'invoice', label: 'Invoice' }, { key: 'customer', label: 'Customer' }, { key: 'lines', label: 'Lines', align: 'right' }, { key: 'sources', label: 'For', format: (v) => v.map((x) => SOURCE_WORDS[x] || x).join(', ') },
      { key: 'net_cents', label: 'Net', align: 'right', format: money }, { key: 'gst_cents', label: 'GST', align: 'right', format: money }]) +
    `\n\n  ${money(d.net_cents)} before GST. ${d.dry_run ? 'Nothing written.' : 'Drafts only: check them, then marina issue --all. Nothing is sent.'}`);
}

async function invoices(flags) {
  const status = str(flags.status);
  const rows = await db.query(`select * from invoice_totals ${status ? 'where status = $1' : `where status in ('draft', 'issued')`} order by number`, status ? [status] : []);
  out(rows, (d) => heading(`Invoices${status ? `, ${status}` : ', draft and unpaid'}`) + '\n' + table(d, [{ key: 'number', label: 'Invoice' }, { key: 'customer', label: 'Customer' },
    { key: 'status', label: 'Status' }, { key: 'issued_on', label: 'Issued', format: isoDate }, { key: 'due_on', label: 'Due', format: isoDate },
    { key: 'total_cents', label: 'Total', align: 'right', format: money }, { key: 'paid_cents', label: 'Paid', align: 'right', format: money },
    { key: 'days_overdue', label: 'Late', align: 'right', format: (v, r) => (r.status === 'issued' && n(v) > 0 ? `${v}d` : '') }]));
}

async function invoiceCard(args) {
  const i = await findByNumber('invoices', args[0], 'invoice', 'INV-');
  const [t] = await db.query(`select * from invoice_totals where id = $1`, [i.id]);
  const lines = await db.query(`select description, qty, unit_cents, amount_cents from invoice_lines where invoice_id = $1 order by created_at`, [i.id]);
  out({ invoice: t, lines }, (d) => [heading(`${t.number} to ${t.customer}, ${t.status}`), table(d.lines, [{ key: 'description', label: 'Description' }, { key: 'qty', label: 'Qty', align: 'right', format: (x) => String(n(x)) },
    { key: 'unit_cents', label: 'Rate', align: 'right', format: price }, { key: 'amount_cents', label: 'Amount', align: 'right', format: money }]),
    `\n  Net ${money(t.net_cents)}, GST ${money(t.gst_cents)}, total ${money(t.total_cents)}, paid ${money(t.paid_cents)}.`].join('\n'));
}

async function issue(args, flags) {
  const date = parseDate(flags.date) || today();
  const targets = flags.all ? await db.query(`select * from invoices where status = 'draft' order by number`) : [await findByNumber('invoices', args[0], 'invoice', 'INV-')];
  const done = [];
  for (const i of targets) {
    if (i.status !== 'draft') throw new CliError(`${i.number} is ${i.status}, not a draft.`);
    await db.query(`update invoices set status = 'issued', issued_on = $2, due_on = $3 where id = $1`, [i.id, date, addDays(date, SETTINGS.invoice_terms_days)]);
    done.push(i.number);
  }
  out({ issued: done, due_on: addDays(date, SETTINGS.invoice_terms_days) }, (x) => `  Issued ${x.issued.length}: ${x.issued.join(', ') || 'none'}, due ${x.due_on}. Render them with npm run docs -- invoice. Nothing is emailed from here.`);
}

async function pay(args, flags) {
  const i = await findByNumber('invoices', args[0], 'invoice', 'INV-');
  const amount = parseCents(args[1]);
  if (!amount) throw new CliError('marina pay <invoice> <amount including GST> [--ref --method --date]');
  if (i.status !== 'issued') throw new CliError(`${i.number} is ${i.status}.`);
  await db.query(`insert into payments (invoice_id, paid_on, amount_cents, method, reference) values ($1,$2,$3,$4,$5)`, [i.id, parseDate(flags.date) || today(), amount, str(flags.method) || null, str(flags.ref) || null]);
  const [t] = await db.query(`select * from invoice_totals where id = $1`, [i.id]);
  if (n(t.paid_cents) >= n(t.total_cents)) await db.query(`update invoices set status = 'paid' where id = $1`, [i.id]);
  out({ number: i.number, paid_cents: n(t.paid_cents), total_cents: n(t.total_cents), status: n(t.paid_cents) >= n(t.total_cents) ? 'paid' : 'issued' },
    (x) => `  ${x.number}: ${money(x.paid_cents)} of ${money(x.total_cents)} paid${x.status === 'paid' ? ', settled' : `, ${money(x.total_cents - x.paid_cents)} still owing`}.`);
}

async function arrears() {
  const rows = await db.query(`select b.*, (select string_agg(bb.code, ', ') from berth_board bb where bb.customer_id = b.id) as berths,
      (select string_agg(t.number || ' ' || t.days_overdue || 'd', ', ' order by t.number) from invoice_totals t where t.customer_id = b.id and t.status = 'issued' and t.total_cents > t.paid_cents and t.days_overdue > 0) as late_invoices
    from customer_balances b where b.owing_cents > 0 order by b.oldest_days_overdue desc nulls last`);
  out(rows, (d) => heading('Who owes what, oldest first') + '\n' + table(d, [{ key: 'full_name', label: 'Customer' }, { key: 'berths', label: 'Berth' },
    { key: 'owing_cents', label: 'Owing', align: 'right', format: money }, { key: 'overdue_1_30_cents', label: '1-30', align: 'right', format: (v) => (n(v) ? money(v) : '') },
    { key: 'overdue_31_60_cents', label: '31-60', align: 'right', format: (v) => (n(v) ? money(v) : '') }, { key: 'overdue_60_plus_cents', label: '60+', align: 'right', format: (v) => (n(v) ? money(v) : '') },
    { key: 'late_invoices', label: 'Late invoices' }]));
}

// ---------------------------------------------------------------- compliance and attention

async function complianceRows() {
  const r1 = await db.query(`select name as vessel, coalesce(insurer, 'no insurer') || ', ' || coalesce('expired ' || insurance_expires_on, 'no expiry on file') as detail from vessel_papers
    where insurance_lapsed and (on_berth or exists (select 1 from haulouts h where h.vessel_id = vessel_papers.id and h.status in ('booked', 'out'))) order by name`);
  const r2 = (await db.query(`select name as vessel, liability_cents from vessel_papers where cover_short and on_berth order by name`))
    .map((r) => ({ vessel: r.vessel, detail: `cover ${r.liability_cents ? money(r.liability_cents) : 'unknown'}, minimum ${money(SETTINGS.min_liability_cents)}` }));
  const r3 = await db.query(`select name as vessel, 'electrical check ' || coalesce('expired ' || ewof_expires_on, 'not on file') as detail from vessel_papers where ewof_lapsed and on_berth order by name`);
  const r4 = await db.query(`select v.name as vessel, h.number || ' ' || case when h.status = 'booked' then 'booked ' || h.booked_for else 'lifted ' || h.hauled_on end || ' on ' || l.code || ', certificate ' || coalesce('expired ' || l.certificate_expires_on, 'not on file') as detail
    from haulouts h join lifts l on l.id = h.lift_id join vessels v on v.id = h.vessel_id
    where (h.status = 'booked' and (l.certificate_expires_on is null or l.certificate_expires_on < h.booked_for))
      or (h.hauled_on is not null and h.hauled_on > current_date - 365
          and not exists (select 1 from lift_certificates lc where lc.lift_id = h.lift_id and h.hauled_on between lc.issued_on and lc.expires_on))
    order by h.number`);
  const r5 = await db.query(`select v.name as vessel, l.number || ' arrived ' || l.starts_on || coalesce(' from ' || v.last_port, '') as detail from licences l join vessels v on v.id = l.vessel_id
    where l.arrived_from_overseas and (l.biofouling_evidence is null or l.biofouling_evidence = '') and l.status in ('booked', 'active') order by l.starts_on`);
  const r6 = await db.query(`select vessel, licence || ' on ' || code || ' since ' || starts_on as detail from berth_board where occupancy = 'occupied' and signed_on is null order by code`);
  const r7 = await db.query(`select vessel, loa_m || ' m on ' || code || ' (' || length_m || ' m)' as detail from berth_board where oversize order by code`);
  const r8 = await db.query(`select name as vessel, 'approval ' || coalesce('ended ' || liveaboard_approved_until, 'never given') as detail from vessel_papers where liveaboard_unapproved order by name`);
  const found = { R1: r1, R2: r2, R3: r3, R4: r4, R5: r5, R6: r6, R7: r7, R8: r8 };
  return RULES.map((x) => ({ ...x, count: found[x.id].length, items: found[x.id] }));
}

async function compliance() {
  const rows = await complianceRows();
  out(rows, (d) => heading('Compliance: the records against the rules in docs/compliance.md') + '\n' + table(d, [{ key: 'id', label: 'Rule' }, { key: 'rule', label: 'Check' },
    { key: 'count', label: 'Breaches', align: 'right' }, { key: 'items', label: 'Worst example', format: (v) => (v.length ? truncate(`${v[0].vessel}: ${v[0].detail}`, 70) : 'clean') }]) +
    '\n\n  A records check, not legal advice. Sources are in docs/compliance.md.');
}

async function attention() {
  const list = [];
  const push = (area, who, what, action) => list.push({ area, who, what, action });
  const actions = { R1: 'Get the current certificate or move the boat off', R2: 'Ask for cover at the licence minimum', R3: 'No shore power until the check is done',
    R4: 'Stop using the lift until it is re-inspected; record why it was used', R5: 'Get the hull evidence or a haul-out booking today', R6: 'Get the licence signed this week',
    R7: 'Move it to a berth that fits', R8: 'Approve it in writing or end it' };
  for (const c of await complianceRows()) for (const i of c.items) push('rules', i.vessel, `${c.id} ${c.rule}: ${i.detail}`, actions[c.id]);
  for (const r of await db.query(`select * from customer_balances where oldest_days_overdue > ${ARREARS_DAYS} order by oldest_days_overdue desc`))
    push('money', r.full_name, `${money(r.owing_cents)} owing, oldest ${r.oldest_days_overdue} days late`, 'Phone them, then a notice under the licence');
  for (const h of await db.query(`select * from hardstand_now where days_over > 0 order by days_over desc`))
    push('yard', h.vessel, `${h.days_over} days past the agreed launch (${h.number}), ${h.open_jobs} open jobs`, 'Agree a date with the owner; hardstand is charging');
  for (const l of await db.query(`select l.number, v.name, l.ends_on from licences l join vessels v on v.id = l.vessel_id where l.term = 'casual' and l.status = 'active' and l.ends_on < current_date - ${OVERSTAY_GRACE_DAYS}`))
    push('berths', l.name, `Visitor past their departure date (${isoDate(l.ends_on)})`, 'Extend the stay or ask them to move');
  for (const r of await db.query(`select * from renewals_due where days_left <= ${SOON_DAYS} order by ends_on`))
    push('berths', r.vessel, `${r.number} on ${r.berth} ends ${isoDate(r.ends_on)} (${r.days_left} days), no renewal`, 'Send the renewal offer (/draft-renewal)');
  for (const m of (await matches()).res.filter((x) => x.berth))
    push('berths', m.full_name, `${m.berth} is free and fits ${m.vessel ? `their ${m.vessel}` : `the ${m2(m.length_m)} m ${m.wants_kind.replace('_', ' ')} they asked for`}; waiting ${m.days_waiting} days`, 'Offer it (marina match)');
  for (const p of await db.query(`select * from vessel_papers where on_berth and not insurance_lapsed and insurance_days_left <= ${SOON_DAYS} order by insurance_days_left`))
    push('coming up', p.name, `Insurance ends in ${p.insurance_days_left} days`, 'Ask for the renewal certificate');
  for (const p of await db.query(`select * from vessel_papers where on_berth and on_shore_power and not ewof_lapsed and ewof_days_left <= ${SOON_DAYS} order by ewof_days_left`))
    push('coming up', p.name, `Electrical check ends in ${p.ewof_days_left} days`, 'Remind the owner');
  for (const l of await db.query(`select code, certificate_expires_on, (certificate_expires_on - current_date) as days from lifts where certificate_expires_on between current_date and current_date + 60`))
    push('coming up', l.code, `Lift certificate of inspection ends ${isoDate(l.certificate_expires_on)} (${l.days} days)`, 'Book the inspector');
  for (const j of await db.query(`select j.number, v.name from jobs j join vessels v on v.id = j.vessel_id where j.status = 'done'`))
    push('money', j.name, `${j.number} done and not invoiced`, 'Run the invoice run');
  out(list, (d) => heading('Needs attention, worst first') + '\n' + table(d, [{ key: 'area', label: 'Area' }, { key: 'who', label: 'Who' }, { key: 'what', label: 'What', format: (v) => truncate(v, 76) }, { key: 'action', label: 'Action' }]));
}

// ---------------------------------------------------------------- import from PacsoftNG

// A berth holder or contract list from PacsoftNG (or any marina system) saved as CSV: one row per
// vessel on a berth, with the customer, the vessel and the contract. Column names vary between
// report layouts, so each field accepts the common headings. Customers match on account code or
// name, vessels on name and owner, berths on code, licences on berth, vessel and start date, so
// running it twice changes nothing.
async function importCmd(args, flags) {
  const source = str(args[0]).toLowerCase();
  if (source !== 'pacsoftng' && source !== 'csv') throw new CliError('marina import pacsoftng <berth-holders.csv> [--dry-run]');
  const file = args[1];
  if (!file) throw new CliError('Which file? marina import pacsoftng <berth-holders.csv>');
  const rows = parseCsv(readFileSync(path.resolve(file), 'utf8'));
  const problems = [];
  const s = { rows: rows.length, customers: 0, vessels: 0, berths: 0, licences: 0, unchanged: 0, problems };
  await db.exec('BEGIN');
  try {
    for (const [i, r] of rows.entries()) {
      const line = i + 2;
      const custName = pick(r, 'Customer Name', 'Customer', 'Berth Holder', 'Owner', 'Account Name', 'Name');
      const custRef = pick(r, 'Customer Code', 'Account Code', 'Account', 'Customer No', 'Customer ID');
      const vesselName = pick(r, 'Vessel Name', 'Vessel', 'Boat Name', 'Boat');
      const berthCode = pick(r, 'Berth', 'Berth No', 'Berth Code', 'Location', 'Space', 'Mooring');
      const loa = parseNum(pick(r, 'LOA', 'Length Overall', 'Length', 'Vessel Length', 'LOA (m)'), 'metres');
      if (!custName || !vesselName) { problems.push(`row ${line}: no customer or no vessel name`); continue; }
      if (!loa) { problems.push(`row ${line}: ${vesselName} has no length`); continue; }
      let [c] = await db.query(`select * from customers where (external_ref = $1 and $1 <> '') or lower(full_name) = lower($2) limit 1`, [custRef, custName]);
      if (!c) {
        const code = await nextNumber('customers', 'C', 'code');
        [c] = await db.query(`insert into customers (code, full_name, email, phone, address, external_ref) values ($1,$2,$3,$4,$5,$6) returning *`,
          [code, custName, pick(r, 'Email', 'Email Address') || null, pick(r, 'Phone', 'Mobile', 'Phone Number') || null, pick(r, 'Address', 'Postal Address') || null, custRef || null]);
        s.customers++;
      }
      let [v] = await db.query(`select * from vessels where lower(name) = lower($1) and customer_id = $2 limit 1`, [vesselName, c.id]);
      const ins = parseDate(pick(r, 'Insurance Expiry', 'Insurance Expires', 'Insurance Expiry Date', 'Policy Expiry'));
      if (!v) {
        const code = await nextNumber('vessels', 'V', 'code');
        [v] = await db.query(`insert into vessels (code, name, customer_id, rego, make_model, loa_m, beam_m, draft_m, insurer, policy_no, liability_cents, insurance_expires_on, external_ref)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pacsoftng') returning *`,
          [code, vesselName, c.id, pick(r, 'Registration', 'Rego', 'Vessel Rego', 'Sail Number') || null, pick(r, 'Make', 'Model', 'Make/Model', 'Vessel Type') || null, loa,
            parseNum(pick(r, 'Beam', 'Beam (m)', 'Width'), 'metres'), parseNum(pick(r, 'Draft', 'Draught', 'Draft (m)'), 'metres'),
            pick(r, 'Insurer', 'Insurance Company') || null, pick(r, 'Policy Number', 'Policy No', 'Policy') || null, parseCents(pick(r, 'Liability Cover', 'Public Liability', 'Third Party Cover') || null), ins]);
        s.vessels++;
      }
      if (!berthCode) continue;
      let [b] = await db.query(`select * from berths where lower(code) = lower($1)`, [berthCode]);
      const rate = parseCents(pick(r, 'Rate', 'Contract Rate', 'Annual Fee', 'Amount', 'Fee', 'Price') || null);
      const termRaw = pick(r, 'Contract Type', 'Term', 'Rate Type', 'Period', 'Billing Period').toLowerCase();
      const term = /month/.test(termRaw) ? 'monthly' : /night|casual|daily|visitor/.test(termRaw) ? 'casual' : 'annual';
      if (!b) {
        [b] = await db.query(`insert into berths (code, pier, kind, length_m, beam_m, annual_cents, monthly_cents, external_ref) values ($1,$2,$3,$4,$5,$6,$7,'pacsoftng') returning *`,
          [berthCode, pick(r, 'Pier', 'Dock', 'Arm', 'Marina Section') || berthCode.replace(/[^A-Za-z].*$/, '').replace(/\d.*$/, '') || null,
            /mooring/i.test(pick(r, 'Berth Type', 'Space Type', 'Type')) ? 'mooring' : /dry|stack|rack/i.test(pick(r, 'Berth Type', 'Space Type', 'Type')) ? 'dry_stack' : 'berth',
            parseNum(pick(r, 'Berth Length', 'Max Length', 'Berth Size'), 'metres') || loa, parseNum(pick(r, 'Berth Beam', 'Berth Width'), 'metres'),
            term === 'annual' ? rate : null, term === 'monthly' ? rate : null]);
        s.berths++;
      }
      const start = parseDate(pick(r, 'Contract Start', 'Start Date', 'Start', 'From', 'Arrival'));
      const end = parseDate(pick(r, 'Contract End', 'End Date', 'Expiry', 'End', 'To', 'Departure'));
      if (!start) { problems.push(`row ${line}: ${vesselName} on ${berthCode} has no contract start date`); continue; }
      const [old] = await db.query(`select id from licences where berth_id = $1 and vessel_id = $2 and starts_on = $3`, [b.id, v.id, start]);
      if (old) { s.unchanged++; continue; }
      const number = await nextNumber('licences', 'L-');
      const status = end && end < today() ? 'ended' : start > today() ? 'booked' : 'active';
      await db.query(`insert into licences (number, berth_id, vessel_id, customer_id, term, starts_on, ends_on, rate_cents, billed_to, signed_on, status, external_ref, notes)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Imported from PacsoftNG')`,
        [number, b.id, v.id, c.id, term, start, end, rate ?? (term === 'annual' ? n(b.annual_cents) : n(b.monthly_cents)), parseDate(pick(r, 'Billed To', 'Paid To', 'Invoiced To')) || null,
          parseDate(pick(r, 'Signed', 'Signed Date', 'Agreement Signed')) || null, status, pick(r, 'Contract No', 'Contract Number', 'Contract ID') || null]);
      s.licences++;
    }
    await db.exec(flags['dry-run'] ? 'ROLLBACK' : 'COMMIT');
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
  out(s, (x) => [`  ${flags['dry-run'] ? 'Dry run: would import' : 'Imported'} from ${x.rows} rows: ${x.customers} new customers, ${x.vessels} new vessels, ${x.berths} new berths, ${x.licences} new licences, ${x.unchanged} already here.`,
    problems.length ? '  Not imported:\n' + problems.map((p) => `    - ${p}`).join('\n') : '',
    flags['dry-run'] ? '  Nothing written.' : '  Check the berth board against PacsoftNG before you rely on it: marina berths'].filter(Boolean).join('\n'));
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(';') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportCmd(flags) {
  const dir = path.resolve(REPO_ROOT, str(flags.out) || 'exports');
  mkdirSync(dir, { recursive: true });
  const tables = ['customers', 'berths', 'vessels', 'licences', 'waitlist', 'lifts', 'haulouts', 'jobs', 'job_lines', 'meter_readings', 'invoices', 'invoice_lines', 'payments', 'notes'];
  const counts = {};
  for (const t of tables) {
    const rows = await db.query(`select * from ${t} order by created_at`);
    const cols = rows.length ? Object.keys(rows[0]) : [];
    writeFileSync(path.join(dir, `${t}.csv`), [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');
    counts[t] = rows.length;
  }
  out({ dir, counts }, () => `  Exported ${tables.length} tables to ${path.relative(REPO_ROOT, dir) || dir}: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

async function log(args, flags) {
  const ref = args[0];
  const body = args.slice(1).join(' ').trim();
  if (!body) throw new CliError('What happened? marina log <vessel or customer> "note text"');
  const v = await findVessel(ref).catch(() => null);
  const c = v ? null : await findCustomer(ref);
  await db.query(`insert into notes (customer_id, vessel_id, body, author) values ($1,$2,$3,$4)`, [v ? v.customer_id : c.id, v ? v.id : null, body, str(flags.by) || null]);
  out({ on: v ? v.name : c.full_name, body }, (x) => `  Noted on ${x.on}.`);
}

async function settings(flags) {
  const map = { name: ['business_name', str], gst: ['gst_number', str], 'min-cover': ['min_liability_cents', (v) => parseCents(v, 'cover')], 'power-rate': ['power_cents_per_kwh', (v) => parseCents(v)],
    'hardstand-rate': ['hardstand_cents_per_day', (v) => parseCents(v)], 'casual-rate': ['casual_cents_per_metre_night', (v) => parseCents(v)], terms: ['invoice_terms_days', (v) => parseNum(v, 'days')],
    'liveaboard-nights': ['liveaboard_max_nights', (v) => parseNum(v, 'nights')] };
  for (const [flag, [col, conv]] of Object.entries(map)) if (flags[flag] !== undefined) await db.query(`update settings set ${col} = $1 where id = 1`, [conv(flags[flag])]);
  const [s] = await db.query(`select * from settings where id = 1`);
  out(s, (x) => [heading('Settings'), `  ${x.business_name}, GST ${x.gst_number || 'not set'}, ${x.currency} at ${n(x.gst_rate) * 100}% GST, invoices due in ${x.invoice_terms_days} days`,
    `  Liability cover minimum ${money(x.min_liability_cents)}. Electrical check every ${x.ewof_months} months. Living aboard: more than ${x.liveaboard_max_nights} nights a week`,
    `  Power ${x.power_cents_per_kwh} c/kWh. Hardstand ${money(x.hardstand_cents_per_day)} a day. Visitors ${(x.casual_cents_per_metre_night / 100).toFixed(2)} a metre a night`].join('\n'));
}

// ---------------------------------------------------------------- dispatch table

const HELP = `marina: the marina and boatyard CLI. Add --json to any read for machine output.

  Overview    stats | attention | compliance | occupancy | settings [--min-cover=5m --power-rate=0.38 ...]
  Berths      berths [--free] [--pier=A] [--kind] [--fits=12.5] | berth <code>
  People      customers | customer <name> | customer-add "name" [--email --phone --kind] | log <vessel|customer> "note" [--by]
  Vessels     vessels | vessel <name> | vessel-add "name" --loa=11.5 --owner=<customer> [--beam --draft --weight --kind --make --rego]
              papers [--days=30] | papers <vessel> [--insurer --policy --cover=5m --insured-to] [--ewof=date] [--on-power|--off-power] [--liveaboard --approved-to]
  Licences    licences [--term] [--all] | renewals [--days=90] | licence-new <berth> <vessel> --term=${TERMS.join('|')} [--from --to --rate --signed --force]
              sign <licence> [--date] | end <licence> [--date] | arrive <berth> <vessel> --nights=3 [--overseas --evidence=".."] | depart <licence> | evidence <licence> "text"
  Waiting     waitlist | wait-add <customer> --length=12 [--kind=${KINDS.join('|')}] [--vessel --deposit] | match | offer <customer> <berth>
  Yard        lifts | lift-cert <lift> --cert=".." --expires=date [--issued --inspector] | haulouts [--all] | haul-book <vessel> --date [--lift=TL70 --until] | haul <H> [--bay --until] | launch <H>
              hardstand | jobs [--open|--all] | job <J> | job-new <vessel> "title" [--haulout --quote] | job-add <J> --labour=3 --desc=".." | --parts=".." --qty --unit | job-done <J>
  Money       power-read <berth> <kWh> [--date] | invoice-run [--through=date] [--dry-run] | invoices [--status] | invoice <INV> | issue <INV>|--all | pay <INV> <amount> [--ref] | arrears
  Data        import pacsoftng <berth-holders.csv> [--dry-run] | export [--out=dir]`;

const COMMANDS = {
  stats: () => stats(), attention: () => attention(), compliance: () => compliance(), occupancy: () => occupancy(), settings: (a, f) => settings(f),
  berths: (a, f) => berths(f), berth: (a) => berthCard(a),
  customers: () => customers(), customer: (a) => customerCard(a), 'customer-add': (a, f) => customerAdd(a, f), log: (a, f) => log(a, f),
  vessels: (a, f) => vessels(f), vessel: (a) => vesselCard(a), 'vessel-add': (a, f) => vesselAdd(a, f), papers: (a, f) => papers(a, f),
  licences: (a, f) => licences(f), renewals: (a, f) => renewals(f), 'licence-new': (a, f) => licenceNew(a, f), sign: (a, f) => sign(a, f), end: (a, f) => endLicence(a, f),
  arrive: (a, f) => arrive(a, f), depart: (a, f) => depart(a, f), evidence: (a) => evidence(a),
  waitlist: () => waitlist(), 'wait-add': (a, f) => waitAdd(a, f), match: () => match(), offer: (a, f) => offer(a, f),
  lifts: () => lifts(), 'lift-cert': (a, f) => liftCert(a, f), haulouts: (a, f) => haulouts(f), 'haul-book': (a, f) => haulBook(a, f), haul: (a, f) => haul(a, f), launch: (a, f) => launch(a, f),
  hardstand: () => hardstand(), jobs: (a, f) => jobs(f), job: (a) => jobCard(a), 'job-new': (a, f) => jobNew(a, f), 'job-add': (a, f) => jobAdd(a, f), 'job-done': (a, f) => jobDone(a, f),
  'power-read': (a, f) => powerRead(a, f), 'invoice-run': (a, f) => invoiceRun(f), invoices: (a, f) => invoices(f), invoice: (a) => invoiceCard(a), issue: (a, f) => issue(a, f), pay: (a, f) => pay(a, f), arrears: () => arrears(),
  import: (a, f) => importCmd(a, f), export: (a, f) => exportCmd(f),
};

const { args, flags } = parseArgv(process.argv.slice(2));
JSON_OUT = !!flags.json;
const cmd = args.shift();
if (!cmd || cmd === 'help' || flags.help || !COMMANDS[cmd]) {
  console.log(HELP);
  process.exit(cmd && cmd !== 'help' && !COMMANDS[cmd] ? 1 : 0);
}
db = await getDb();
try {
  [SETTINGS] = await db.query(`select * from settings where id = 1`);
  for (const k of ['min_liability_cents', 'power_cents_per_kwh', 'hardstand_cents_per_day', 'casual_cents_per_metre_night', 'invoice_terms_days', 'liveaboard_max_nights']) SETTINGS[k] = n(SETTINGS[k]);
  await COMMANDS[cmd](args, flags);
} catch (e) {
  if (e instanceof CliError) { console.error(e.message); process.exitCode = e.code; }
  else { console.error(e.stack || e.message); process.exitCode = 2; }
} finally {
  await db.close();
}
