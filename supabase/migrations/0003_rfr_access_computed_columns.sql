-- ============================================================================
-- 0003  RFR ACCESS TIME AS POSTGREST COMPUTED COLUMNS
-- ----------------------------------------------------------------------------
-- The RFR list previously read access time from a second round trip to
-- v_rfr_access_time, filtered by the ids the main query had just returned —
-- one extra network hop (and its own connection/TLS cost) on every load.
--
-- These are PostgREST "computed columns": a function whose sole argument is
-- the table's row type is selectable exactly like a real column
-- (?select=id,access_minutes). That lets the RFR list read access time in the
-- same request as the row itself. The math is unchanged — both still call
-- fn_rfr_access_minutes, the one place access time is computed.
--
-- 0001_init.sql and 0002_saved_filters.sql are never edited; this runs after.
-- ============================================================================

create or replace function access_minutes(r rfrs)
returns numeric language sql stable as $$
  select fn_rfr_access_minutes(r.id);
$$;

create or replace function access_display(r rfrs)
returns text language sql stable as $$
  select fn_format_minutes(fn_rfr_access_minutes(r.id));
$$;
