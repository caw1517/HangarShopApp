# Sending a scheduled per-org email digest (Next.js + Supabase)

Research for issue #4 (child of map #1). Sources checked 2026-10-20; prices and limits change, so re-check before committing.

**Question:** how should a hosted Next.js + Supabase app send a weekly email digest from the app's own sender, per organization (one org per shop)?

## TL;DR

- **Do not use Supabase's built-in SMTP.** It only delivers to the project's team members, is capped at 2 messages/hour, and is documented as non-production. It is also an Auth-email feature, not a general sending API.
- **Provider: Resend** is the best fit for a small Next.js app. Free tier is 3,000 emails/month (100/day) with 3 domains; Pro is $20/mo for 50k. It has batch sends (100 per call) and idempotency keys. **Postmark** is a strong deliverability-first alternative ($15/mo Basic for 10k; free tier is only 100/month). **Amazon SES** is cheapest per email ($0.10/1,000) but you have to request production access and do more setup yourself.
- **Sender:** one app-owned sending subdomain (for example `digest.<appdomain>`) with SPF + DKIM + DMARC, used for every org. Set a per-org `Reply-To` if replies should reach the shop.
- **Scheduling:** one weekly job that loops over orgs, with an idempotency record per `(org_id, digest_week)`. Use **Vercel Cron** if the app is on Vercel, or **Supabase Cron (`pg_cron`) + `pg_net` → Edge Function** if you want the schedule to live next to the data. Both deliver at-least-once/best-effort, so idempotency is required.
- **Cost:** about $0 for email at 1 shop and still $0 at ~50 shops on Resend Free, as long as sends are spread so no single day goes over 100. Otherwise Resend Pro is $20/mo. Hosting is the bigger cost: Vercel Hobby is non-commercial only, and Supabase Free pauses after a week of inactivity.

## 1. Provider options

| Provider | Free tier | Paid entry | Overage | Sending domains | Notes |
|---|---|---|---|---|---|
| Resend | 3,000/mo, **100/day** | Pro $20/mo (50k); $35/mo (100k) | $0.90 / 1,000 | Free 3, Pro 10 | Batch endpoint up to 100 emails/call; idempotency keys (24h expiry); default API rate limit 10 req/s per team |
| Postmark | 100/mo, no overage | Basic $15/mo (10k); Pro $16.50; Platform $18 | $1.80 / $1.30 / $1.20 per 1,000 | 5 / 10 / unlimited | Known for deliverability; separates transactional vs broadcast streams |
| Amazon SES | Up to $200 AWS Free Tier credits for new customers | Pay-as-you-go | $0.10 / 1,000 | n/a | Starts in a **sandbox**: you can only send to verified identities until you get production access through a support request. Dedicated IP is $24.95/mo (not needed at this volume) |
| Supabase built-in SMTP | n/a | n/a | n/a | n/a | "Send messages only to pre-authorized addresses", "2 messages per hour", "non-production use cases", no SLA. **Not viable.** |

Sources: [Resend pricing](https://resend.com/pricing), [Resend API intro (rate limit)](https://resend.com/docs/api-reference/introduction), [Resend batch send](https://resend.com/docs/api-reference/emails/send-batch-emails), [Postmark pricing](https://postmarkapp.com/pricing), [Amazon SES pricing](https://aws.amazon.com/ses/pricing/), [Amazon SES FAQ (sandbox)](https://aws.amazon.com/ses/faqs/), [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 2. Custom sender domain (SPF / DKIM / DMARC)

- Resend recommends sending from a subdomain, "e.g., `updates.example.com` instead of your root domain to isolate your sending reputation" ([Resend domains](https://resend.com/docs/dashboard/domains/introduction)). The provider generates the exact SPF (TXT, plus an MX for the bounce/return-path subdomain) and DKIM records when you add the domain. You paste them into DNS.
- Add a DMARC TXT record at `_dmarc.<domain>`, starting with `p=none` and tightening later. Yahoo requires "a valid DMARC policy with at least p=none" for bulk senders ([Yahoo sender best practices](https://senders.yahooinc.com/best-practices/)).
- **Per-org sender domains are not needed.** The map settles that mail comes from the app's own sender. One verified domain covers every org. Put the shop name in the display name and `Reply-To` (for example `"Acme Aviation via HangarShop" <digest@digest.app.com>`, Reply-To the shop's contact).

## 3. Deliverability for low-volume B2B mail

Gmail rules for **all senders** ([Google sender guidelines](https://support.google.com/a/answer/81126)): SPF *or* DKIM, valid forward and reverse DNS, TLS, RFC 5322 formatting, and spam rate under 0.3% in Postmaster Tools. **Bulk senders (5,000+/day to Gmail)** must also have SPF *and* DKIM, DMARC with alignment, and one-click unsubscribe. Yahoo's rules are the same ([Yahoo](https://senders.yahooinc.com/best-practices/)), plus "Honor unsubscribes within 2 days."

This app is far below the 5,000/day bulk threshold, but meeting the bulk rules anyway is cheap and makes the setup future-proof:
- Set up SPF + DKIM + DMARC and make sure they align with the From domain. A provider-verified subdomain gives you this.
- Add `List-Unsubscribe` (an HTTPS URL) and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. Resend passes custom headers through, and the endpoint must accept POST ([Resend unsubscribe headers](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails)). Store a per-user digest opt-out.
- Low-volume specifics (practice, not vendor-sourced): a brand-new domain sending a few weekly mails has little reputation. Keep content plain and useful, send only to invited org members (no purchased lists), and keep bounces low by removing addresses that hard-bounce, using provider webhooks.
- Keep digest mail on a separate subdomain or stream from Auth mail (password resets), so a digest complaint can't hurt login deliverability.

## 4. Scheduling the weekly per-org job

### Option A: Vercel Cron → Next.js route handler (if hosted on Vercel)
- Configure in `vercel.json` `crons`. Vercel sends GET to the **production** deployment URL. "The timezone is always UTC." ([Vercel cron jobs](https://vercel.com/docs/cron-jobs))
- Hobby: once per day minimum and ±59 min precision. Pro: per-minute. 100 crons per project on all plans ([usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). A weekly job works on either plan.
- Secure it with the `CRON_SECRET` env var. Vercel sends `Authorization: Bearer <CRON_SECRET>`.
- **No retries on failure.** Delivery is "best effort" and "can also occasionally invoke the same scheduled run more than once", so Vercel tells you to make jobs idempotent and reconciliation-based ([managing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)).
- Duration: the function max is 300s on Hobby, and configurable up to 800s on Pro ([Hobby plan](https://vercel.com/docs/plans/hobby)). That is plenty for 50 orgs if you use Resend batch.

### Option B: Supabase Cron (`pg_cron`) + `pg_net` → Edge Function
- Use `cron.schedule(...)` to call `net.http_post(...)` against an Edge Function. Supabase recommends storing the auth token in **Supabase Vault** ([schedule functions](https://supabase.com/docs/guides/functions/schedule-functions)).
- Guidance: "no more than 8 Jobs run concurrently. Each Job should run no more than 10 minutes" ([Supabase Cron](https://supabase.com/docs/guides/cron)). `pg_cron` defaults to GMT, configurable via `cron.timezone` ([pg_cron](https://github.com/citusdata/pg_cron)).
- Edge Function limits: 256MB memory, 2s **CPU** per request (async I/O excluded), 150s wall clock on Free and 400s on paid ([limits](https://supabase.com/docs/guides/functions/limits)). Invocations: 500k on Free, 2M on Pro ([pricing](https://supabase.com/pricing)).
- Upside: it works whatever the Next.js host is, and you can fan out one HTTP call per org from SQL (`select net.http_post(...) from orgs`), so no single invocation does all the work.

### Job shape (either option)
1. Trigger weekly (for example Monday 12:00 UTC). If shops need local morning delivery, run hourly or daily and send to orgs whose local time is due. Hourly needs Vercel Pro or pg_cron.
2. For each org: `insert into digest_runs (org_id, week_start) ... on conflict do nothing`. Skip the org if the row already exists, which handles duplicate invocations. Mark the row sent or failed afterwards, so the next run can re-attempt anything missed.
3. Build the digest server-side with the service role, scoped per org. Send with the Resend batch endpoint and an idempotency key like `digest/<org_id>/<week_start>`.
4. Record provider message IDs. Handle bounce and complaint webhooks to suppress bad addresses.

## 5. Indicative cost

Assumptions: ~5 recipients per shop, weekly, so about 4.3 sends per recipient per month.

| Scale | Emails/month | Resend | Postmark | SES |
|---|---|---|---|---|
| 1 shop | ~22 | $0 (Free) | $0 (Free, 100/mo) | ~$0.00 (sandbox exit still required) |
| ~50 shops | ~1,075 (~250 per weekly run) | $0 on Free **only if** each day stays under 100/day (spread orgs across weekdays); otherwise **$20/mo** Pro | $15/mo Basic | ~$0.11/mo |

Hosting is the real cost driver. Vercel Hobby "restricts users to non-commercial, personal use only" ([Hobby plan](https://vercel.com/docs/plans/hobby)), so a paid product needs Pro at $20/developer seat/month. Supabase Free "projects are paused after 1 week of inactivity", and Pro starts at $25/mo ([Supabase pricing](https://supabase.com/pricing)).

## Recommendation

**Resend + one app-owned sending subdomain (SPF/DKIM/DMARC) + one weekly scheduled job with a `digest_runs` idempotency table.**
- If the app is on Vercel, use Vercel Cron → route handler: simplest, and it lives in the app repo.
- If you would rather keep scheduling in the database or stay host-agnostic, use Supabase Cron + Edge Function.
- Add one-click unsubscribe headers and bounce/complaint webhooks from day one.
- Fall back to Postmark if deliverability becomes a problem, or to SES if volume grows a lot. Hide the provider behind a small `sendDigest()` module so switching is cheap.

## Open questions for the spec
- Hosting target (Vercel or elsewhere) decides Option A vs B.
- Local-time delivery per shop, or one global UTC send time?
- Who gets the digest: all org members by default with opt-out, or opt-in?
