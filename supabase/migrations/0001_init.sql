-- ============================================================================
-- PYRAMIDS SHUTTLE — INTERNAL OPERATIONS TRACKER
-- Postgres / Supabase schema  (run top to bottom in the Supabase SQL Editor)
-- ============================================================================
-- Decisions baked in:
--   * No Trips module. Daily Vehicle Operations is the only ops input.
--   * No ownership_type. Every vehicle has a vendor; company-owned buses
--     point at the company's own vendor row (is_company = true).
--   * Access time = minutes the RFR spent in stage "Active", stopping at the
--     earliest repair_start_at across its work orders.
--   * Rentals invoice = bus-days x rate. Owned invoice = avg daily buses
--     x monthly fee x KPI achieved %.
--   * KPI achieved is capped at the metric weight.
--   * One parts table: pm_interval_km set => it is a periodic maintenance item.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 0. UTILITIES
-- ============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- "2d 4h 13m" from a minute count
create or replace function fn_format_minutes(p_minutes numeric)
returns text language sql immutable as $$
  select case
    when p_minutes is null then null
    else trim(
      case when floor(p_minutes/1440) > 0
           then floor(p_minutes/1440)::text || 'd ' else '' end ||
      case when floor(mod(p_minutes,1440)/60) > 0
           then floor(mod(p_minutes,1440)/60)::text || 'h ' else '' end ||
      floor(mod(p_minutes,60))::text || 'm'
    )
  end;
$$;

create table app_settings (
  key   text primary key,
  value numeric not null,
  label text
);

insert into app_settings (key, value, label) values
  ('pm_due_soon_km', 500, 'KM remaining at which a PM item shows Due Soon'),
  ('pm_due_now_km',  200, 'KM remaining at which a PM item shows Due Now');

-- ============================================================================
-- 1. LOOKUP LISTS
-- ============================================================================

create table lookup_categories (
  key   text primary key,
  label text not null
);

insert into lookup_categories (key, label) values
  ('vendor_type',          'Vendor Type'),
  ('vehicle_type',         'Vehicle Type'),
  ('fuel_type',            'Fuel Type'),
  ('license_grade',        'License Grade'),
  ('shift_type',           'Shift Type'),
  ('generic_status',       'Status'),
  ('rfr_stage',            'RFR Stage'),
  ('maintenance_type',     'Maintenance Type'),
  ('issue_type',           'Issue Type'),
  ('maintenance_category', 'Maintenance Category'),
  ('vehicle_status_after', 'Vehicle Status After Maintenance'),
  ('skip_reason',          'Skip Reason');

create table lookups (
  id         uuid primary key default gen_random_uuid(),
  category   text not null references lookup_categories(key) on update cascade,
  code       text not null,
  label_en   text not null,
  label_ar   text,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, code)
);
create index on lookups (category, is_active, sort_order);

create or replace function lookup_in(p_id uuid, p_category text)
returns boolean language sql stable as $$
  select p_id is null
      or exists (select 1 from lookups l where l.id = p_id and l.category = p_category);
$$;

-- ---- seed every list ------------------------------------------------------

insert into lookups (category, code, label_en, sort_order) values
  ('generic_status','active','Active',1),
  ('generic_status','inactive','Inactive',2),

  ('vendor_type','rentals','Rentals',1),
  ('vendor_type','owned','Owned',2),

  ('vehicle_type','diesel_bus','Diesel Bus',1),
  ('vehicle_type','electric_bus','Electric Bus',2),
  ('vehicle_type','diesel_mini_bus','Diesel Mini Bus',3),
  ('vehicle_type','electric_micro_bus','Electric Micro-Bus',4),

  ('fuel_type','diesel','Diesel',1),
  ('fuel_type','electric','Electric',2),

  ('license_grade','first_class','First Class',1),
  ('license_grade','second_class','Second Class',2),
  ('license_grade','third_class','Third Class',3),

  ('shift_type','morning','Morning',1),
  ('shift_type','night','Night',2),

  ('rfr_stage','pending','Pending',1),
  ('rfr_stage','active','Active',2),
  ('rfr_stage','skipped_next_trip','Skipped Next Trip',3),
  ('rfr_stage','skipped_next_pm','Skipped Next PM',4),
  ('rfr_stage','skipped','Skipped',5),
  ('rfr_stage','completed','Completed',6),
  ('rfr_stage','rolled_over','Rolled Over',7),

  ('maintenance_type','periodic','Periodic Maintenance',1),
  ('maintenance_type','corrective','Corrective Maintenance',2),
  ('maintenance_type','preventive','Preventive Maintenance',3),

  ('issue_type','doors','Doors',1),
  ('issue_type','compressor','Compressor',2),
  ('issue_type','audio_system','Audio System',3),
  ('issue_type','monitors_displays','Monitors / Displays',4),
  ('issue_type','speakers','Speakers',5),
  ('issue_type','microphone','Microphone',6),
  ('issue_type','brakes','Brakes',7),
  ('issue_type','electrical','Electrical',8),
  ('issue_type','bodywork','Bodywork',9),
  ('issue_type','painting','Painting',10),
  ('issue_type','air_conditioning','Air Conditioning (A/C)',11),
  ('issue_type','suspension','Suspension',12),
  ('issue_type','tires','Tires',13),
  ('issue_type','interior','Interior',14),
  ('issue_type','engine_overhaul','Engine Overhaul',15),

  ('maintenance_category','mechanical','Mechanical',1),
  ('maintenance_category','electronical','Electronical',2),
  ('maintenance_category','body_work_painting','Body Work and Painting',3),
  ('maintenance_category','ac','AC',4),
  ('maintenance_category','suspension','Suspension',5),
  ('maintenance_category','tires','Tires',6),
  ('maintenance_category','interior','Interior',7),
  ('maintenance_category','engine_overhaul','Engine Overhaul',8),

  ('vehicle_status_after','ready_for_operation','Ready for Operation',1),
  ('vehicle_status_after','under_repair','Under Repair',2),
  ('vehicle_status_after','maintenance_not_completed','Maintenance Not Completed',3),
  ('vehicle_status_after','driver_didnt_arrive','Driver didn''t Arrive',4),

  ('skip_reason','driver_didnt_arrive','Driver didn''t Arrive',1),
  ('skip_reason','spare_part_unavailability','Spare Part Unavailability',2),
  ('skip_reason','high_workload','High Workload',3),
  ('skip_reason','repair_after_operation','Repair After Operation',4),
  ('skip_reason','not_skipped','Not Skipped',5),
  ('skip_reason','no_issue_found','No Issue Found',6);

-- ============================================================================
-- 2. USERS & ROLES
-- ============================================================================

create type app_role as enum ('super_admin','admin','supervisor','data_admin');

-- super_admin : Planning Manager                    view + edit everything
-- admin       : VP / Project Mgr / Process Excel.   view everything, no edit
-- supervisor  : Operations Mgr / Op. Supervisor     edit ops + maintenance
-- data_admin  : Data Entry Specialist, Engineers    daily ops + RFR/WO only,
--                                                   no invoices, no analytics
-- "Engineer" is a job_title, not a role.

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  job_title   text,
  is_engineer boolean not null default false,  -- assignable on work orders
  role        app_role not null default 'data_admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

create or replace function current_role_of()
returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active;
$$;

create or replace function can_read()         returns boolean language sql stable as $$
  select current_role_of() is not null; $$;
create or replace function can_write_ops()    returns boolean language sql stable as $$
  select current_role_of() in ('super_admin','supervisor','data_admin'); $$;
create or replace function can_write_master() returns boolean language sql stable as $$
  select current_role_of() in ('super_admin','supervisor'); $$;
create or replace function is_super()         returns boolean language sql stable as $$
  select current_role_of() = 'super_admin'; $$;
create or replace function can_see_money()    returns boolean language sql stable as $$
  select current_role_of() in ('super_admin','admin','supervisor'); $$;

-- ============================================================================
-- 3. VENDORS  (incl. invoicing terms)
-- ============================================================================

create table vendors (
  id             uuid primary key default gen_random_uuid(),
  vendor_code    text not null unique,
  vendor_name    text not null,
  vendor_type_id uuid references lookups(id),
  is_company     boolean not null default false,
  contact_person text,
  mobile_number  text,
  email_address  text,

  -- ---- invoicing agreement (manually set, manually updated) ----
  billing_basis  text check (billing_basis in ('per_bus_day','per_avg_bus_month')),
  rate_amount    numeric(14,2),
  apply_kpi      boolean not null default false,
  currency       text not null default 'EGP',
  billing_notes  text,

  status_id      uuid references lookups(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (lookup_in(vendor_type_id,'vendor_type')),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_vendors_updated before update on vendors
  for each row execute function set_updated_at();
create unique index one_company_vendor on vendors (is_company) where is_company;

-- ============================================================================
-- 4. MASTER DATA
-- ============================================================================

create table drivers (
  id                         uuid primary key default gen_random_uuid(),
  driver_code                text not null unique,
  driver_name                text not null,
  mobile_number              text,
  hiring_date                date,
  license_number             text,
  license_grade_id           uuid references lookups(id),
  license_expiry_date        date,
  has_tourism_id             boolean not null default false,
  tourism_id_issuing_company text,
  tourism_id_expiry_date     date,
  vendor_id                  uuid references vendors(id),
  status_id                  uuid references lookups(id),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  check (lookup_in(license_grade_id,'license_grade')),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_drivers_updated before update on drivers
  for each row execute function set_updated_at();

create table vehicles (
  id                    uuid primary key default gen_random_uuid(),
  vehicle_code          text not null unique,
  plate_number          text not null unique,
  vehicle_type_id       uuid references lookups(id),
  fuel_type_id          uuid references lookups(id),
  vendor_id             uuid not null references vendors(id),
  battery_capacity_kwh  numeric(10,2),
  license_expiry_date   date,
  default_driver_id     uuid references drivers(id),
  current_odometer_km   numeric(12,2),
  current_odometer_date date,
  status_id             uuid references lookups(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (lookup_in(vehicle_type_id,'vehicle_type')),
  check (lookup_in(fuel_type_id,'fuel_type')),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_vehicles_updated before update on vehicles
  for each row execute function set_updated_at();
create index on vehicles (vendor_id);

create table routes (
  id                       uuid primary key default gen_random_uuid(),
  route_code               text not null unique,
  route_name               text not null,
  route_distance_km        numeric(10,2),
  number_of_stations       int,
  standard_leg_time        interval,
  standard_round_trip_time interval,
  status_id                uuid references lookups(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_routes_updated before update on routes
  for each row execute function set_updated_at();

create table stations (
  id           uuid primary key default gen_random_uuid(),
  station_code text not null unique,
  station_name text not null,
  status_id    uuid references lookups(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_stations_updated before update on stations
  for each row execute function set_updated_at();

create table route_stations (
  id              uuid primary key default gen_random_uuid(),
  route_id        uuid not null references routes(id) on delete cascade,
  station_id      uuid not null references stations(id),
  sequence_number int not null,
  unique (route_id, sequence_number)
);

create table maintenance_centers (
  id             uuid primary key default gen_random_uuid(),
  center_code    text not null unique,
  center_name    text not null,
  location       text,
  contact_person text,
  mobile_number  text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_centers_updated before update on maintenance_centers
  for each row execute function set_updated_at();

insert into maintenance_centers (center_code, center_name, location) values
  ('OPE',      'OPE Maintenance Center',      'The Pyramids of Giza'),
  ('AFS',      'AFS Maintenance Center',      'Abo Rawash'),
  ('MOSTOROD', 'Mostorod Maintenance Center', 'Mostorod'),
  ('OBOUR',    'Obour Maintenance Center',    'Obour'),
  ('SARYAQOS', 'Saryaqos Maintenance Center', 'Saryaqos');

-- ---- chargers: two plugs each (A & B) --------------------------------------

create type plug_selection as enum ('A','B','A+B');

create table chargers (
  id                    uuid primary key default gen_random_uuid(),
  charger_code          text not null unique,
  charger_location      text,
  maintenance_center_id uuid references maintenance_centers(id),
  manufacturing_year    int,
  charger_capacity_kw   numeric(10,2),
  charger_voltage       int,
  status_id             uuid references lookups(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (lookup_in(status_id,'generic_status'))
);
create trigger trg_chargers_updated before update on chargers
  for each row execute function set_updated_at();

-- ============================================================================
-- 5. PARTS  (one catalogue; pm_interval_km set => PM item)
-- ============================================================================

create table parts (
  id             uuid primary key default gen_random_uuid(),
  part_code      text not null unique,
  part_name      text not null,
  pm_interval_km numeric(12,2),   -- null = replacement-only, not on PM schedule
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_parts_updated before update on parts
  for each row execute function set_updated_at();
create index on parts (pm_interval_km) where pm_interval_km is not null;

insert into parts (part_code, part_name, pm_interval_km) values
  ('REPLENISH_GREASE',       'Replenish Grease',                       10000),
  ('EXT_AIR_FILTER',         'External Air Filter',                     5000),
  ('BUILTIN_AIR_FILTER',     'Built In Air Filter',                    20000),
  ('OIL_CORE_SEP_FILTER',    'Oil Core Separation Filter',              5000),
  ('AIR_DRYER_FILTER',       'Air Dryer Filter',                        5000),
  ('STEERING_OIL',           'Steering Oil',                           50000),
  ('STEERING_FILTER',        'Steering Filter',                        50000),
  ('REAR_AXLE_GEAR_OIL',     'The Rear Axle Gear Oil',                 30000),
  ('TIRES',                  'Tires',                                  80000),
  ('COOLANT',                'The Coolant',                           100000),
  ('FRONT_BRAKE_PADS',       'Front Brake Pads',                      100000),
  ('REAR_BRAKE_PADS',        'Rear Brake Pads',                       100000),
  ('REAR_AXLE_BRAKE_DISC',   'The Rear Axle Brake Disc',              200000),
  ('REAR_AXLE_BRAKE_PLATE',  'The Rear Axle Brake Friction Plate',    200000),
  ('FRONT_AXLE_BRAKE_DISC',  'The Front Axle Brake Disc',             200000),
  ('FRONT_AXLE_BRAKE_PLATE', 'The Front Axle Brake Friction Plate',   200000),
  ('COMPRESSOR_OIL',         'Compressor Oil',                          5000),
  ('CHECKLIST',              'Checklist',                               5000),
  ('OIL_FILTERS',            'Oil - Filters',                           5000),
  -- replacement-only items
  ('OIL_RETURN_VALVE',       'Oil Return Valve',                        null),
  ('THE_OIL',                'The Oil',                                 null),
  ('ORING_15_54_2_62',       'O-Ring (15.54*2.62)',                     null),
  ('ORING_28_3',             'O-Ring (28*3)',                           null),
  ('COMBINED_WASHER_20',     'Combined Washer 20 (At The Oil Inlet)',   null),
  ('COMBINED_WASHER_16',     'Combined Washer 16 (At The Oil Outlet)',  null),
  ('GASKET',                 'Gasket',                                  null),
  ('OIL_PIPE',               'Oil Pipe',                                null),
  ('INLET_PIPE',             'Inlet Pipe',                              null),
  ('SHOCK_ABSORBER',         'Shock Absorber',                          null),
  ('COUPLING_ELASTIC_PAD',   'Coupling Elastic Pad',                    null),
  ('OIL_SEAL',               'Oil Seal',                                null),
  ('LOW_VOLTAGE_BATTERY',    'Low-Voltage Battery',                     null);

-- ============================================================================
-- 6. DAILY OPERATIONS  (the only ops input; no trips module)
-- ============================================================================

create table daily_vehicle_operations (
  id                   uuid primary key default gen_random_uuid(),
  operation_code       text not null unique,
  operation_date       date not null,
  vehicle_id           uuid not null references vehicles(id),
  driver_id            uuid not null references drivers(id),
  route_id             uuid references routes(id),
  vendor_id            uuid references vendors(id),   -- auto-filled from vehicle
  operating_percentage numeric(5,2),
  starting_odometer_km numeric(12,2) not null,
  ending_odometer_km   numeric(12,2),
  total_distance_km    numeric(12,2)
      generated always as (ending_odometer_km - starting_odometer_km) stored,
  starting_battery_pct numeric(5,2),
  ending_battery_pct   numeric(5,2),
  battery_consumed_pct numeric(5,2)
      generated always as (starting_battery_pct - ending_battery_pct) stored,
  shift_type_id        uuid not null references lookups(id),
  driver_tips          numeric(12,2) default 0,
  remarks              text,
  created_by           uuid references profiles(id) default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (lookup_in(shift_type_id,'shift_type')),
  check (ending_odometer_km is null or ending_odometer_km >= starting_odometer_km),
  unique (vehicle_id, operation_date, shift_type_id)   -- one row per bus per shift
);
create trigger trg_dvo_updated before update on daily_vehicle_operations
  for each row execute function set_updated_at();
create index on daily_vehicle_operations (vehicle_id, operation_date desc);
create index on daily_vehicle_operations (operation_date);
create index on daily_vehicle_operations (vendor_id, operation_date);
create index on daily_vehicle_operations (driver_id, operation_date);

-- vendor always follows the vehicle
create or replace function fn_dvo_set_vendor()
returns trigger language plpgsql as $$
begin
  if new.vendor_id is null then
    select v.vendor_id into new.vendor_id from vehicles v where v.id = new.vehicle_id;
  end if;
  return new;
end $$;
create trigger trg_dvo_vendor before insert or update on daily_vehicle_operations
  for each row execute function fn_dvo_set_vendor();

-- keep vehicles.current_odometer_km fed from the latest operation
create or replace function fn_sync_vehicle_odometer()
returns trigger language plpgsql as $$
declare v_km numeric; v_date date;
begin
  select coalesce(o.ending_odometer_km, o.starting_odometer_km), o.operation_date
    into v_km, v_date
  from daily_vehicle_operations o
  where o.vehicle_id = new.vehicle_id
  order by o.operation_date desc, o.created_at desc
  limit 1;

  update vehicles
     set current_odometer_km = v_km, current_odometer_date = v_date
   where id = new.vehicle_id;
  return new;
end $$;
create trigger trg_sync_odometer
  after insert or update of starting_odometer_km, ending_odometer_km, operation_date
  on daily_vehicle_operations
  for each row execute function fn_sync_vehicle_odometer();

-- ============================================================================
-- 7. CHARGING SESSIONS
-- ============================================================================

create table charging_sessions (
  id                    uuid primary key default gen_random_uuid(),
  charging_session_code text not null unique,
  vehicle_id            uuid not null references vehicles(id),
  charger_id            uuid not null references chargers(id),
  plugs_used            plug_selection not null,
  battery_start_pct     numeric(5,2),
  battery_end_pct       numeric(5,2),
  charging_start_time   timestamptz,
  charging_end_time     timestamptz,
  charging_duration     interval
      generated always as (charging_end_time - charging_start_time) stored,
  energy_consumed_kwh   numeric(10,2),
  notes                 text,
  created_by            uuid references profiles(id) default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (charging_end_time is null or charging_end_time >= charging_start_time)
);
create trigger trg_charging_updated before update on charging_sessions
  for each row execute function set_updated_at();
create index on charging_sessions (vehicle_id, charging_start_time desc);
create index on charging_sessions (charger_id, charging_start_time desc);

-- two sessions may share a charger only on different single plugs
create or replace function fn_charging_no_plug_clash()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from charging_sessions s
    where s.charger_id = new.charger_id
      and s.id <> new.id
      and (s.plugs_used = 'A+B' or new.plugs_used = 'A+B'
           or s.plugs_used = new.plugs_used)
      and tstzrange(s.charging_start_time, coalesce(s.charging_end_time,'infinity'))
       && tstzrange(new.charging_start_time, coalesce(new.charging_end_time,'infinity'))
  ) then
    raise exception 'Plug conflict: that charger/plug is already in use for this time range';
  end if;
  return new;
end $$;
create trigger trg_charging_plug_clash
  before insert or update on charging_sessions
  for each row execute function fn_charging_no_plug_clash();

-- ============================================================================
-- 8. RFR  ->  ISSUES  ->  WORK ORDERS
-- ============================================================================

create sequence rfr_seq start 1;
create sequence wo_seq  start 1;

create table rfrs (
  id               uuid primary key default gen_random_uuid(),
  rfr_number       text not null unique
                     default 'RFR-' || lpad(nextval('rfr_seq')::text, 6, '0'),
  request_at       timestamptz not null,          -- manual input
  vehicle_id       uuid not null references vehicles(id),
  driver_id        uuid references drivers(id),   -- auto: last driver on/before date
  odometer_km      numeric(12,2),                 -- auto: last start KM on/before date
  vehicle_location text not null,
  description      text not null,
  stage_id         uuid not null references lookups(id),
  skip_reason_id   uuid references lookups(id),   -- whole-RFR skip
  completed_at     timestamptz,
  created_by       uuid references profiles(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (lookup_in(stage_id,'rfr_stage')),
  check (lookup_in(skip_reason_id,'skip_reason'))
);
create trigger trg_rfr_updated before update on rfrs
  for each row execute function set_updated_at();
create index on rfrs (vehicle_id, request_at desc);
create index on rfrs (stage_id);

-- issues on the RFR; each can be skipped individually
create table rfr_issues (
  id             uuid primary key default gen_random_uuid(),
  rfr_id         uuid not null references rfrs(id) on delete cascade,
  issue_type_id  uuid not null references lookups(id),
  is_skipped     boolean not null default false,
  skip_reason_id uuid references lookups(id),
  notes          text,
  unique (rfr_id, issue_type_id),
  check (lookup_in(issue_type_id,'issue_type')),
  check (lookup_in(skip_reason_id,'skip_reason')),
  check (not is_skipped or skip_reason_id is not null)
);
create index on rfr_issues (rfr_id);

-- every stage change, for the access-time clock
create table rfr_stage_history (
  id         uuid primary key default gen_random_uuid(),
  rfr_id     uuid not null references rfrs(id) on delete cascade,
  stage_id   uuid not null references lookups(id),
  changed_at timestamptz not null default now(),
  changed_by uuid references profiles(id) default auth.uid(),
  check (lookup_in(stage_id,'rfr_stage'))
);
create index on rfr_stage_history (rfr_id, changed_at);

-- ---- auto-fill -------------------------------------------------------------

create or replace function fn_last_driver_for_vehicle(p_vehicle_id uuid, p_date date)
returns uuid language sql stable as $$
  select o.driver_id from daily_vehicle_operations o
  where o.vehicle_id = p_vehicle_id and o.operation_date <= p_date
  order by o.operation_date desc, o.created_at desc limit 1;
$$;

create or replace function fn_last_odometer_for_vehicle(p_vehicle_id uuid, p_date date)
returns numeric language sql stable as $$
  select o.starting_odometer_km from daily_vehicle_operations o
  where o.vehicle_id = p_vehicle_id and o.operation_date <= p_date
  order by o.operation_date desc, o.created_at desc limit 1;
$$;

-- KM record from the operation on that date (falls back to the most recent
-- operation before it if the bus didn't run that day)
create or replace function fn_odometer_on_date(p_vehicle_id uuid, p_date date)
returns numeric language sql stable as $$
  select coalesce(o.ending_odometer_km, o.starting_odometer_km)
  from daily_vehicle_operations o
  where o.vehicle_id = p_vehicle_id and o.operation_date <= p_date
  order by o.operation_date desc, o.created_at desc limit 1;
$$;

create or replace function fn_rfr_autofill()
returns trigger language plpgsql as $$
begin
  if new.driver_id is null then
    new.driver_id := fn_last_driver_for_vehicle(new.vehicle_id, new.request_at::date);
  end if;
  if new.odometer_km is null then
    new.odometer_km := fn_last_odometer_for_vehicle(new.vehicle_id, new.request_at::date);
  end if;
  return new;
end $$;
create trigger trg_rfr_autofill before insert on rfrs
  for each row execute function fn_rfr_autofill();

create or replace function fn_rfr_log_stage()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    insert into rfr_stage_history (rfr_id, stage_id) values (new.id, new.stage_id);
  end if;
  return new;
end $$;
create trigger trg_rfr_stage_log after insert or update of stage_id on rfrs
  for each row execute function fn_rfr_log_stage();

-- ---- work orders -----------------------------------------------------------

create table work_orders (
  id                      uuid primary key default gen_random_uuid(),
  work_order_number       text not null unique
                            default 'WO-' || lpad(nextval('wo_seq')::text, 6, '0'),
  rfr_id                  uuid not null references rfrs(id) on delete restrict,
  assigned_engineer_id    uuid references profiles(id),
  maintenance_type_id     uuid references lookups(id),
  issue_type_id           uuid references lookups(id),
  maintenance_category_id uuid references lookups(id),
  repair_start_at         timestamptz,
  repair_end_at           timestamptz,
  maintenance_center_id   uuid references maintenance_centers(id),
  technician_1            text,
  technician_2            text,
  technician_3            text,
  is_skipped              boolean not null default false,
  skip_reason_id          uuid references lookups(id),
  skip_notes              text,
  vehicle_status_after_id uuid references lookups(id),
  description             text,
  created_by              uuid references profiles(id) default auth.uid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (lookup_in(maintenance_type_id,'maintenance_type')),
  check (lookup_in(issue_type_id,'issue_type')),
  check (lookup_in(maintenance_category_id,'maintenance_category')),
  check (lookup_in(skip_reason_id,'skip_reason')),
  check (lookup_in(vehicle_status_after_id,'vehicle_status_after')),
  check (repair_end_at is null or repair_start_at is null
         or repair_end_at >= repair_start_at),
  check (not is_skipped or skip_reason_id is not null)
);
create trigger trg_wo_updated before update on work_orders
  for each row execute function set_updated_at();
create index on work_orders (rfr_id);
create index on work_orders (issue_type_id);
create index on work_orders (assigned_engineer_id);

create table work_order_parts (
  work_order_id uuid not null references work_orders(id) on delete cascade,
  part_id       uuid not null references parts(id),
  quantity      int not null default 1,
  primary key (work_order_id, part_id)
);

-- ---- access time -----------------------------------------------------------
-- Runs only while stage = Active. Stops at the earliest repair_start_at across
-- the RFR's work orders; until one exists it keeps running to now().

create or replace function fn_rfr_access_minutes(p_rfr_id uuid)
returns numeric language sql stable as $$
  with stop as (
    select least(
      coalesce((select min(w.repair_start_at) from work_orders w
                where w.rfr_id = p_rfr_id), 'infinity'::timestamptz),
      now()
    ) as stop_at
  ),
  h as (
    select sh.changed_at,
           lead(sh.changed_at) over (order by sh.changed_at) as next_at,
           l.code as stage_code
    from rfr_stage_history sh
    join lookups l on l.id = sh.stage_id
    where sh.rfr_id = p_rfr_id
  )
  select coalesce(sum(
           greatest(
             extract(epoch from (
               least(coalesce(h.next_at, s.stop_at), s.stop_at) - h.changed_at
             )) / 60.0,
           0)
         ), 0)
  from h cross join stop s
  where h.stage_code = 'active';
$$;

create view v_rfr_access_time as
select r.id as rfr_id, r.rfr_number, r.vehicle_id,
       fn_rfr_access_minutes(r.id)                    as access_minutes,
       fn_format_minutes(fn_rfr_access_minutes(r.id)) as access_display
from rfrs r;

-- ---- repeating index -------------------------------------------------------

create or replace function fn_repeat_count(
  p_vehicle_id uuid, p_issue_type_id uuid, p_ref timestamptz, p_days int)
returns int language sql stable as $$
  select count(*)::int
  from work_orders w join rfrs r on r.id = w.rfr_id
  where r.vehicle_id = p_vehicle_id
    and w.issue_type_id = p_issue_type_id
    and w.created_at < p_ref
    and w.created_at >= p_ref - make_interval(days => p_days);
$$;

create view v_work_order_repeat_index as
select w.id as work_order_id, w.work_order_number, r.vehicle_id, w.issue_type_id,
       fn_repeat_count(r.vehicle_id, w.issue_type_id, w.created_at, 10) as repeat_10d,
       fn_repeat_count(r.vehicle_id, w.issue_type_id, w.created_at, 20) as repeat_20d,
       fn_repeat_count(r.vehicle_id, w.issue_type_id, w.created_at, 30) as repeat_30d,
       fn_repeat_count(r.vehicle_id, w.issue_type_id, w.created_at, 50) as repeat_50d
from work_orders w join rfrs r on r.id = w.rfr_id;

-- ============================================================================
-- 9. PERIODIC MAINTENANCE  (per vehicle x per part, KM only)
-- ============================================================================

create table vehicle_part_schedules (
  id                 uuid primary key default gen_random_uuid(),
  vehicle_id         uuid not null references vehicles(id) on delete cascade,
  part_id            uuid not null references parts(id),
  interval_km        numeric(12,2) not null,
  last_service_km    numeric(12,2),
  last_service_date  date,
  last_work_order_id uuid references work_orders(id),
  scheduled_km       numeric(12,2)
      generated always as (last_service_km + interval_km) stored,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (vehicle_id, part_id)
);
create trigger trg_vps_updated before update on vehicle_part_schedules
  for each row execute function set_updated_at();

create or replace function fn_init_pm_schedules(p_vehicle_id uuid)
returns int language plpgsql as $$
declare n int;
begin
  insert into vehicle_part_schedules (vehicle_id, part_id, interval_km)
  select p_vehicle_id, p.id, p.pm_interval_km
  from parts p
  where p.pm_interval_km is not null and p.is_active
  on conflict (vehicle_id, part_id) do nothing;
  get diagnostics n = row_count;
  perform fn_recalc_pm_schedules(p_vehicle_id);
  return n;
end $$;

-- rebuild last_service_km for every part of a vehicle from work order history.
-- For each part, take the most recent completed WO that replaced it, and read
-- the KM from that vehicle's operation record on the repair day.
create or replace function fn_recalc_pm_schedules(p_vehicle_id uuid)
returns int language plpgsql as $$
declare n int;
begin
  with last_wo as (
    select distinct on (wp.part_id)
           wp.part_id, w.id as work_order_id, w.repair_end_at
    from work_order_parts wp
    join work_orders w on w.id = wp.work_order_id
    join rfrs r        on r.id = w.rfr_id
    where r.vehicle_id = p_vehicle_id
      and w.repair_end_at is not null
      and not w.is_skipped
    order by wp.part_id, w.repair_end_at desc
  )
  update vehicle_part_schedules s
     set last_service_km    = fn_odometer_on_date(p_vehicle_id, lw.repair_end_at::date),
         last_service_date  = lw.repair_end_at::date,
         last_work_order_id = lw.work_order_id
    from last_wo lw
   where s.vehicle_id = p_vehicle_id and s.part_id = lw.part_id;
  get diagnostics n = row_count;
  return n;
end $$;

-- closing a work order rolls the PM schedule forward for the replaced parts
create or replace function fn_wo_advance_pm()
returns trigger language plpgsql as $$
declare v_vehicle uuid; v_km numeric;
begin
  if new.repair_end_at is null or new.is_skipped then return new; end if;
  if tg_op = 'UPDATE' and old.repair_end_at is not null then return new; end if;

  select r.vehicle_id into v_vehicle from rfrs r where r.id = new.rfr_id;
  v_km := fn_odometer_on_date(v_vehicle, new.repair_end_at::date);

  update vehicle_part_schedules s
     set last_service_km    = coalesce(v_km, s.last_service_km),
         last_service_date  = new.repair_end_at::date,
         last_work_order_id = new.id
   where s.vehicle_id = v_vehicle
     and s.part_id in (select part_id from work_order_parts where work_order_id = new.id);
  return new;
end $$;
create trigger trg_wo_advance_pm after insert or update of repair_end_at on work_orders
  for each row execute function fn_wo_advance_pm();

create view v_periodic_maintenance as
select s.id as schedule_id, v.id as vehicle_id, v.vehicle_code, v.plate_number,
       p.part_code, p.part_name, s.interval_km, s.last_service_km, s.scheduled_km,
       v.current_odometer_km as actual_km, v.current_odometer_date,
       (s.scheduled_km - v.current_odometer_km) as km_remaining,
       case
         when s.last_service_km is null then 'never_serviced'
         when v.current_odometer_km is null then 'no_km_data'
         when v.current_odometer_km >= s.scheduled_km then 'overdue'
         when s.scheduled_km - v.current_odometer_km
              <= (select value from app_settings where key='pm_due_now_km')  then 'due_now'
         when s.scheduled_km - v.current_odometer_km
              <= (select value from app_settings where key='pm_due_soon_km') then 'due_soon'
         else 'ok'
       end as maintenance_status
from vehicle_part_schedules s
join vehicles v on v.id = s.vehicle_id
join parts    p on p.id = s.part_id
where s.is_active;

-- ============================================================================
-- 10. KPI SCORECARDS
-- ============================================================================
-- period_month null => the vendor's reusable TEMPLATE
-- period_month set  => a frozen monthly snapshot used for that invoice
-- achieved_points is capped at metric_weight.

create table vendor_scorecards (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references vendors(id) on delete cascade,
  period_month date,
  is_template  boolean generated always as (period_month is null) stored,
  status       text not null default 'draft'
                 check (status in ('draft','submitted','approved','reopened')),
  notes        text,
  created_by   uuid references profiles(id) default auth.uid(),
  approved_by  uuid references profiles(id),
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (period_month is null or period_month = date_trunc('month', period_month)::date)
);
create unique index on vendor_scorecards (vendor_id, period_month);
create unique index on vendor_scorecards (vendor_id) where period_month is null;
create trigger trg_sc_updated before update on vendor_scorecards
  for each row execute function set_updated_at();

create table scorecard_sections (
  id             uuid primary key default gen_random_uuid(),
  scorecard_id   uuid not null references vendor_scorecards(id) on delete cascade,
  section_name   text not null,
  section_weight numeric(6,3) not null,
  sort_order     int not null default 0
);
create index on scorecard_sections (scorecard_id);

create table scorecard_lines (
  id              uuid primary key default gen_random_uuid(),
  section_id      uuid not null references scorecard_sections(id) on delete cascade,
  kpi_name        text not null,
  metric_weight   numeric(6,3) not null,
  achieved_points numeric(6,3),
  notes           text,
  sort_order      int not null default 0
);
create index on scorecard_lines (section_id);

create or replace function fn_cap_achieved()
returns trigger language plpgsql as $$
begin
  if new.achieved_points is not null then
    new.achieved_points := least(new.achieved_points, new.metric_weight);
  end if;
  return new;
end $$;
create trigger trg_cap_achieved before insert or update on scorecard_lines
  for each row execute function fn_cap_achieved();

-- section score % = sum(line points) / 100
-- total %         = sum(section_weight% x section score %)
create view v_scorecard_totals as
select sc.id as scorecard_id, sc.vendor_id, sc.period_month,
       sum(sec.section_weight) as sections_weight_total,
       round(sum((sec.section_weight/100.0) * l.achieved_points), 3)
                               as total_achieved_pct
from vendor_scorecards sc
join scorecard_sections sec on sec.scorecard_id = sc.id
join scorecard_lines    l   on l.section_id = sec.id
group by sc.id, sc.vendor_id, sc.period_month;

create or replace function fn_open_month(p_vendor_id uuid, p_month date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_tpl uuid; v_new uuid; s record; v_sec uuid;
begin
  select id into v_tpl from vendor_scorecards
   where vendor_id = p_vendor_id and period_month is null;
  if v_tpl is null then
    raise exception 'No KPI template configured for this vendor';
  end if;

  insert into vendor_scorecards (vendor_id, period_month, status)
  values (p_vendor_id, date_trunc('month', p_month)::date, 'draft')
  returning id into v_new;

  for s in select * from scorecard_sections where scorecard_id = v_tpl order by sort_order loop
    insert into scorecard_sections (scorecard_id, section_name, section_weight, sort_order)
    values (v_new, s.section_name, s.section_weight, s.sort_order)
    returning id into v_sec;

    insert into scorecard_lines (section_id, kpi_name, metric_weight, achieved_points, sort_order)
    select v_sec, l.kpi_name, l.metric_weight, null, l.sort_order
    from scorecard_lines l where l.section_id = s.id;
  end loop;

  return v_new;
end $$;

-- ============================================================================
-- 11. INVOICING
-- ============================================================================

create view v_vendor_monthly_bus_counts as
select o.vendor_id,
       date_trunc('month', o.operation_date)::date      as period_month,
       count(distinct (o.vehicle_id, o.operation_date)) as bus_days,
       count(distinct o.operation_date)                 as operating_days,
       round(count(distinct (o.vehicle_id, o.operation_date))::numeric
             / nullif(count(distinct o.operation_date),0), 4) as avg_daily_buses
from daily_vehicle_operations o
where o.vendor_id is not null
group by 1,2;

create table vendor_invoices (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references vendors(id),
  period_month  date not null,
  scorecard_id  uuid references vendor_scorecards(id),
  billing_basis text,
  rate_amount   numeric(14,2),
  bus_quantity  numeric(12,4),      -- bus-days, or avg daily buses
  gross_amount  numeric(14,2),
  achieved_pct  numeric(6,3),
  net_amount    numeric(14,2),
  currency      text not null default 'EGP',
  status        text not null default 'draft'
                  check (status in ('draft','submitted','approved','paid')),
  notes         text,
  created_by    uuid references profiles(id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (vendor_id, period_month),
  check (period_month = date_trunc('month', period_month)::date)
);
create trigger trg_inv_updated before update on vendor_invoices
  for each row execute function set_updated_at();

create or replace function fn_generate_invoice(p_vendor_id uuid, p_month date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_basis text; v_rate numeric; v_apply boolean; v_curr text;
  v_qty numeric; v_sc uuid; v_pct numeric;
  v_gross numeric; v_net numeric; v_id uuid;
begin
  select billing_basis, rate_amount, apply_kpi, currency
    into v_basis, v_rate, v_apply, v_curr
  from vendors where id = p_vendor_id;

  if v_basis is null or v_rate is null then
    raise exception 'Vendor has no billing terms configured';
  end if;

  select case when v_basis = 'per_bus_day' then bus_days else avg_daily_buses end
    into v_qty
  from v_vendor_monthly_bus_counts
  where vendor_id = p_vendor_id and period_month = v_month;

  v_qty   := coalesce(v_qty, 0);
  v_gross := round(v_rate * v_qty, 2);

  if v_apply then
    select sc.id, t.total_achieved_pct into v_sc, v_pct
    from vendor_scorecards sc
    join v_scorecard_totals t on t.scorecard_id = sc.id
    where sc.vendor_id = p_vendor_id and sc.period_month = v_month;

    if v_pct is null then
      raise exception 'No scorecard for this vendor/month — run fn_open_month first';
    end if;
    v_net := round(v_gross * least(v_pct, 100) / 100.0, 2);
  else
    v_pct := null;
    v_net := v_gross;
  end if;

  insert into vendor_invoices
    (vendor_id, period_month, scorecard_id, billing_basis, rate_amount,
     bus_quantity, gross_amount, achieved_pct, net_amount, currency)
  values
    (p_vendor_id, v_month, v_sc, v_basis, v_rate,
     v_qty, v_gross, v_pct, v_net, v_curr)
  on conflict (vendor_id, period_month) do update set
     scorecard_id  = excluded.scorecard_id,
     billing_basis = excluded.billing_basis,
     rate_amount   = excluded.rate_amount,
     bus_quantity  = excluded.bus_quantity,
     gross_amount  = excluded.gross_amount,
     achieved_pct  = excluded.achieved_pct,
     net_amount    = excluded.net_amount,
     updated_at    = now()
  returning id into v_id;

  return v_id;
end $$;

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================

alter table profiles                 enable row level security;
alter table app_settings             enable row level security;
alter table lookups                  enable row level security;
alter table vendors                  enable row level security;
alter table drivers                  enable row level security;
alter table vehicles                 enable row level security;
alter table routes                   enable row level security;
alter table stations                 enable row level security;
alter table route_stations           enable row level security;
alter table chargers                 enable row level security;
alter table maintenance_centers      enable row level security;
alter table parts                    enable row level security;
alter table vehicle_part_schedules   enable row level security;
alter table daily_vehicle_operations enable row level security;
alter table charging_sessions        enable row level security;
alter table rfrs                     enable row level security;
alter table rfr_issues               enable row level security;
alter table rfr_stage_history        enable row level security;
alter table work_orders              enable row level security;
alter table work_order_parts         enable row level security;
alter table vendor_scorecards        enable row level security;
alter table scorecard_sections       enable row level security;
alter table scorecard_lines          enable row level security;
alter table vendor_invoices          enable row level security;

create policy p_profiles_read on profiles for select using (can_read());
create policy p_profiles_all  on profiles for all    using (is_super()) with check (is_super());

do $$
declare t text;
begin
  -- master data: everyone reads, supervisor+ writes
  foreach t in array array[
    'app_settings','lookups','vendors','drivers','vehicles','routes','stations',
    'route_stations','chargers','maintenance_centers','parts','vehicle_part_schedules'
  ] loop
    execute format('create policy p_%1$s_read  on %1$I for select using (can_read())', t);
    execute format('create policy p_%1$s_write on %1$I for all using (can_write_master()) with check (can_write_master())', t);
  end loop;

  -- operations + maintenance: everyone reads, data_admin/supervisor/super writes
  foreach t in array array[
    'daily_vehicle_operations','charging_sessions',
    'rfrs','rfr_issues','rfr_stage_history','work_orders','work_order_parts'
  ] loop
    execute format('create policy p_%1$s_read  on %1$I for select using (can_read())', t);
    execute format('create policy p_%1$s_write on %1$I for all using (can_write_ops()) with check (can_write_ops())', t);
  end loop;

  -- money: data_admin cannot see it at all; only super_admin writes
  foreach t in array array[
    'vendor_scorecards','scorecard_sections','scorecard_lines','vendor_invoices'
  ] loop
    execute format('create policy p_%1$s_read  on %1$I for select using (can_see_money())', t);
    execute format('create policy p_%1$s_write on %1$I for all using (is_super()) with check (is_super())', t);
  end loop;
end $$;

-- ============================================================================
-- 13. SETUP ORDER  (after the schema runs)
-- ============================================================================
-- 1) your own vendor row (KPI applies):
--      insert into vendors (vendor_code, vendor_name, is_company, vendor_type_id,
--                           billing_basis, rate_amount, apply_kpi)
--      values ('OPE','Our Company', true,
--              (select id from lookups where category='vendor_type' and code='owned'),
--              'per_avg_bus_month', 0, true);
--
-- 2) a rental vendor (no KPI):
--      billing_basis = 'per_bus_day', apply_kpi = false
--
-- 3) PM schedules for every vehicle:
--      select v.vehicle_code, fn_init_pm_schedules(v.id) from vehicles v;
--
-- 4) each month:
--      select fn_open_month('<vendor_uuid>', date '2026-08-01');
--      -- enter achieved_points on scorecard_lines --
--      select fn_generate_invoice('<vendor_uuid>', date '2026-08-01');
-- ============================================================================
