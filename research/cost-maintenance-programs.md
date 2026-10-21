# How JSSI / MSP / ESP-style cost-maintenance programs work for the operator

Research for issue #7 (child of wayfinder map #1). Researched 2026-10-20.

**Question:** What does an enrollment in an engine/aircraft hourly cost-maintenance program consist of, how are hours reported, how are rates, term, renewal and transfer handled, and which fields and dates does an operator need to track?

## Sources

Primary sources (provider or OEM sites) unless marked otherwise.

- [S1] Honeywell, *MSP FAQs*: https://www.honeywellaerospace.com/us/en/support/customer/website-tutorials/msp-faqs
- [S2] Honeywell, *MSP Propulsion brochure* (N61-2402-000-000 v6): https://aerospace.honeywell.com/content/dam/aerobt/en/documents/landing-pages/brochures/N61-2402-000-000_MSP-CorpJetSupport_v6.pdf
- [S3] Honeywell, *Maintenance and service plans*: https://aerospace.honeywell.com/en/learn/services/maintenance-and-service-plans
- [S4] JSSI, *How to make aircraft maintenance costs more predictable*: https://jetsupport.com/how-to-make-aircraft-maintenance-costs-more-predictable
- [S5] JSSI, *COVID-19 financial relief extension*: https://jetsupport.com/covid-19-financial-relief-extension
- [S6] JSSI-authored Q&A in AvBuyer, *What are the FAQs JSSI receives from the broker community?*: https://www.avbuyer.com/articles/maintenance-repair-overhaul/what-are-the-faqs-jssi-receives-from-the-broker-community-112132 (provider-authored, third-party host)
- [S7] Rolls-Royce, *CorporateCare Enhanced* page: https://www.rolls-royce.com/products-and-services/civil-aerospace/business-aviation/corporate-care-enhanced.aspx
- [S8] Rolls-Royce, *CorporateCare Enhanced for Pearl 15* brochure: https://www.rolls-royce.com/~/media/Files/R/Rolls-Royce/documents/civil-aerospace-downloads/corporatecare-enhanced-pearl-15.pdf
- [S9] P&WC ESP pages on rtx.com: https://www.rtx.com/prattwhitney/services/pwc-engine-services/maintenance-programs/esp-maintenance-program and https://www.rtx.com/en/prattwhitney/services/pwc-engine-services/maintenance-programs/esp-maintenance-program/esp-program-transfers (the pages returned HTTP 500 to the fetcher. Claims tagged S9 come from search-engine extracts of these pages and were not read in full.)
- [S10] P&WC statement quoted in AOPA, *Manage engine maintenance cost with P&WC ESP* (2024): https://aopa.org/news-and-media/all-news/2024/september/06/manage-engine-maintenance-cost-with-pwc-esp (secondary)
- [S11] P&WC press release via HeliHub (2010), *P&WC eliminates minimum annual operating hour requirement for ESP*: https://www.helihub.com/2010/10/20/pwc-eliminates-minimum-annual-operating-hour-requirement-for-espr-program/ (secondary)

## How it works (common model)

- The provider estimates maintenance cost over time and turns it into an **hourly rate**. The operator pays that rate each month for the hours flown, and the provider pays the shop for covered events. [S4] P&WC ESP: "pay an hourly fee based on the number of hours flown each month." [S9, S11] Rolls-Royce describes CorporateCare Enhanced as "cost per flight hour". [S8]
- **The enrolled asset is a specific unit.** JSSI offers separate programs for engines, the APU and the airframe, plus Tip-To-Tail, which covers all three. [S4] Honeywell MSP covers engines, APUs and avionics/control systems. Avionics coverage is "by part number". [S1, S3] RR and P&WC cover engines. RR's Pearl/BR710 coverage also includes the nacelle. [S7, S8]
- **Coverage tiers:**
  - Honeywell MSP: Standard and MSP **Gold**. Gold adds removal/reinstall labor, freight, access time and extended troubleshooting for "a small additional hourly fee". [S2, S3]
  - P&WC ESP: tiers currently named **Basic / Gold / Platinum** [S10]. The 2010 tier names were Gold, Silver, Gold Lite and Silver Lite. [S11]
  - RR CorporateCare vs **CorporateCare Enhanced**. Enhanced adds line maintenance, nacelle, unlimited troubleshooting, loaner engines and Alternative Lift. [S7, S8]
  - What a tier covers is defined by the contract and, for Honeywell, by the IPC. [S1]
- **Typically covered:** scheduled and unscheduled shop visits, LLPs, ADs and mandatory/recommended SBs at shop visit, and loaner/rental engines (RR, Honeywell). [S2, S8] **FOD is usually excluded** or only covered through gap coverage. RR covers "non-FOD events" and Honeywell lists "FOD Gap Coverage". [S2, S8]

## Hours reporting (the key recurring date)

- **Honeywell MSP:** "Engine and APU hours must be reported monthly by the 10th." Invoices "are issued and due by the 15th of the month, per contract terms." You report through the MSP portal by entering TSN or usage hours. You can report up to two months ahead, report partial months, and report hours on a **rental engine** separately ("Rental Installed"). [S1]
- **JSSI:** hours are reported monthly through the MyJSSI portal. Contracts carry **minimum flight-hour** obligations, invoiced either annually ("annual minimum flight hour invoices") or monthly. [S5, S6] JSSI lets operators suspend minimums on non-calendar engines for up to 12 months while the aircraft is for sale. [S6]
- **P&WC ESP:** billing is monthly on hours flown. ESP has had **no annual flying minimum** since 2010. [S10, S11]
- **Consequence of late reporting:** none of the public sources states a penalty. Every source says the terms are set "per contract terms". In practice a late or missing report leads to an unpaid or incorrect invoice. Honeywell lets you cancel an invoice and resubmit it with corrected hours [S1]. On a sale, the buyer is told to confirm that all hours are reported and all invoices are paid. [S6] *Inference: an operator's real risk is a coverage dispute or a lost transfer, not a fixed fee. The app should treat the reporting due date as a hard deadline.*

## Rate structure, buy-in and pro-rata

- The rate is set per hour, per enrolled asset, and is quoted case by case. No public price lists exist. [S3] Rates rise each year: JSSI refers to "annual make and model rate increases". [S5] Honeywell offers discounts of up to 10% for usage-based/connected-aircraft data. [S2]
- **Enrolling an in-service engine** requires either a **buy-in** (payment for hours and cycles already flown) or a **pro-rata** arrangement, where the operator pays their share of the next event. Example: an engine with 5,000 hours at a $200/hr rate means a buy-in of about $1M. [S4, S6]
- **P&WC ESP Flex:** the operator can defer "at least 50%" of the buy-in until the next shop visit or the sale of the aircraft. Deferred Flex hours do **not** transfer at sale. [S9]
- New-aircraft incentives: P&WC covers the first 400 hours on new PT6A aircraft. [S10] Honeywell gives new aircraft 5 years of APU MSP at no cost, plus Early Enrollment / In Lieu of Warranty (ILOW). [S2]

## Term and renewal

- Honeywell MSP: "Annual auto-renewal (new)". You renew through the portal ("Contracts & Subscription → Renew Now"). [S1, S2]
- JSSI, RR and P&WC public pages do not state a fixed term. Treat the term as a contract-specific value with a start date, an expiry or renewal date, and an auto-renew flag.

## Transfer: aircraft sale and engine swap

- **Sale:** coverage transfers with the aircraft for Honeywell MSP ("Fully transferable", "Program Transferable at Time of Sale") [S2], RR CorporateCare (value transfers "with no transfer fee") [S7] and P&WC ESP [S10]. For JSSI, the seller can either transfer the coverage to the buyer or keep the accrued value and apply it to a replacement aircraft within **36 months** of the sale. [S6] To unenroll Honeywell coverage for a sale, the operator sends a **signed Bill of Sale** to MSPContracts. [S1] JSSI gives the buyer the enrolled assets, pro-rata percentages, pricing and upcoming scheduled events. [S6]
- **Engine swap / rental engine:** the enrollment belongs to the asset (engine S/N), not the airframe slot. Honeywell has operators report hours flown on a rental engine separately while it is installed. [S1] RR and Honeywell provide loaner or rental engines for covered events. [S2, S8] *Inference: an enrollment record must be keyed to the asset serial number, and the app must record which airframe the asset is installed on, with dates. The public docs do not say how a permanent swap to a non-enrolled engine is handled. That is a question for the provider.*

## Candidate enrollment record fields

| Field | Why |
|---|---|
| Provider (JSSI, Honeywell MSP, P&WC ESP, RR CorporateCare, other) | Program owner |
| Program/tier name (e.g. MSP Gold, ESP Platinum, Tip-To-Tail) | Defines coverage |
| Contract / agreement number | Honeywell asks for it on any claim or dispute [S1] |
| Enrolled asset type (engine, APU, airframe, avionics/part) | Programs are per asset [S4] |
| Asset make/model, serial number, position | The enrollment follows the S/N |
| Currently installed on (tail number), with installed/removed dates | Engine swaps and rental engines |
| Enrollment / effective date | Starts the coverage |
| Hours/cycles at enrollment (TSN/CSN) | Basis for the buy-in or pro-rata calculation [S4, S6] |
| Buy-in status: full, pro-rata %, or deferred (Flex) amount | Determines who pays at the next event, and whether it transfers [S6, S9] |
| Hourly rate (and rate effective date) | Annual increases [S5] |
| Minimum annual hours (if any) | JSSI minimums; ESP has none [S5, S11] |
| Reporting frequency and due day (e.g. monthly, by the 10th) | Honeywell: 10th [S1] |
| Invoice due day (e.g. 15th) | [S1] |
| Term start, expiry / renewal date, auto-renew flag | Honeywell auto-renews annually [S2] |
| Transferable (Y/N), transfer notes | Sale handling [S2, S6, S7] |
| Provider contacts (CSM/RCM, contracts email) and portal URL | MyJSSI, MSP portal [S1, S6] |
| Coverage document attachment and exclusions (FOD, etc.) | Coverage is defined in the contract [S1] |

**Dates and recurring events to track:**

1. **Monthly hours report due** (the provider's day, e.g. the 10th), with a reminder to report and a "reported" status for each period.
2. **Invoice due** (e.g. the 15th).
3. **Contract renewal / expiry** (often annual with auto-renew), with a reminder ahead of the date.
4. **Annual rate-change effective date.**
5. **Minimum-hours true-up** (annual), where the contract has a minimum.
6. **Asset install/remove dates** (swap or rental engine).
7. **Sale-related deadlines:** unenrollment or transfer paperwork. For JSSI, the 36-month window to apply value to a replacement aircraft.

## Open questions (need a real contract)

- Exact penalties for late hours reporting or non-payment. These are not public.
- Whether hours or **cycles** (or both) are billed, by program and asset. Honeywell's portal takes TSN or usage hours [S1]. Cycle billing was not confirmed.
- What happens to an enrollment when an enrolled engine is permanently replaced by a non-enrolled one.
