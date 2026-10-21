# Audit log on every edit in Postgres/Supabase: options

Research for issue #3 (child of map #1). Question: what are the practical options for an audit log on every edit, and their trade-offs? Covers trigger-based row history, app-level event logging, user/org attribution under RLS, tamper-resistance, storage growth, and querying "who changed this cal record, when, from what to what".

Sources are primary (Postgres docs, Supabase docs, Supabase source code, PostgREST docs). Retrieved 2026-10-20.

## TL;DR

- **Use a hand-rolled, generic `AFTER INSERT/UPDATE/DELETE` row trigger** that writes `old`/`new` as `jsonb` into one append-only `audit.record_version`-style table. Model it on Supabase's `supa_audit` design, but don't depend on the extension: the repo was **archived on 2025-02-16** and it **does not record who made the change**. [1][2]
- **Attribution:** inside the trigger, read the actor from the JWT that PostgREST puts in the transaction (`auth.uid()` / `auth.jwt()`). Take `org_id` from the audited row itself, not from user-editable metadata. [3][4][5]
- **Tamper resistance:** put the table in a schema the Data API doesn't expose. Write to it only through a `SECURITY DEFINER` trigger function with a pinned `search_path`. Grant no `UPDATE`/`DELETE`/`TRUNCATE` to app roles. Expose reads through RLS-scoped views or functions. This is append-only against the app and its users. It is **not** tamper-proof against the database owner or superuser. [5][6][7][8]
- **Not the right tool:** `pgaudit`. It writes statement logs to the Postgres log, which is not queryable in-app, and Supabase's own docs warn against row-data logging. [9]
- **App-level event logging** works well *alongside* triggers for business intent ("signed off inspection", "reason for change"). On its own it can't guarantee "every edit": anything that writes without going through the app escapes it.

## 1. Trigger-based row history

### 1a. `supa_audit` (Supabase extension)

What it is: a single generic table `audit.record_version` with `id, record_id, old_record_id, op, ts, table_oid, table_schema, table_name, record jsonb, old_record jsonb`. You turn it on per table with `select audit.enable_tracking('public.x'::regclass)`. TRUNCATE is recorded as its own op. [1]

Design points worth copying (from Supabase's write-up) [2]:
- **One table for all audited tables**, with row data stored as `jsonb`. Schema changes on the audited tables need no audit-table migrations.
- **Stable `record_id`**: a deterministic UUIDv5 of `[table_oid, pk values...]`. A row's history stays queryable across updates, and `old_record_id` handles PK changes.
- **Indexes**: BRIN on `ts` (the timestamp correlates with physical insert order, so the index stays tiny), plus BTREE on `table_oid` and `record_id`.
- **Overhead**: "where throughput is less than 1000 writes per second the overhead is typically negligible". The README advises against tables with peak writes over 3k ops/sec. [1][2] A shop app is orders of magnitude below that.

Gaps for us:
- **Archived 2025-02-16, read-only.** [1]
- **No actor column.** Neither the README nor the design post records the user. [1][2]
- No `org_id` column, so RLS on history can't scope by tenant without parsing `jsonb`.

### 1b. Hand-rolled generic jsonb trigger (recommended)

This is the same shape as `supa_audit`, plus actor and org columns. Postgres gives a row-level trigger `OLD`, `NEW`, `TG_OP`, `TG_RELID`, `TG_TABLE_SCHEMA`, and `TG_TABLE_NAME`. Its return value is ignored for `AFTER` triggers. [6] The Postgres docs' own audit example records `now()` and `current_user` per op. [6] Under Supabase, `current_user` is just `authenticated` or `service_role`, so we need the JWT for the real user (section 3).

Sketch (illustrative, not tested):

```sql
create schema audit;                       -- NOT in Supabase "Exposed schemas"

create table audit.record_version (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  op            text not null,             -- INSERT/UPDATE/DELETE
  table_oid     oid  not null,
  table_name    text not null,
  record_pk     text not null,             -- or uuid v5 like supa_audit
  org_id        uuid,                      -- copied from the row
  actor_id      uuid,                      -- auth.uid(); null = system/service
  actor_claims  jsonb,                     -- optional: role, email at time of change
  old_record    jsonb,
  new_record    jsonb,
  changed_cols  text[]                     -- optional, cheap to compute on UPDATE
);
create index on audit.record_version using brin (ts);
create index on audit.record_version (table_oid, record_pk, ts);
create index on audit.record_version (org_id, ts);

create function audit.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into audit.record_version
    (op, table_oid, table_name, record_pk, org_id, actor_id, actor_claims, old_record, new_record)
  values
    (tg_op, tg_relid, tg_table_schema || '.' || tg_table_name,
     r ->> 'id', (r ->> 'org_id')::uuid,
     auth.uid(), auth.jwt(),
     case when tg_op <> 'INSERT' then to_jsonb(old) end,
     case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

create trigger audit_aft after insert or update or delete on public.cal_record
  for each row execute function audit.log_change();
```

Notes:
- **Statement-level triggers with transition tables** (`REFERENCING OLD TABLE AS ... NEW TABLE AS ...`) are "significantly faster" when one statement changes many rows. [6] That's an option if bulk imports turn out to be slow. Row-level is simpler and fine at our scale.
- **Diffing:** Postgres has **no built-in jsonb diff**. [10] Either store full `old`/`new` and diff at read time (simplest, lossless), or compute `changed_cols` in the trigger by comparing `jsonb_each(old)` against `jsonb_each(new)`. [10] Skipping no-op updates (`old is not distinct from new`) cuts noise.
- **Bypass risk:** `session_replication_role = replica` stops ordinary triggers from firing. Only superusers or roles with that `SET` privilege can set it. [11] The app's roles can't.

## 2. Application-level event logging

The Next.js server writes an `events` row (actor, org, action, payload) next to each mutation.

- **Pros:** captures *intent* and context the DB can't see: "inspection signed off", reason-for-change text, request IP, UI screen. Readable domain events.
- **Cons:** completeness depends on every code path remembering to log. It misses SQL-console edits, migrations, background jobs, and any direct Supabase-client writes. It also needs the same transaction as the mutation to avoid drift. The issue says "audit log on every edit" is settled, and that's the trigger's job, which app logging can't guarantee.
- **Verdict:** a complement, not a substitute. If we add it later, a cheap bridge is to have the server set a transaction-local setting (e.g. `set local app.change_reason = '...'`) that the trigger copies into the audit row. That's the same mechanism PostgREST uses for its `request.*` settings. [4]

## 3. Attributing the change to user and org under RLS

- **Mechanism:** for each request, PostgREST sets transaction-scoped settings `request.jwt.claims`, `request.headers`, `request.method`, and `role`. Read them with `current_setting(..., true)`. [4]
- **`auth.uid()` source** (Supabase Auth migrations): `coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid`. `auth.jwt()` returns the whole claims `jsonb`, and Supabase now marks `uid()`/`role()`/`email()` "Deprecated. Use auth.jwt() -> 'sub' instead." Both still work. [3] They are plain SQL functions over transaction settings, so they **work inside a trigger** fired by the request's statement.
- **Null actor:** `auth.uid()` returns null for unauthenticated calls. [5] It's also null for requests made with the **service_role/secret key**, which has `BYPASSRLS` and isn't tied to a signed-in user. [7] Record that null as "system". **Rule for the app:** do user-initiated writes with the user's JWT (Supabase server client with the user session), not the service key. Otherwise attribution is lost.
- **Org:** take `org_id` from the audited row (every tenant table carries it), not from the JWT. If role/org claims are added to the JWT via the Custom Access Token hook, read them with `auth.jwt() ->> 'claim'`. [8] Never use `raw_user_meta_data` for this: users can edit it via `supabase.auth.update()`. `raw_app_meta_data` they can't edit. [5]
- **Snapshot claims:** storing `actor_claims` (role, email) keeps "who" readable after a user is renamed or removed.

## 4. Tamper-resistance (append-only)

- Keep `audit` **out of Supabase's Exposed schemas**. A `SECURITY DEFINER` function in an exposed schema is callable over the Data API with the creator's privileges. [5]
- The trigger function is `SECURITY DEFINER` with `set search_path = ''` (Supabase) or trusted schemas plus `pg_temp` last (Postgres guidance). It can insert even though app roles can't. [5][12]
- `revoke all on audit.record_version from public, anon, authenticated;` grant nothing to app roles except read through a view or function that applies org scoping. No role but the owner has `INSERT/UPDATE/DELETE/TRUNCATE`.
- Optional belt-and-braces: a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger on the audit table that raises an exception. "Any trigger type can abort the operation by raising an error." [6]
- **Limits (be honest in the spec):** the table owner, `postgres`, and superusers can still alter or drop history, or disable triggers. [11] Stronger guarantees mean off-database copies: periodic export to write-once storage, or hash-chaining rows (`hash = sha256(prev_hash || row)`) so edits are detectable. Probably overkill for Release 1. Worth noting if a customer asks for regulatory-grade immutability.

## 5. Storage growth

- Each change stores up to two full row images as `jsonb`. Growth is roughly (edits/day) x (avg row size x 2). For a shop app with small text rows, that's small (MBs/month). Large blobs belong in Storage, not table columns, so they aren't duplicated.
- Mitigations, in order of effort: skip no-op updates; audit only domain tables (not caches or derived tables); store `old_record` plus only the changed keys of `new`; then **range-partition by month on `ts`**. Supabase recommends native declarative partitioning over pg_partman, and dropping or archiving whole partitions makes retention cheap. [13] The BRIN-on-`ts` index stays tiny regardless. [2]
- Retention policy is a product decision (aviation records may require years). Partitioning keeps that option open without redesign.

## 6. Querying history ("who changed this cal record, when, from what to what")

```sql
select v.ts, v.op, v.actor_id, v.actor_claims ->> 'email' as actor_email,
       o.key as field, o.value as old_value, n.value as new_value
from audit.record_version v
cross join lateral jsonb_each(coalesce(v.new_record, '{}')) n
left join lateral jsonb_each(coalesce(v.old_record, '{}')) o on o.key = n.key
where v.table_oid = 'public.cal_record'::regclass
  and v.record_pk = $1
  and o.value is distinct from n.value
order by v.ts desc;
```

- Filter on `table_oid` and the record key, which are indexed. supa_audit's README makes the same recommendation over filtering on schema/table name text. [1]
- Expose to the app as a `security definer` function (in a non-exposed schema, wrapped by an RPC in `public` if needed) or a `security_invoker` view. Either way it must enforce `org_id` = caller's org and the role check (e.g. Admin/Manager, Inspector). Wrap `auth.uid()`/`auth.jwt()` in `(select ...)` in policies so they're evaluated once per statement. [5]

## Options compared

| Option | Every edit? | Who/org | Tamper-resistance | Effort | Notes |
|---|---|---|---|---|---|
| `supa_audit` extension | Yes (I/U/D/TRUNCATE) | **No actor** | Depends on grants | Lowest | **Archived Feb 2025** [1] |
| Hand-rolled jsonb trigger | Yes | Yes, via `auth.jwt()` and the row's `org_id` | Append-only vs app roles | Low (~1 migration) | **Recommended** |
| App-level events | Only app paths | Yes, plus intent | Same as any table | Medium, ongoing discipline | Complement for intent/reason |
| `pgaudit` | Statement-level | DB role, not app user | Logs outside DB | Low | Not in-app queryable; row logging discouraged [9] |

## Recommendation

1. A hand-rolled generic `AFTER` row trigger writes into `audit.record_version`, following the supa_audit layout plus `org_id`, `actor_id`, `actor_claims`. Attach it to every tenant domain table in the same migration that creates the table.
2. The `audit` schema is not exposed. The trigger fn is `SECURITY DEFINER` with `search_path=''`. App roles get no write grants. A guard trigger blocks UPDATE/DELETE/TRUNCATE.
3. All user writes go through the user's JWT (not service_role), so `auth.uid()` is populated. Service-key writes show as "system".
4. Diff at read time via `jsonb_each`. Add an RLS-scoped history RPC per record.
5. Defer partitioning, app-level reason capture (`set local app.change_reason`), and off-DB immutability until needed. The schema above accommodates all three without redesign.

Open questions for the map: the required retention period for audit history, and whether "reason for change" must be captured on cal-record edits (that would pull app-level context in for Release 1).

## Sources

1. supabase/supa_audit README (archived 2025-02-16). https://github.com/supabase/supa_audit
2. Supabase blog, "Postgres Auditing in 150 lines of SQL". https://supabase.com/blog/postgres-audit
3. Supabase Auth source, migrations `20220224000811_update_auth_functions.up.sql` and `20220531120530_add_auth_jwt_function.up.sql`. https://github.com/supabase/auth/tree/master/migrations
4. PostgREST docs, Transactions: request settings. https://docs.postgrest.org/en/stable/references/transactions.html
5. Supabase docs, Row Level Security (auth.uid/auth.jwt, app vs user metadata, security definer placement, select-wrapping). https://supabase.com/docs/guides/database/postgres/row-level-security
6. PostgreSQL docs, PL/pgSQL Trigger Functions (special variables, transition tables, audit example, return values). https://www.postgresql.org/docs/current/plpgsql-trigger.html
7. Supabase docs, API keys (service_role has BYPASSRLS; server-only). https://supabase.com/docs/guides/api/api-keys
8. Supabase docs, Custom Claims & RBAC (Custom Access Token hook, `auth.jwt() ->> 'user_role'`). https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
9. Supabase docs, PGAudit extension. https://supabase.com/docs/guides/database/extensions/pgaudit
10. PostgreSQL docs, JSON Functions and Operators. https://www.postgresql.org/docs/current/functions-json.html
11. PostgreSQL docs, Client Connection Defaults (`session_replication_role`). https://www.postgresql.org/docs/current/runtime-config-client.html
12. PostgreSQL docs, CREATE FUNCTION ("Writing SECURITY DEFINER Functions Safely"). https://www.postgresql.org/docs/current/sql-createfunction.html
13. Supabase docs, Partitioning tables. https://supabase.com/docs/guides/database/partitions
