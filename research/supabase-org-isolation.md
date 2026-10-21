# Org isolation in Supabase: RLS, membership, storage

Research for issue #2 (child of map #1). Question: how should one organization (shop) be isolated from another in a Supabase-backed Next.js app, with users holding one role (Admin/Manager, Inspector, Mechanic) per org?

Sources are official Supabase and PostgreSQL docs, fetched 2026-10-20. Anything marked **(inference)** is my own reasoning from those sources, not a documented statement.

## 1. RLS baseline facts

- With RLS enabled and no policies, Postgres denies everything: "If no policy exists for the table, a default-deny policy is used, meaning that no rows are visible or can be modified." [PG-RLS]
- Superusers and `BYPASSRLS` roles always bypass RLS. Table owners bypass it too unless the table uses `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. [PG-RLS]
- Permissive policies are combined with OR, restrictive policies with AND. [PG-RLS] **(inference)** One `AS RESTRICTIVE` "same org" policy per table can act as a backstop, so a loose permissive role policy can't leak data across orgs.
- When a policy has no `WITH CHECK`, Postgres reuses its `USING` expression for writes. [PG-RLS] Write policies need a `WITH CHECK` on `org_id` so nobody can insert or move a row into another org.
- The Supabase `service_role` has `bypassrls`, and the secret key must never reach the browser. [SB-RLS]
- Views bypass RLS by default on Postgres versions below 15. On 15+, use `security_invoker = true`. [SB-RLS]

## 2. How membership and role reach policies

### Option A: membership-table lookup (source of truth in the DB)

Use an `org_members(org_id, user_id, role)` table. Policies check membership through a `security definer` helper, for example `org_id in (select private.user_org_ids())`, or `private.has_org_role(org_id, 'inspector')`.

- Supabase's benchmarks show the cost depends on how you write it. Pushing a joined lookup into a security definer function took one query from 178,000 ms to 12 ms. The "join reversal" form (`team_id in (select team_id from team_user where user_id = (select auth.uid()))`) took one from 9,000 ms to 20 ms. Wrapping functions in `select` (which creates an initPlan, so the result is cached once per statement) took an admin-role check from 11,000 ms to 7 ms. [SB-PERF]
- Index every column a policy filters on. An index on `user_id` took one query from 171 ms to under 0.1 ms. [SB-PERF] [SB-RLS] For this app, that means `org_id` on every tenant table and `(user_id, org_id)` on `org_members`.
- Security definer functions need a fixed `search_path` (empty is recommended) and fully qualified names. Revoke execute from `public`, `anon`, and `authenticated` where it isn't needed. They "can return rows the caller isn't allowed to read." [SB-FUNC] **(inference)** Keep them in a schema that isn't exposed through the Data API, such as `private`, so they can't be called as RPCs.
- Upside: removing a member or changing a role takes effect on the next query.

### Option B: custom JWT claims via the Custom Access Token Hook

A Postgres hook adds `org_id` and `org_role` to the access token. Policies then read `(select auth.jwt() ->> 'org_id')`. This is Supabase's documented RBAC pattern: a `user_roles` table, a `custom_access_token_hook` that sets the `user_role` claim, and an `authorize()` helper. [SB-RBAC]

- The hook runs "each time a new JWT is created". [SB-HOOKS] Postgres hooks have a 2 s time budget. [SB-HOOKS] The docs recommend granting to `supabase_auth_admin` rather than using `security definer` for the hook itself. [SB-HOOKS]
- Required claims (`iss, aud, exp, iat, sub, role, aal, session_id, email, phone, is_anonymous`) can't be removed. Large JWTs cause problems with SSR cookies. [SB-HOOK]
- The hook changes only the access token, not the auth response, so the client has to decode the JWT to read the claims. [SB-RBAC]
- **Staleness:** claims stay fixed until the token is refreshed. The default access-token lifetime is 1 hour. [SB-SESS] **(inference)** If a mechanic is removed from a shop, they keep that shop's access until their token refreshes, unless policies also check the membership table.
- Never use `user_metadata` / `raw_user_meta_data` for authorization, because users can edit it. `raw_app_meta_data` is safe. [SB-RLS]
- Upside: no table lookup per statement, which makes it the cheapest check.

### Option C: hybrid

Use the JWT `org_id` claim to pick the active org cheaply. Then check `org_members` (through a wrapped security definer function) for anything sensitive: role-gated writes, sign-offs, and anything where revoking access must take effect immediately. **(inference)**

## 3. Users in more than one org

- A JWT has one claim set per session. With Option B, the "current org" has to be one claim (an active org that changes on switch plus a token refresh), or the token has to carry an array of `{org_id, role}`, which grows the JWT. [SB-HOOK] **(inference)**
- With Option A, multiple orgs work without changes (`org_id in (select private.user_org_ids())`), and roles are per membership row. The UI still needs an "active org" for filtering. Supabase advises adding explicit filters in queries anyway: "Do not rely on RLS for filtering but only for security." [SB-PERF]
- **(inference)** Release 1 settles on one org per shop, which doesn't prevent one person from working at two shops. Modeling membership as a join table now (rather than `users.org_id`) keeps that option open at little cost.

## 4. Storage (cert PDFs, audit PDFs, signatures)

- Storage access is RLS on `storage.objects`. Upload needs INSERT; upsert needs INSERT, SELECT, and UPDATE; read and list need SELECT; delete needs DELETE. [SB-STOR]
- Folder-scoped policies use `storage.foldername(name)`, as in `bucket_id = 'x' and (storage.foldername(name))[1] = ...`. [SB-STOR] **(inference)** Use the path convention `<org_id>/<entity>/<id>.pdf` with a policy like `(storage.foldername(name))[1]::uuid in (select private.user_org_ids())`, or compare against the JWT `org_id` claim.
- Private buckets are reachable only through authenticated requests or signed URLs. "Signed URLs remain valid until their expiry time regardless of any Auth key changes." [SB-DL] **(inference)** Keep signed-URL expiry short for signatures and audit PDFs, because a leaked URL can't be revoked.
- Service keys bypass Storage RLS completely. [SB-STOR]

## 5. Service-role jobs (weekly digest, import)

- `service_role` bypasses RLS on both tables and storage. [SB-RLS] [SB-STOR] Isolation is then entirely up to the job's code. **(inference)** Options:
  1. Iterate per org, with every query carrying an explicit `where org_id = $1`. Code review and tests enforce this.
  2. Call narrow `security definer` functions that take `org_id` and only touch that org's rows. The job never issues ad-hoc queries.
  3. For user-initiated imports, run as the user (their JWT and anon key, not the service key) so RLS applies. Use the service role only for truly cross-org work like the digest scheduler.
- Server-side Next.js code should use the user's session client by default and reserve the service client for the jobs above. [SB-RLS] (The secret key never goes to the browser.)

## 6. Options summary

| | Membership lookup (A) | JWT claims (B) | Hybrid (C) |
|---|---|---|---|
| Revocation | Next query | Up to token lifetime (default 1 h) | Immediate where it matters |
| Per-query cost | Low if wrapped, indexed, and using a definer fn | Lowest | Low |
| Multi-org users | Works without changes | Awkward (active-org claim or JWT growth) | Active org in claim, membership in table |
| Moving parts | Tables + definer fns | Hook + grants + client JWT decode | Both |

No product decision is made here. That's for Canaan.

## Sources

- [PG-RLS] PostgreSQL docs, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- [SB-RLS] Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- [SB-PERF] Supabase, RLS performance and best practices: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- [SB-RBAC] Supabase, Custom Claims & RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- [SB-HOOK] Supabase, Custom Access Token Hook: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- [SB-HOOKS] Supabase, Auth Hooks: https://supabase.com/docs/guides/auth/auth-hooks
- [SB-SESS] Supabase, User sessions: https://supabase.com/docs/guides/auth/sessions
- [SB-FUNC] Supabase, Database Functions: https://supabase.com/docs/guides/database/functions
- [SB-STOR] Supabase, Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- [SB-DL] Supabase, Serving downloads: https://supabase.com/docs/guides/storage/serving/downloads
