# Multi-Tenant Row-Level Security Isolation

Every domain table and storage object in HangarShopApp is scoped to a Shop via an explicit `org_id` column and enforced by Postgres Row-Level Security (RLS) policies backed by the caller's active `org_memberships` record. Service-role background jobs (such as the weekly email digest cron) must filter explicitly by `org_id` per tenant iteration, and cross-tenant lookups (including QR Label short-code resolution by non-members) return an indistinguishable not-found response so tenant existence and data are never leaked.

## Considered Options

- **Application-only `WHERE org_id = ...` filtering without RLS**: Rejected because a single missing filter in a server action or query would leak records across hangars.
- **Separate database or Postgres schema per Shop**: Rejected because schema migrations and scheduled cross-shop jobs become brittle as shops are added.
- **Shared tables with mandatory `org_id` + forced Postgres RLS + Storage bucket policies**: Chosen because it enforces tenant isolation at the database engine boundary while keeping schema migrations single-path.

## Consequences

- Every new domain table must include `org_id uuid NOT NULL REFERENCES organizations(id)`, lead composite indexes with `org_id`, and enable/force RLS in the same migration.
- Platform owners have no implicit read access to tenant tables; inspecting a Shop in the UI requires being invited as a Member of that Shop.
