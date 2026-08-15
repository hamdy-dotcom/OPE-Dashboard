# Pyramids Ops

Internal operations tracker for the Pyramids shuttle bus operation —
daily operations, maintenance (RFR → Work Order), per-part periodic
maintenance, and monthly vendor invoicing.

**Read `CLAUDE.md` before building anything.** It carries the full domain spec,
the non-obvious business rules, the role matrix, and the design system.

---

## Setup

### 1. Database

Create a Supabase project, then run the migration in the SQL editor:

```
supabase/migrations/0001_init.sql
```

Generate types:

```bash
npx supabase gen types typescript --project-id <project-ref> > src/lib/supabase/types.ts
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Supabase → Project Settings → API.

### 3. Run

```bash
npm install
npm run dev
```

### 4. First accounts

There is no public sign-up. Create users in Supabase → Authentication → Users,
then insert a matching profile:

```sql
insert into profiles (id, full_name, job_title, role, is_engineer)
values ('<auth-user-uuid>', 'Full Name', 'Planning Manager', 'super_admin', false);
```

Roles: `super_admin` · `admin` · `supervisor` · `data_admin`.

### 5. Seed order

1. Vendors — including the company's own row with `is_company = true`
2. Drivers, vehicles, routes, stations, chargers
3. PM schedules: `select v.vehicle_code, fn_init_pm_schedules(v.id) from vehicles v;`
4. KPI template per vendor, then `fn_open_month(...)` each month

---

## Deploy

Push to GitHub, import the repo in Vercel, set the two `NEXT_PUBLIC_` env vars.
No build configuration needed.

---

## What's built

- App shell, three-pane layout, role-aware sidebar
- Auth (email + password), route protection, profile-based roles
- English / Arabic with full RTL
- Design system: `Pill` `Micro` `KmMeter` `Panel` `RecordCard` `KeyValue`
  `StageRail` `Button` `Stat` `Empty`
- Day Board — the reference module; copy its shape for the rest

## What's next

See `CLAUDE.md` section 6 for the module list and build order.

## Design reference

`design-reference.html` — open in a browser. Three finished screens showing the
agreed visual language, including the Arabic RTL flip.
