-- Demo data: Kotare Bay Marina Ltd, a fictional Northland marina and boatyard.
-- Three piers (12, 15 and 20 metre berths), swing moorings and a dry stack: 24 spaces, 19 vessels
-- on them, a waiting list, a 70 tonne travel lift and a 12 tonne boat hoist, haul-outs on the
-- hardstand, boatyard jobs, shore power meter readings, and six months of invoices.
-- People, boats and registrations are made up. Dates are relative to today, and every insert
-- skips what is already there, so running it twice is harmless.
--
-- Problems are planted on purpose so /attention and /compliance have something to say: a vessel
-- whose insurance has lapsed, one whose liability cover is under the minimum, a vessel on shore
-- power with its electrical check out of date, a boat lifted on a hoist whose certificate of
-- inspection had expired (and another booked on it), an overseas arrival with no biofouling
-- evidence on file, a berth holder in with an unsigned licence, a 13.4 metre launch on a 12 metre
-- berth, someone living aboard without approval, a boat three weeks on the hardstand and a week
-- past its date, and two berth holders well behind on their fees.

update settings set business_name = 'Kotare Bay Marina Ltd', gst_number = '123-456-789' where id = 1 and business_name = 'Your Marina';

insert into customers (code, full_name, email, phone, kind) values
  ('C0001', 'Mere Tane', 'mere.tane@example.co.nz', '021 555 0101', 'berth_holder'),
  ('C0002', 'Graham Whitcombe', 'graham.w@example.co.nz', '021 555 0102', 'berth_holder'),
  ('C0003', 'Priya Natarajan', 'priya.n@example.co.nz', '021 555 0103', 'berth_holder'),
  ('C0004', 'Dean Harrow', 'dean.harrow@example.co.nz', '021 555 0104', 'berth_holder'),
  ('C0005', 'Aroha Kingi', 'aroha.kingi@example.co.nz', '021 555 0105', 'berth_holder'),
  ('C0006', 'Lars Petersen', 'lars.p@example.co.nz', '021 555 0106', 'berth_holder'),
  ('C0007', 'Sione Fifita', 'sione.f@example.co.nz', '021 555 0107', 'berth_holder'),
  ('C0008', 'Jo Brannigan', 'jo.brannigan@example.co.nz', '021 555 0108', 'berth_holder'),
  ('C0009', 'Hamish Doyle', 'hamish.doyle@example.co.nz', '021 555 0109', 'berth_holder'),
  ('C0010', 'Ngaire Walsh', 'ngaire.walsh@example.co.nz', '021 555 0110', 'berth_holder'),
  ('C0011', 'Tom and Kate Ashby', 'ashbys@example.co.nz', '021 555 0111', 'berth_holder'),
  ('C0012', 'Brett Calder', 'brett.calder@example.co.nz', '021 555 0112', 'visitor'),
  ('C0013', 'Pacific Charters Ltd', 'accounts@pacific-charters.example.co.nz', '09 555 0113', 'company'),
  ('C0014', 'Elena Marsh', 'elena.marsh@example.com', '+679 555 0114', 'visitor'),
  ('C0015', 'Rewi Parata', 'rewi.parata@example.co.nz', '021 555 0115', 'berth_holder'),
  ('C0016', 'Fiona Gale', 'fiona.gale@example.co.nz', '021 555 0116', 'berth_holder'),
  ('C0017', 'Ben Okafor', 'ben.okafor@example.co.nz', '021 555 0117', 'berth_holder'),
  ('C0018', 'Sarah Liu', 'sarah.liu@example.co.nz', '021 555 0118', 'berth_holder'),
  ('C0019', 'Peter Vance', 'peter.vance@example.co.nz', '021 555 0119', 'berth_holder'),
  ('C0020', 'Anna Rees', 'anna.rees@example.co.nz', '021 555 0120', 'berth_holder'),
  ('C0021', 'Mike Tan', 'mike.tan@example.co.nz', '021 555 0121', 'berth_holder'),
  ('C0022', 'Kiri Moana', 'kiri.moana@example.co.nz', '021 555 0122', 'berth_holder'),
  ('C0023', 'Dave Hollis', 'dave.hollis@example.co.nz', '021 555 0123', 'berth_holder')
on conflict (code) do nothing;

insert into berths (code, pier, kind, length_m, beam_m, depth_m, power_amps, annual_cents, monthly_cents, status, notes) values
  ('A01', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A02', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A03', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A04', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A05', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A06', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A07', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('A08', 'A', 'berth', 12.00, 4.50, 2.6, 15, 540000, 54000, 'available', null),
  ('B01', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', null),
  ('B02', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', null),
  ('B03', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', null),
  ('B04', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', null),
  ('B05', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', 'Visitor berth'),
  ('B06', 'B', 'berth', 15.00, 7.00, 3.1, 32, 750000, 75000, 'available', null),
  ('C01', 'C', 'berth', 20.00, 8.00, 3.8, 63, 1200000, 120000, 'available', null),
  ('C02', 'C', 'berth', 20.00, 8.00, 3.8, 63, 1200000, 120000, 'available', 'Visitor berth'),
  ('C03', 'C', 'berth', 20.00, 8.00, 3.8, 63, 1200000, 120000, 'out_of_service', 'Finger pontoon float replacement'),
  ('M1', 'Moorings', 'mooring', 12.00, null, 2.2, null, 120000, 12000, 'available', null),
  ('M2', 'Moorings', 'mooring', 12.00, null, 2.2, null, 120000, 12000, 'available', null),
  ('M3', 'Moorings', 'mooring', 12.00, null, 2.2, null, 120000, 12000, 'available', null),
  ('DS-01', 'Dry stack', 'dry_stack', 8.50, 2.80, null, null, 360000, 36000, 'available', null),
  ('DS-02', 'Dry stack', 'dry_stack', 8.50, 2.80, null, null, 360000, 36000, 'available', null),
  ('DS-03', 'Dry stack', 'dry_stack', 8.50, 2.80, null, null, 360000, 36000, 'available', null),
  ('DS-04', 'Dry stack', 'dry_stack', 8.50, 2.80, null, null, 360000, 36000, 'available', null)
on conflict (code) do nothing;

insert into vessels (code, name, customer_id, rego, kind, make_model, loa_m, beam_m, draft_m, weight_t, insurer, policy_no, liability_cents, insurance_expires_on, ewof_expires_on, on_shore_power, liveaboard, liveaboard_approved_until, last_port)
select x.code, x.name, (select id from customers where code = x.cust), x.rego, x.kind, x.mm, x.loa, x.beam, x.draft, x.wt, x.insurer, x.policy, x.liab,
  current_date + x.ins_days, current_date + x.ewof_days, x.power, x.live, current_date + x.live_days, x.last_port
from (values
  ('V0001', 'Kahawai', 'C0001', 'NZ 4411', 'launch', 'Haines Hunter 35', 11.20, 3.90, 1.00, 8.5, 'Coastal Marine Insurance', 'CMI-77120', 500000000::bigint, 210, 300, true, false, null::int, null),
  ('V0002', 'Second Wind', 'C0002', 'KZ 3388', 'yacht', 'Farr 38', 11.80, 3.80, 2.10, 6.8, 'Coastal Marine Insurance', 'CMI-77311', 1000000000::bigint, 95, 140, true, false, null, null),
  ('V0003', 'Tui Song', 'C0003', 'NZ 5102', 'launch', 'Salthouse 34', 10.50, 3.70, 0.95, 7.9, 'Harbour Mutual', 'HM-20931', 500000000::bigint, 160, 220, true, false, null, null),
  ('V0004', 'Reel Easy', 'C0004', 'NZ 6230', 'launch', 'Bayliner 3288', 9.80, 3.50, 0.90, 6.2, 'Harbour Mutual', 'HM-18802', 500000000::bigint, -12, 180, true, false, null, null),
  ('V0005', 'Moana Rua', 'C0005', 'KZ 2045', 'yacht', 'Beneteau Oceanis 38', 11.90, 3.99, 1.90, 7.0, 'Coastal Marine Insurance', 'CMI-79004', 500000000::bigint, 300, 250, true, false, null, null),
  ('V0006', 'Fjord', 'C0006', 'KZ 1907', 'yacht', 'Hallberg-Rassy 37', 11.40, 3.60, 1.80, 8.0, 'Nordic Yacht Cover', 'NYC-5521', 500000000::bigint, 140, 90, true, false, null, null),
  ('V0007', 'Island Time', 'C0007', 'NZ 7114', 'launch', 'Riviera 4000', 13.40, 4.30, 1.10, 11.5, 'Harbour Mutual', 'HM-22610', 500000000::bigint, 230, 200, true, false, null, null),
  ('V0008', 'Brannigan''s Law', 'C0008', 'NZ 7302', 'launch', 'Riviera 43', 14.20, 4.50, 1.20, 13.8, 'Coastal Marine Insurance', 'CMI-80115', 1000000000::bigint, 180, 260, true, false, null, null),
  ('V0009', 'Whio', 'C0009', 'KZ 4410', 'yacht', 'Jeanneau 45', 13.90, 4.30, 2.20, 10.4, 'Budget Boat Cover', 'BBC-0991', 200000000::bigint, 120, 150, true, false, null, null),
  ('V0010', 'Pukeko', 'C0010', 'KZ 5530', 'catamaran', 'Lagoon 42', 12.60, 6.80, 1.25, 12.0, 'Harbour Mutual', 'HM-23015', 500000000::bigint, 190, -40, true, false, null, null),
  ('V0011', 'Hapuku', 'C0011', 'NZ 8020', 'launch', 'Maritimo M48', 14.80, 4.80, 1.25, 16.0, 'Coastal Marine Insurance', 'CMI-81002', 1000000000::bigint, 250, 120, true, false, null, null),
  ('V0012', 'Calder''s Run', 'C0012', 'KZ 6121', 'yacht', 'Elliott 1050', 12.20, 3.40, 2.30, 4.9, 'Harbour Mutual', 'HM-30440', 500000000::bigint, 200, 60, true, false, null, 'Tauranga'),
  ('V0013', 'Te Ra', 'C0013', 'NZ 9001', 'commercial', 'Buizen 60 charter launch', 18.50, 5.60, 1.50, 32.0, 'Pacific Commercial Marine', 'PCM-1180', 2000000000::bigint, 280, 310, true, false, null, null),
  ('V0014', 'Kingfisher', 'C0017', 'NZ 3115', 'trailer_boat', 'Stabicraft 2600', 8.10, 2.50, 0.50, 2.9, 'Harbour Mutual', 'HM-25520', 500000000::bigint, 150, null, false, false, null, null),
  ('V0015', 'Kereru', 'C0015', 'KZ 2290', 'yacht', 'Davidson 31', 10.20, 3.30, 1.80, 4.6, 'Coastal Marine Insurance', 'CMI-76300', 500000000::bigint, 170, null, false, true, -20, null),
  ('V0016', 'Gale Force', 'C0016', 'NZ 2207', 'trailer_boat', 'Haines Hunter 760', 7.40, 2.50, 0.50, 2.6, 'Harbour Mutual', 'HM-26140', 500000000::bigint, 110, null, false, false, null, null),
  ('V0017', 'Mako', 'C0018', 'NZ 2981', 'trailer_boat', 'Rayglass 2150', 6.90, 2.40, 0.45, 2.1, 'Coastal Marine Insurance', 'CMI-82230', 500000000::bigint, 240, null, false, false, null, null),
  ('V0018', 'Southern Cross', 'C0014', 'FJ 0412', 'yacht', 'Amel 54', 16.10, 4.80, 2.10, 18.0, 'Pantaenius', 'PAN-88412', 1000000000::bigint, 330, 200, true, false, null, 'Suva, Fiji'),
  ('V0019', 'Kotuku', 'C0019', 'KZ 3001', 'yacht', 'Young 31', 9.50, 3.10, 1.70, 3.9, 'Harbour Mutual', 'HM-27705', 500000000::bigint, 260, null, false, false, null, null),
  ('V0020', 'Halcyon', 'C0020', 'KZ 4777', 'yacht', 'Hanse 388', 11.50, 3.90, 1.99, 7.3, 'Coastal Marine Insurance', 'CMI-83001', 500000000::bigint, 330, 300, false, false, null, null)
) as x(code, name, cust, rego, kind, mm, loa, beam, draft, wt, insurer, policy, liab, ins_days, ewof_days, power, live, live_days, last_port)
on conflict (code) do nothing;

-- Licences. Annual ones are invoiced for the year when they start; monthly ones are invoiced a
-- month in advance and are paid up to the end of last month; visitors are billed by the night.
insert into licences (number, berth_id, vessel_id, customer_id, term, starts_on, ends_on, rate_cents, billed_to, signed_on, arrived_from_overseas, biofouling_evidence, status, notes)
select x.num, (select id from berths where code = x.berth), (select id from vessels where code = x.vessel), (select id from customers where code = x.cust), x.term,
  current_date + x.start_days,
  case when x.term = 'annual' then (current_date + x.start_days + interval '1 year' - interval '1 day')::date when x.term = 'casual' then current_date + x.end_days else null end,
  x.rate,
  case when x.term = 'annual' then (current_date + x.start_days + interval '1 year' - interval '1 day')::date when x.term = 'monthly' then (date_trunc('month', current_date) - interval '1 day')::date else null end,
  case when x.signed then current_date + x.start_days - 7 else null end,
  x.overseas, x.evidence, 'active', x.notes
from (values
  ('L-0001', 'A01', 'V0001', 'C0001', 'annual', -200, null::int, 540000::bigint, true, false, null, null),
  ('L-0002', 'A02', 'V0002', 'C0002', 'annual', -325, null, 540000::bigint, true, false, null, null),
  ('L-0003', 'A03', 'V0003', 'C0003', 'annual', -150, null, 540000::bigint, true, false, null, null),
  ('L-0004', 'A04', 'V0004', 'C0004', 'monthly', -400, null, 54000::bigint, true, false, null, null),
  ('L-0005', 'A05', 'V0005', 'C0005', 'annual', -290, null, 540000::bigint, true, false, null, null),
  ('L-0006', 'A06', 'V0006', 'C0006', 'monthly', -30, null, 54000::bigint, false, false, null, 'Moved over from Opua; licence sent for signing'),
  ('L-0007', 'A07', 'V0007', 'C0007', 'annual', -100, null, 540000::bigint, true, false, null, 'Swapped from B06 to A07 at owner''s request'),
  ('L-0008', 'B01', 'V0008', 'C0008', 'annual', -180, null, 750000::bigint, true, false, null, null),
  ('L-0009', 'B02', 'V0009', 'C0009', 'annual', -240, null, 750000::bigint, true, false, null, null),
  ('L-0010', 'B03', 'V0010', 'C0010', 'monthly', -500, null, 75000::bigint, true, false, null, null),
  ('L-0011', 'B04', 'V0011', 'C0011', 'annual', -345, null, 750000::bigint, true, false, null, null),
  ('L-0012', 'B05', 'V0012', 'C0012', 'casual', -3, 2, 7930::bigint, true, false, null, 'Passage from Tauranga'),
  ('L-0013', 'C01', 'V0013', 'C0013', 'annual', -60, null, 1200000::bigint, true, false, null, null),
  ('L-0014', 'C02', 'V0018', 'C0014', 'casual', -2, 12, 10465::bigint, true, true, null, 'Cleared customs at Opua'),
  ('L-0015', 'M1', 'V0015', 'C0015', 'annual', -210, null, 120000::bigint, true, false, null, null),
  ('L-0016', 'M2', 'V0019', 'C0019', 'annual', -120, null, 120000::bigint, true, false, null, null),
  ('L-0017', 'DS-01', 'V0016', 'C0016', 'annual', -90, null, 360000::bigint, true, false, null, null),
  ('L-0018', 'DS-02', 'V0014', 'C0017', 'monthly', -75, null, 36000::bigint, true, false, null, null),
  ('L-0019', 'DS-03', 'V0017', 'C0018', 'annual', -30, null, 360000::bigint, true, false, null, null)
) as x(num, berth, vessel, cust, term, start_days, end_days, rate, signed, overseas, evidence, notes)
on conflict (number) do nothing;

insert into waitlist (customer_id, vessel_id, wants_length_m, wants_kind, joined_on, deposit_cents, status, notes)
select (select id from customers where code = x.cust), (select id from vessels where code = x.vessel), x.len, x.kind, current_date + x.joined, x.deposit, 'waiting', x.notes
from (values
  ('C0020', 'V0020', 12.00, 'berth', -410, 25000::bigint, 'Keeps Halcyon on a swing mooring at Tutukaka meanwhile'),
  ('C0021', null, 15.00, 'berth', -260, 25000::bigint, 'Buying a 14 m launch once a berth is confirmed'),
  ('C0022', null, 18.00, 'berth', -95, 25000::bigint, null),
  ('C0023', null, 8.00, 'dry_stack', -40, 0::bigint, 'Trailer boat, 7.6 m')
) as x(cust, vessel, len, kind, joined, deposit, notes)
where not exists (select 1 from waitlist w where w.customer_id = (select id from customers where code = x.cust));

insert into lifts (code, name, capacity_t, max_beam_m, certificate_no, certificate_expires_on, status) values
  ('TL70', 'Travel lift, 70 tonne', 70, 7.20, 'COI 2026-1184', current_date + 200, 'in_service'),
  ('HOIST', 'Boat hoist, 12 tonne', 12, 3.20, 'COI 2025-0937', current_date - 9, 'in_service')
on conflict (code) do nothing;

insert into lift_certificates (lift_id, certificate_no, issued_on, expires_on, inspector)
select (select id from lifts where code = x.lift), x.cert, current_date + x.issued, current_date + x.expires, x.inspector
from (values
  ('TL70', 'COI 2025-0612', -530, -165, 'Northern Lifting Inspections'),
  ('TL70', 'COI 2026-1184', -165, 200, 'Northern Lifting Inspections'),
  ('HOIST', 'COI 2025-0937', -374, -9, 'Northern Lifting Inspections')
) as x(lift, cert, issued, expires, inspector)
on conflict (lift_id, certificate_no) do nothing;

insert into haulouts (number, vessel_id, lift_id, booked_for, hauled_on, hardstand_bay, hardstand_until, launched_on, lift_cents, lift_billed, billed_to, status, notes)
select x.num, (select id from vessels where code = x.vessel), (select id from lifts where code = x.lift), current_date + x.booked,
  current_date + x.hauled, x.bay, current_date + x.until_days, current_date + x.launched, x.lift_cents, x.billed, current_date + x.billed_to, x.status, x.notes
from (values
  ('H-0001', 'V0003', 'TL70', -61, -60, 'HS-2', -46, -45, 65000::bigint, true, -45, 'launched', 'Antifoul and anodes'),
  ('H-0002', 'V0008', 'TL70', -21, -21, 'HS-4', -7, null::int, 85000::bigint, false, null::int, 'out', 'Antifoul, shaft seals; waiting on seal kit'),
  ('H-0003', 'V0011', 'TL70', -6, -6, 'HS-1', 8, null, 85000::bigint, false, null, 'out', 'Survey for insurance renewal'),
  ('H-0004', 'V0002', 'TL70', 4, null, null, 11, null, 65000::bigint, false, null, 'booked', 'Keel bolt check'),
  ('H-0005', 'V0014', 'HOIST', -5, -5, 'HS-6', 2, null, 22000::bigint, false, null, 'out', 'Outboard service'),
  ('H-0006', 'V0016', 'HOIST', 3, null, null, 5, null, 22000::bigint, false, null, 'booked', 'Hull clean')
) as x(num, vessel, lift, booked, hauled, bay, until_days, launched, lift_cents, billed, billed_to, status, notes)
on conflict (number) do nothing;

insert into jobs (number, vessel_id, haulout_id, title, quoted_cents, status, opened_on, done_on)
select x.num, (select id from vessels where code = x.vessel), (select id from haulouts where number = x.haul), x.title, x.quote, x.status, current_date + x.opened, current_date + x.done
from (values
  ('J-0001', 'V0003', 'H-0001', 'Antifoul and replace anodes', 180000::bigint, 'invoiced', -60, -46),
  ('J-0002', 'V0008', 'H-0002', 'Antifoul and replace shaft seals', 420000::bigint, 'open', -21, null::int),
  ('J-0003', 'V0011', 'H-0003', 'Pre-survey hull and running gear check', 95000::bigint, 'open', -6, null),
  ('J-0004', 'V0005', null, 'Rig check and replace forestay', 160000::bigint, 'done', -12, -3)
) as x(num, vessel, haul, title, quote, status, opened, done)
on conflict (number) do nothing;

insert into job_lines (job_id, kind, description, qty, unit_cents, worked_on)
select j.id, x.kind, x.descr, x.qty, x.unit, current_date + x.worked
from (values
  ('J-0001', 'labour', 'Water blast, sand and two coats antifoul', 10, 9500::bigint, -55),
  ('J-0001', 'parts', 'Antifoul, 2 x 4 L', 2, 38500::bigint, -55),
  ('J-0001', 'parts', 'Shaft and trim tab anodes', 1, 14000::bigint, -54),
  ('J-0002', 'labour', 'Water blast and sand', 6, 9500::bigint, -19),
  ('J-0002', 'labour', 'Remove shafts', 5, 9500::bigint, -15),
  ('J-0002', 'parts', 'Antifoul, 3 x 4 L', 3, 38500::bigint, -16),
  ('J-0003', 'labour', 'Hull and running gear inspection', 3, 9500::bigint, -4),
  ('J-0004', 'labour', 'Rigger, unstep and restep forestay', 8, 11000::bigint, -4),
  ('J-0004', 'parts', 'Forestay wire and swage fittings', 1, 64000::bigint, -4)
) as x(job, kind, descr, qty, unit, worked)
join jobs j on j.number = x.job
where not exists (select 1 from job_lines l where l.job_id = j.id);

-- Shore power meters: last month's reading (billed) and yesterday's.
insert into meter_readings (berth_id, read_on, kwh, billed)
select (select id from berths where code = x.berth), current_date + x.day, x.kwh, x.billed
from (values
  ('A03', -31, 10422.0, true), ('A03', -1, 10501.5, false),
  ('B01', -31, 22810.0, true), ('B01', -1, 22846.0, false),
  ('B03', -31, 31950.0, true), ('B03', -1, 32362.0, false),
  ('C01', -31, 48120.0, true), ('C01', -1, 48433.0, false)
) as x(berth, day, kwh, billed)
on conflict (berth_id, read_on) do nothing;

insert into invoices (number, customer_id, issued_on, due_on, status, notes)
select x.num, (select id from customers where code = x.cust), current_date + x.issued, current_date + x.issued + 20, 'issued', x.notes
from (values
  ('INV-0001', 'C0001', -200, null),
  ('INV-0002', 'C0004', -105, null),
  ('INV-0003', 'C0004', -75, null),
  ('INV-0004', 'C0009', -60, null),
  ('INV-0005', 'C0011', -30, null),
  ('INV-0006', 'C0003', -44, null),
  ('INV-0007', 'C0006', -30, null),
  ('INV-0008', 'C0002', -325, null)
) as x(num, cust, issued, notes)
on conflict (number) do nothing;

insert into invoice_lines (invoice_id, source, description, qty, unit_cents, amount_cents)
select i.id, x.source, x.descr, x.qty, x.unit, round(x.qty * x.unit)
from (values
  ('INV-0001', 'licence', 'Berth A01 annual licence', 1, 540000::bigint),
  ('INV-0002', 'licence', 'Berth A04 monthly licence, three months', 3, 54000::bigint),
  ('INV-0003', 'licence', 'Berth A04 monthly licence', 1, 54000::bigint),
  ('INV-0004', 'haulout', 'Travel lift haul and launch', 1, 85000::bigint),
  ('INV-0004', 'hardstand', 'Hardstand, 22 days', 22, 4500::bigint),
  ('INV-0005', 'other', 'Fuel dock account', 1, 120000::bigint),
  ('INV-0006', 'haulout', 'Travel lift haul and launch, H-0001', 1, 65000::bigint),
  ('INV-0006', 'hardstand', 'Hardstand, 15 days', 15, 4500::bigint),
  ('INV-0006', 'job', 'J-0001 Antifoul and replace anodes', 1, 186000::bigint),
  ('INV-0007', 'licence', 'Berth A06 monthly licence', 1, 54000::bigint),
  ('INV-0008', 'licence', 'Berth A02 annual licence', 1, 540000::bigint)
) as x(num, source, descr, qty, unit)
join invoices i on i.number = x.num
where not exists (select 1 from invoice_lines l where l.invoice_id = i.id);

insert into payments (invoice_id, paid_on, amount_cents, method, reference)
select i.id, current_date + x.day, x.amount, 'bank transfer', x.ref
from (values
  ('INV-0001', -190, 621000::bigint, 'TANE A01'),
  ('INV-0005', -12, 50000::bigint, 'ASHBY PART'),
  ('INV-0006', -30, 366275::bigint, 'NATARAJAN'),
  ('INV-0007', -20, 62100::bigint, 'PETERSEN A06'),
  ('INV-0008', -318, 621000::bigint, 'WHITCOMBE A02')
) as x(num, day, amount, ref)
join invoices i on i.number = x.num
where not exists (select 1 from payments p where p.invoice_id = i.id);

update invoices set status = 'paid' where number in ('INV-0001', 'INV-0006', 'INV-0007', 'INV-0008') and status = 'issued';

insert into notes (customer_id, vessel_id, body, author, created_at)
select (select id from customers where code = x.cust), (select id from vessels where code = x.vessel), x.body, x.author, now() + make_interval(days => x.day)
from (values
  ('C0004', 'V0004', 'Dean says the policy renewal is with his broker. Asked for the new certificate by Friday.', 'Office', -5),
  ('C0008', 'V0008', 'Shaft seal kit on back order from the supplier, ETA two weeks. Jo knows.', 'Yard', -9),
  ('C0015', 'V0015', 'Rewi staying aboard most nights since his house sale. Liveaboard approval ran out last month.', 'Office', -14)
) as x(cust, vessel, body, author, day)
where not exists (select 1 from notes n where n.body = x.body);
