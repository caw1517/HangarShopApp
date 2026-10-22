# HangarShopApp

HangarShopApp is a multi-shop aviation maintenance tracking context covering calibrated and reference-only tools, shelf-life and stock consumables, aircraft and major component time readings, cost-maintenance program reporting, and physical/compliance audits.

## Tenancy & People

**Shop**:
An independent aviation maintenance organization whose locations, tools, consumables, fleet, programs, and audits are isolated from every other organization.
_Avoid_: Tenant, company, workspace, account

**Member**:
A person invited to a Shop with a single assigned Role and optional compliance designations within that Shop.
_Avoid_: Employee, staff record, profile

**Role**:
One of three baseline authority levels a Member holds in a Shop: `Admin` (shop manager), `Inspector`, or `Mechanic`.
_Avoid_: Permission group, user tier, access level

**Cal Designee**:
A Member explicitly authorized by a Shop Admin to verify calibration certificates, correct calibration entry errors, change tool classes, and sign the Monthly Calibration-Record Audit.
_Avoid_: Calibration inspector, quality approver, cal admin

**Designated Auditor**:
A Member trained and authorized by a Shop Admin to conduct and sign independent Facility Audits for areas and work they did not perform or supervise.
_Avoid_: Internal inspector, QA lead

## Locations

**Location**:
A named node in a Shop's physical storage hierarchy (`area`, `room`, `cabinet`, `drawer`, `shelf`, `toolbox`, or `kit`) that holds Tools, Lots, or child Locations, and may be flagged as mobile or assigned to a personal toolbox owner.
_Avoid_: Bin, warehouse, zone, station

**Unassigned Location**:
The built-in catch-all Location in every Shop that holds imported items with blank locations and items flagged as missing until they are placed in a physical Location.
_Avoid_: Lost and found, limbo, default bin, holding area

## Tools & Calibration

**Tool**:
A uniquely identified shop, personal, borrowed, or leased maintenance instrument tracked in the Shop's register.
_Avoid_: Asset, equipment item, device

**Calibrated Tool**:
A Class I precision Tool whose return-to-service measurement accuracy requires periodic traceable calibration and an active passing Calibration Event.
_Avoid_: Precision asset, Class A tool, gauged tool

**Reference-Only Tool**:
A Class II Tool permanently labelled `REFERENCE ONLY` that requires no periodic calibration and is prohibited from final or return-to-service measurements.
_Avoid_: Uncalibrated tool, shop-use-only tool, Class B tool

**Tool Status**:
The single lifecycle state of a Tool at any moment: `Serviceable`, `Pending verification`, `Needs cal`, `Out for cal`, `Overdue`, `Unserviceable`, `Missing`, `Retired`, or `Returned`.
_Avoid_: Tool condition, availability flag, cal state

**Calibration Event**:
An immutable historical record of a single calibration performed on a Calibrated Tool, capturing the calibration date, pass/fail result, next due date, calibrating vendor or person, certificate number, traceability standard, optional as-found condition, and attached certificate document.
_Avoid_: Cal log, inspection record, cert upload

**Due-Date Override**:
An audited adjustment on a Calibrated Tool that sets its effective next due date earlier than the certificate's due date (never later), used to apply a shorter shop or manufacturer interval.
_Avoid_: Cal extension, due-date edit, deferral

## Consumables & Shelf Life

**Consumable Item**:
A catalog definition of an expendable maintenance material identified by part number, nomenclature, stock unit, shelf-life tracking rules (`tracks_shelf_life`, default shelf life, `opened_life_days`, `extendable`), and optional minimum serviceable quantity.
_Avoid_: Part master, SKU, inventory product, supply item

**Lot**:
A specific received batch of a Consumable Item identified by a batch/lot/serial number, receiving traceability details, certificate document, expiry date, Lot Status, and quantity held at one or more Locations.
_Avoid_: Batch record, stock line, shipment, bin card

**Opened-Container Line**:
A child Lot line split from a parent Lot when a container with an opened-container life is opened, carrying an opened date and an effective expiry equal to the earlier of the parent Lot's expiry or `opened_date + opened_life_days`.
_Avoid_: Partial lot, active tube, dispenses record

**Lot Status**:
The single lifecycle state of a Lot or Opened-Container Line: `Serviceable`, `Quarantined`, `Expired`, `Depleted`, or `Disposed`.
_Avoid_: Material condition, stock state, shelf state

**Variance Adjustment**:
An append-only quantity ledger entry created from an applied Audit Finding that reconciles a Lot's live quantity to its physically counted quantity without overwriting prior draw or receiving entries.
_Avoid_: Quantity edit, stock overwrite, balance reset

## Usage & Traceability

**Usage Entry**:
An immutable log recording that a Member used a specific Tool or drew a quantity from a specific Lot at a timestamp, optionally linked to an Aircraft tail and work order number (mandatory with work order number for borrowed or leased Calibrated Tools).
_Avoid_: Checkout, issue ticket, consumption transaction

## Fleet & Cost-Maintenance Programs

**Aircraft**:
An airframe in the Shop's fleet identified by tail number, make/model, serial number, installed component positions, and active or inactive fleet status.
_Avoid_: Tail, vehicle, hull, plane

**Major Component**:
A standalone serialized `Engine`, `APU`, or `Propeller` that can be installed on an Aircraft position or held uninstalled (`Spare`, `At Overhaul/Repair`, `On Loan`, or `Retired`) while retaining its lifetime history across swaps.
_Avoid_: Rotable, sub-assembly, appliance, LRU

**Time Reading**:
An append-only dated utilization snapshot recording total hours and landings for an Aircraft, total hours and cycles for an Engine, or total hours for an APU or Propeller.
_Avoid_: Flight log, tach update, utilization counter

**Program Enrollment**:
A cost-maintenance contract (such as JSSI, MSP, or ESP) attached to a specific Major Component or Aircraft that tracks provider details, contract term, renewal lead time, and reporting schedule without storing financial rates.
_Avoid_: Warranty, service plan, maintenance subscription

**Hours Report**:
A logged submission of periodic utilization hours and cycles sent to a Program Enrollment provider for a specific reporting period.
_Avoid_: Utilization invoice, cycle filing, program log

## Audits, Labels & Onboarding

**Guided Location Audit**:
A spot-by-spot physical check starting at any Location node and walking its subtree to verify Tool presence/condition and count Lot quantities on a phone, online or offline.
_Avoid_: Cycle count, inventory walk, spot check

**Monthly Calibration-Record Audit**:
The monthly compliance review signed and dated by a Cal Designee covering all Calibrated Tools, due dates, pending certificates, overdue or long-missing tools, and borrowed/leased tool work-order entries.
_Avoid_: Cal checklist, monthly tool review

**Monthly Expired-Materials Check**:
The monthly documented compliance review signed and dated by an Inspector, Admin, or Cal Designee covering Expired Lots, soon-to-expire Lots, and Quarantined Lots.
_Avoid_: Shelf-life sweep, monthly hazmat check

**Facility Audit**:
A periodic (at least annual, never exceeding 24 months) independent audit of a Shop area signed by a Designated Auditor in which every checkpoint is marked `SAT`, `UNSAT`, or `N/A`.
_Avoid_: Shop inspection, annual QA walkthrough

**Audit Finding**:
An immutable observation captured during an audit (presence, count, damage/suspect flag, wrong location, or unrecorded item) that is synced from the auditor's device and never directly overwrites historical records.
_Avoid_: Audit edit, live count update

**Discrepancy**:
A formal `UNSAT` finding from a Facility Audit that requires documented corrective action by the facility and closure verification by a Shop Admin.
_Avoid_: Non-conformance ticket, CAR, issue

**QR Label**:
A durable physical tag printed for a Tool, Lot, or Location that encodes an opaque short URL (`/q/<code>`) alongside human-readable identification.
_Avoid_: Barcode sticker, asset tag, smart label

**Onboarding Flag**:
A temporary compliance marker (`needs_cert_attachment`, `onboarding_verify`, or `needs_cert_or_container_check`) placed on an existing in-date Tool or Lot during spreadsheet import so the Shop can operate on Day 1 while tracking missing certificate or container details to closure at the first audit.
_Avoid_: Draft import, incomplete record, temporary waiver
