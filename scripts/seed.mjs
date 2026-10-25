#!/usr/bin/env node
// Loads supabase/seed.sql: Kotare Bay Marina Ltd, a fictional Northland marina and boatyard with
// 24 spaces, 20 vessels, a waiting list, two lifts, haul-outs, boatyard jobs, shore power
// readings and six months of invoices. Dates are relative to today and every insert skips what is
// already there, so re-running it is harmless.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';

export async function seed(db) {
  await db.exec(readFileSync(path.join(REPO_ROOT, 'supabase', 'seed.sql'), 'utf8'));
  const [c] = await db.query(`
    select (select count(*) from berths) as berths, (select count(*) from vessels) as vessels,
           (select count(*) from customers) as customers, (select count(*) from licences) as licences,
           (select count(*) from waitlist) as waitlist, (select count(*) from haulouts) as haulouts,
           (select count(*) from jobs) as jobs, (select count(*) from invoices) as invoices`);
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Number(v)]));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const db = await getDb();
  try {
    const n = await seed(db);
    console.log(`seed: ${n.berths} berths, ${n.vessels} vessels, ${n.customers} customers, ${n.licences} licences, ${n.waitlist} waiting, ${n.haulouts} haul-outs, ${n.jobs} jobs, ${n.invoices} invoices`);
  } finally {
    await db.close();
  }
}
