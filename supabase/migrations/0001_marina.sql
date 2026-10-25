-- Marina for Claude Code: the schema.
-- What a marina, boatyard or harbour office runs every week: berths, piles, moorings and dry
-- stack spaces; the berth holders and their vessels (with the insurance and electrical papers the
-- berth licence asks for); licences (annual, monthly and casual visitors); the waiting list;
-- haul-outs on the travel lift and the hardstand; boatyard jobs; shore power meter readings; and
-- the invoices and payments that come out of all of it.
-- Plain Postgres. Runs the same on PGlite. Money is integer cents (NZD by default), lengths are
-- metres to two decimals, dates are calendar dates.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- The marina's own settings, one row. Change them by asking, or with `marina settings`.
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Your Marina',
  gst_number text,
  currency text not null default 'NZD',
  gst_rate numeric(5,4) not null default 0.15,
  min_liability_cents bigint not null default 500000000, -- third-party liability cover the berth licence asks for
  ewof_months int not null default 12,                   -- how often a vessel on shore power needs its electrical check
  invoice_terms_days int not null default 20,
  power_cents_per_kwh int not null default 38,
  hardstand_cents_per_day int not null default 4500,
  casual_cents_per_metre_night int not null default 650,
  liveaboard_max_nights int not null default 4,          -- nights a week aboard before it counts as living aboard
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- C0001
  full_name text not null,
  email text,
  phone text,
  address text,
  kind text not null default 'berth_holder' check (kind in ('berth_holder', 'visitor', 'yard_only', 'company')),
  external_ref text,                               -- the id in the system this came from
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists berths (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- A12, B04, M7 (mooring), DS-21 (dry stack)
  pier text,                                       -- A, B, Moorings, Dry stack
  kind text not null default 'berth' check (kind in ('berth', 'pile', 'mooring', 'dry_stack', 'hardstand')),
  length_m numeric(6,2) not null,                  -- the longest vessel it takes
  beam_m numeric(6,2),
  depth_m numeric(6,2),                            -- at low water springs
  power_amps int,                                  -- 15, 32, 63, null when no pedestal
  annual_cents bigint,                             -- annual licence fee, before GST
  monthly_cents bigint,                            -- monthly licence fee, before GST
  status text not null default 'available' check (status in ('available', 'out_of_service')),
  notes text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vessels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- V0001
  name text not null,
  customer_id uuid references customers(id),
  rego text,                                       -- MNZ number, sail number or state registration
  kind text not null default 'launch' check (kind in ('launch', 'yacht', 'catamaran', 'trailer_boat', 'commercial', 'other')),
  make_model text,
  loa_m numeric(6,2) not null,                     -- length overall, including bowsprit, davits and platform
  beam_m numeric(6,2),
  draft_m numeric(6,2),
  weight_t numeric(6,2),                           -- for the lift
  insurer text,
  policy_no text,
  liability_cents bigint,                          -- third-party liability cover on the policy
  insurance_expires_on date,
  ewof_expires_on date,                            -- electrical warrant of fitness or shore power lead test
  on_shore_power boolean not null default false,
  liveaboard boolean not null default false,       -- someone sleeps aboard more than liveaboard_max_nights a week
  liveaboard_approved_until date,
  last_port text,
  status text not null default 'active' check (status in ('active', 'sold', 'gone')),
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A licence puts a vessel on a berth for a term. Casual visitors are licences too, by the night.
create table if not exists licences (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                     -- L-0001
  berth_id uuid not null references berths(id),
  vessel_id uuid not null references vessels(id),
  customer_id uuid not null references customers(id),
  term text not null check (term in ('annual', 'monthly', 'casual')),
  starts_on date not null,
  ends_on date,                                    -- null for a rolling monthly licence
  rate_cents bigint not null,                      -- per year, per month or per night, by term, before GST
  billed_to date,                                  -- fees invoiced up to and including this day
  signed_on date,                                  -- the licence agreement signed and on file
  arrived_from_overseas boolean not null default false,
  biofouling_evidence text,                        -- for overseas arrivals: hull cleaned date, antifoul invoice, inspection report
  status text not null default 'active' check (status in ('booked', 'active', 'ended', 'cancelled')),
  ended_on date,
  notes text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists licences_berth_idx on licences (berth_id, status);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  vessel_id uuid references vessels(id),
  wants_length_m numeric(6,2) not null,
  wants_kind text not null default 'berth' check (wants_kind in ('berth', 'pile', 'mooring', 'dry_stack')),
  joined_on date not null default current_date,
  deposit_cents bigint not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'placed', 'withdrawn')),
  offered_berth_id uuid references berths(id),
  offered_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lifting equipment: the travel lift, a boat hoist, the dry stack forklift.
create table if not exists lifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  capacity_t numeric(6,2) not null,
  max_beam_m numeric(6,2),
  certificate_no text,                             -- current certificate of inspection
  certificate_expires_on date,
  status text not null default 'in_service' check (status in ('in_service', 'out_of_service')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every certificate of inspection a lift has held, so a past lift can be checked against the
-- certificate in force that day, not just the current one.
create table if not exists lift_certificates (
  id uuid primary key default gen_random_uuid(),
  lift_id uuid not null references lifts(id),
  certificate_no text not null,
  issued_on date not null,
  expires_on date not null,
  inspector text,
  created_at timestamptz not null default now(),
  unique (lift_id, certificate_no)
);

create table if not exists haulouts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                     -- H-0001
  vessel_id uuid not null references vessels(id),
  lift_id uuid references lifts(id),
  booked_for date not null,
  hauled_on date,
  hardstand_bay text,
  hardstand_until date,                            -- the agreed day it goes back in
  launched_on date,
  lift_cents bigint not null default 0,            -- haul and launch, before GST
  lift_billed boolean not null default false,
  billed_to date,                                  -- hardstand days invoiced up to and including this day
  status text not null default 'booked' check (status in ('booked', 'out', 'launched', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                     -- J-0001
  vessel_id uuid not null references vessels(id),
  haulout_id uuid references haulouts(id),
  title text not null,
  quoted_cents bigint,
  status text not null default 'open' check (status in ('open', 'done', 'invoiced', 'cancelled')),
  opened_on date not null default current_date,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  kind text not null check (kind in ('labour', 'parts', 'other')),
  description text not null,
  qty numeric(8,2) not null default 1,
  unit_cents bigint not null,
  worked_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  berth_id uuid not null references berths(id),
  read_on date not null,
  kwh numeric(10,1) not null,                      -- the meter's running total
  billed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (berth_id, read_on)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                     -- INV-0001
  customer_id uuid not null references customers(id),
  issued_on date not null default current_date,
  due_on date not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void')),
  notes text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  source text not null check (source in ('licence', 'casual', 'haulout', 'hardstand', 'job', 'power', 'other')),
  source_id uuid,
  description text not null,
  qty numeric(10,2) not null default 1,
  unit_cents bigint not null,
  amount_cents bigint not null,                    -- before GST
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  paid_on date not null default current_date,
  amount_cents bigint not null,                    -- including GST
  method text,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  vessel_id uuid references vessels(id),
  body text not null,
  author text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['settings', 'customers', 'berths', 'vessels', 'licences', 'waitlist', 'lifts', 'haulouts', 'jobs', 'invoices'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
  foreach t in array array['settings', 'customers', 'berths', 'vessels', 'licences', 'waitlist', 'lifts', 'lift_certificates', 'haulouts', 'jobs', 'job_lines', 'meter_readings', 'invoices', 'invoice_lines', 'payments', 'notes'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- views

-- Every berth with who is on it today (an active licence covering today), and whether the vessel fits.
create or replace view berth_board as
select b.id, b.code, b.pier, b.kind, b.length_m, b.beam_m, b.power_amps, b.status as berth_status,
  b.annual_cents, b.monthly_cents,
  l.id as licence_id, l.number as licence, l.term, l.starts_on, l.ends_on, l.signed_on,
  v.id as vessel_id, v.code as vessel_code, v.name as vessel, v.loa_m, v.beam_m as vessel_beam_m,
  c.id as customer_id, c.full_name as holder,
  case when b.status = 'out_of_service' then 'out of service' when l.id is null then 'free' else 'occupied' end as occupancy,
  (v.loa_m > b.length_m or (b.beam_m is not null and v.beam_m > b.beam_m)) as oversize
from berths b
left join licences l on l.berth_id = b.id and l.status = 'active' and l.starts_on <= current_date and (l.ends_on is null or l.ends_on >= current_date)
left join vessels v on v.id = l.vessel_id
left join customers c on c.id = l.customer_id;

-- Each vessel's papers against the settings: insurance in date and big enough, electrical check.
create or replace view vessel_papers as
select v.id, v.code, v.name, v.loa_m, c.full_name as owner, v.insurer, v.liability_cents, v.insurance_expires_on,
  v.ewof_expires_on, v.on_shore_power, v.liveaboard, v.liveaboard_approved_until,
  (v.insurance_expires_on is null or v.insurance_expires_on < current_date) as insurance_lapsed,
  (coalesce(v.liability_cents, 0) < s.min_liability_cents) as cover_short,
  (v.on_shore_power and (v.ewof_expires_on is null or v.ewof_expires_on < current_date)) as ewof_lapsed,
  (v.liveaboard and (v.liveaboard_approved_until is null or v.liveaboard_approved_until < current_date)) as liveaboard_unapproved,
  (v.insurance_expires_on - current_date) as insurance_days_left,
  (v.ewof_expires_on - current_date) as ewof_days_left,
  exists (select 1 from berth_board bb where bb.vessel_id = v.id) as on_berth
from vessels v
left join customers c on c.id = v.customer_id
cross join settings s
where v.status = 'active';

-- Invoice totals, GST and what is still owed.
create or replace view invoice_totals as
select i.id, i.number, i.customer_id, c.full_name as customer, i.issued_on, i.due_on, i.status,
  coalesce(sum(il.amount_cents), 0)::bigint as net_cents,
  round(coalesce(sum(il.amount_cents), 0) * s.gst_rate)::bigint as gst_cents,
  (coalesce(sum(il.amount_cents), 0) + round(coalesce(sum(il.amount_cents), 0) * s.gst_rate))::bigint as total_cents,
  coalesce((select sum(p.amount_cents) from payments p where p.invoice_id = i.id), 0)::bigint as paid_cents,
  (current_date - i.due_on) as days_overdue
from invoices i
join customers c on c.id = i.customer_id
cross join settings s
left join invoice_lines il on il.invoice_id = i.id
group by i.id, c.full_name, s.gst_rate;

-- What each customer owes on issued invoices, aged.
create or replace view customer_balances as
select c.id, c.code, c.full_name,
  coalesce(sum(t.total_cents - t.paid_cents) filter (where t.status = 'issued'), 0)::bigint as owing_cents,
  coalesce(sum(t.total_cents - t.paid_cents) filter (where t.status = 'issued' and t.days_overdue > 0 and t.days_overdue <= 30), 0)::bigint as overdue_1_30_cents,
  coalesce(sum(t.total_cents - t.paid_cents) filter (where t.status = 'issued' and t.days_overdue > 30 and t.days_overdue <= 60), 0)::bigint as overdue_31_60_cents,
  coalesce(sum(t.total_cents - t.paid_cents) filter (where t.status = 'issued' and t.days_overdue > 60), 0)::bigint as overdue_60_plus_cents,
  max(t.days_overdue) filter (where t.status = 'issued' and t.total_cents > t.paid_cents) as oldest_days_overdue
from customers c
left join invoice_totals t on t.customer_id = c.id
group by c.id;

-- Vessels out of the water now, and how long against what was agreed.
create or replace view hardstand_now as
select h.id, h.number, v.code as vessel_code, v.name as vessel, c.full_name as owner, h.hardstand_bay, h.hauled_on, h.hardstand_until,
  (current_date - h.hauled_on) as days_out,
  greatest(current_date - coalesce(h.hardstand_until, current_date), 0) as days_over,
  (select count(*) from jobs j where j.haulout_id = h.id and j.status = 'open') as open_jobs
from haulouts h
join vessels v on v.id = h.vessel_id
left join customers c on c.id = v.customer_id
where h.status = 'out';

-- Licences coming to the end of their term in the next 90 days with nothing booked after them.
create or replace view renewals_due as
select l.id, l.number, b.code as berth, v.name as vessel, c.full_name as holder, l.term, l.ends_on, (l.ends_on - current_date) as days_left, l.rate_cents
from licences l
join berths b on b.id = l.berth_id
join vessels v on v.id = l.vessel_id
join customers c on c.id = l.customer_id
where l.status = 'active' and l.term in ('annual', 'monthly') and l.ends_on is not null and l.ends_on <= current_date + 90
  and not exists (select 1 from licences n where n.vessel_id = l.vessel_id and n.id <> l.id and n.status in ('booked', 'active') and n.starts_on > l.ends_on);
