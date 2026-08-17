-- ============================================================================
-- 0002  SAVED FILTERS
-- ----------------------------------------------------------------------------
-- Per-user, per-module filter sets. `filter_state` holds the same shape the
-- URL carries, so applying a saved filter is just rewriting the query string.
--
-- 0001_init.sql is never edited; this runs after it.
-- ============================================================================

create table saved_filters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  module       text not null,
  name         text not null,
  filter_state jsonb not null default '{}'::jsonb,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, module, name)
);

create trigger trg_saved_filters_updated before update on saved_filters
  for each row execute function set_updated_at();

create index on saved_filters (user_id, module);

-- at most one default per user per module
create unique index one_default_saved_filter
  on saved_filters (user_id, module)
  where is_default;

-- ---- RLS: a user sees and changes only their own rows ----------------------

alter table saved_filters enable row level security;

create policy p_saved_filters_own on saved_filters
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
