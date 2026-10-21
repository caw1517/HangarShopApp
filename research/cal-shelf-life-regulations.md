# Tool calibration and shelf-life records at a Part 135 shop: what regulations expect

Research for issue #8 (child of wayfinder map #1). Researched 2026-10-20.

**Question:** What do regulations and FAA guidance expect of a Part 135 operator's tool calibration and shelf-life consumable records? Which fields and behaviours should a helper tool capture now so it doesn't block a later official-record mode?

## TL;DR

- **No regulation names fields for calibration or shelf-life records.** The rules require the *outcome*: the right tools, calibrated, and materials of proper quality. They leave the record format to the operator's manual, which must be "acceptable to the FAA". The detailed field lists come from guidance, mainly AC 145-9A and AC 43.13-1B.
- **Which Part 135 rules apply depends on seating.** Aircraft with **10 or more** passenger seats come under § 135.411(a)(2). For them, § 135.427(b)(5) *explicitly* requires the manual to contain "procedures, standards, and limits ... for periodic inspection and calibration of precision tools, measuring devices, and test equipment." Aircraft with **9 or fewer** seats come under § 135.411(a)(1), so Parts 91/43 apply. There the duty is the general one in § 43.13(a): use the proper tools and test apparatus.
- **Part 145.109(b) is the clearest reference standard.** Tools used to make airworthiness determinations must be "calibrated to a standard acceptable to the FAA". AC 145-9A expands this into a de-facto record schema: tool identity, calibration dates, standard used, method, actual readings, who calibrated it, the traceability chain, a recall process, and handling of work done with an out-of-tolerance tool.
- **Shelf life is guidance, not regulation.** The rules require materials of proper quality (§ 43.13(b); § 135.427(b)(2) on "improper parts or materials"). FAA guidance asks for a procedure to identify and control shelf-life items: cure/manufacture date, cumulative out-time for composites, and lot traceability for materials issued in smaller amounts.
- **Design implication:** model calibrated tools and shelf-life lots as first-class records, each with an immutable history. **Link every work-order task to the tool serials and material lots used.** That link makes an out-of-tolerance recall or an expired-material query answerable later. It is the one thing that cannot be added after the fact.

## 1. Regulatory basis (14 CFR, eCFR current as of 2026-10-01)

### 1.1 Which Part 135 maintenance rules apply

§ 135.411(a):
> "(1) Aircraft that are type certificated for a passenger seating configuration, excluding any pilot seat, of nine seats or less, shall be maintained under parts 91 and 43 of this chapter and §§ 135.415, 135.417, 135.421 and 135.422 ..."
> "(2) Aircraft that are type certificated for a passenger seating configuration, excluding any pilot seat, of ten seats or more, shall be maintained under a maintenance program in §§ 135.415, 135.417, 135.423 through 135.443."

Under § 135.411(b), an operator may *elect* the (a)(2) program even if it isn't required to.
Source: https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-J/section-135.411

**Consequence:** the explicit calibration-procedure requirement (§ 135.427(b)(5)) binds only 10+ seat operators, and operators that elect (a)(2). The shop's fleet seating decides which applies. This is an open question for the map.

### 1.2 Part 135, 10+ seats (§ 135.411(a)(2) program)

- **§ 135.425(b):** the program must ensure "Competent personnel and adequate facilities and equipment are provided for the proper performance of maintenance."
- **§ 135.427(b)(5):** the manual must include "Procedures, standards, and limits necessary for required inspections and acceptance or rejection of the items required to be inspected and for periodic inspection and calibration of precision tools, measuring devices, and test equipment."
- **§ 135.427(b)(2):** required inspection items include at least those that could endanger safe operation "if not performed properly or if improper parts or materials are used." This is the regulatory hook for material control.
- **§ 135.427(c):** the manual must provide a records system that retains a description of the work, the name of any outside person who did it, and "the name or other positive identification of the individual approving the work."
- **§ 135.427(d):** the maintenance part of the manual may be "in printed form or other form, acceptable to the Administrator, that is retrievable in the English language." Electronic records are permitted.
- **§ 135.439:** record-keeping and retention for aircraft records. Work records are kept until repeated or superseded, or for 1 year. Status records transfer with the aircraft. **No calibration or material record is named.**

Sources:
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-J/section-135.425
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-J/section-135.427
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-J/section-135.439

### 1.3 Part 135, 9 or fewer seats (Parts 91/43)

- **§ 135.21(a):** the operator's manual sets out its "procedures and policies acceptable to the Administrator" and is used by maintenance personnel. This is where a tool/material procedure would live.
- **§ 91.417:** owner/operator maintenance records cover a description of the work, the date, and the signature and certificate number of the approver. **No tool or material fields.**
- No Part 91/135 rule for this group specifically mentions calibration. The duty comes from Part 43 (next section).

Sources:
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-A/section-135.21
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-E/section-91.417

### 1.4 Part 43 (applies to everyone doing the work)

**§ 43.13(a):**
> "That person shall use the tools, equipment, and test apparatus necessary to assure completion of the work in accordance with accepted industry practices. If special equipment or test apparatus is recommended by the manufacturer involved, that person must use that equipment or apparatus or its equivalent acceptable to the Administrator."

**§ 43.13(b):**
> "... use materials of such a quality, that the condition of the aircraft ... worked on will be at least equal to its original or properly altered condition ..."

**§ 43.13(c):** for Part 121/135 operators whose OpSpecs require a continuous airworthiness maintenance program, the methods in the operator's maintenance manual "constitute acceptable means of compliance with this section." In other words, the operator's manual procedure *is* the compliance standard.

**§ 43.9(a):** maintenance record entries need only a description of the work, the completion date, the performer's name, and the approver's signature, certificate number, and certificate kind. **No requirement to record the tools or lots used.**

Sources:
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-43/section-43.13
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-43/section-43.9

### 1.5 Part 145 reference point (repair stations; not binding on a Part 135 operator's own shop)

- **§ 145.109(b):** "A certificated repair station must ensure all test and inspection equipment and tools used to make airworthiness determinations on articles are calibrated to a standard acceptable to the FAA."
- **§ 145.109(c):** tools must be "those recommended by the manufacturer of the article or must be at least equivalent to those recommended by the manufacturer and acceptable to the FAA."
- **§ 145.211(c)(1):** the quality control manual must describe procedures for:
  - (i) "Inspecting incoming raw materials to ensure acceptable quality"
  - (viii) "Calibrating measuring and test equipment used in maintaining articles, including the intervals at which the equipment will be calibrated"
  - (ix) "Taking corrective action on deficiencies"
- **§ 145.219(c):** records are retained for at least 2 years from return to service, "in a format acceptable to the FAA."

Sources:
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145/subpart-C/section-145.109
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145/subpart-E/section-145.211
https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145/subpart-E/section-145.219

## 2. FAA inspector guidance (Order 8900.1)

**Vol 3, Ch 32, Sec 11, "Evaluate a Maintenance Manual/Revision for a Part 121 or 135.411(a)(2) Program"** (8900.1 CHG 239, 1/2/13; the archived FSIMS copy was read because FSIMS has moved to DRS). It tells inspectors to check that the manual contains:
- "Procedures, standards, and limits for periodic inspection and calibration of precision tools, measuring devices, and test equipment" (para 3-3382 E.4 and F, citing § 135.427(b)(5)).
- Procedures "to ensure that maintenance personnel use proper parts and materials, including ... Receiving inspection; **Shelf time**; Preservation of parts; Parts identification system; and Disposition of failed parts" (citing § 135.427(b)).

**Vol 3, Ch 32, Sec 10, the § 135.411(a)(1) (9-or-fewer seats) manual evaluation** (CHG 531, 6/7/17). It has **no** calibration or shelf-time checklist item. It only suggests manual sections such as "Parts" and "Inspection procedures" and defers to manufacturers' technical manuals for "methods, technical standards, measurements, and operational test procedures."

Sources:
https://fsims.faa.gov/wdocs/8900.1/v03%20tech%20admin/chapter%2032/03_032_011.htm (read via web.archive.org; FSIMS no longer resolves, and current text is on https://drs.faa.gov)
https://fsims.faa.gov/wdocs/8900.1/v03%20tech%20admin/chapter%2032/03_032_010.htm (same)

## 3. Advisory circulars: the de-facto calibration schema

### 3.1 AC 145-9A, Guide for Developing and Evaluating Repair Station and Quality Control Manuals (10/6/17), §5.12

Written for Part 145, but it is the FAA's most detailed statement of what an "acceptable" calibration program looks like.

- **Traceability (5.12.3–5.12.4).** Calibration must be traceable to a standard acceptable to the FAA. That includes:
  - manufacturer standards
  - NIST
  - ISO/ILAC-accredited labs
  - another national authority

  "Each calibration provider between the recognized national standard ... to the measuring test equipment (each link in the chain) should be documented." The station "is ultimately responsible" for the traceability documentation, including when calibration is contracted out.
- **Intervals and retention (5.12.3).** Intervals are "usually established by the manufacturer or the repair station." Keep calibration records "for at least 2 years or the length of the calibration term, if greater than 2 years."
- **Equipment list (5.12.5).** List each item by "name, model or part number, serial number, date of calibration, and next calibration due date." Employee-owned tools used for airworthiness determinations belong in the program.
- **Controls (5.12.7).** Procedures should cover:
  - recall when due, and who (by title) is responsible
  - determining the calibration status of a new tool before it is placed in service
- **Record contents (5.12.8.1).** Each calibration record should include:
  - who calibrated it (by title if in-house, otherwise the entity)
  - date of calibration
  - next due date
  - standard used
  - method used
  - results
  - make, part number and serial number of the equipment used to perform the calibration
- **Actual readings (5.12.8.2).** "The results of the calibration should include the actual readings of the equipment at the test points. If the repair station intends to revise calibration intervals, pass or fail notations will not suffice. The calibration interval cannot be increased without sufficient recorded data points (calibration history) to justify a change."
- **Labeling (5.12.10).** Labels usually show:
  - serial number or other ID
  - date of last calibration
  - due date
  - name or initials of the calibrator

  "It is important that the equipment's serial number can be identified if the label is removed or lost."
- **Non-calibrated and limited-calibration equipment (5.12.11).** Equipment not used for airworthiness determinations must be identified as such. Limitations on partially calibrated equipment should be "clearly marked."
- **Checklist questions (5.12.12)** directly relevant to app behaviour:
  - (10) Is equipment removed from service when due?
  - (11) "a method to recall of the article(s) the measuring test equipment was used on if the measuring test equipment was out of tolerance during the calibration"
  - (12) handling of lost or overdue equipment
  - (13) results recorded at each test point
  - (16) equipment that must be calibrated before each use
  - (18) employee-owned tools
  - (19) acceptance of new equipment
  - (20–22) outside contractors and leased tools
- **Relocation (5.2.4.2).** "Some test benches and special equipment may require calibration/verification after relocation."
- **Shelf life (5.2.5 Q8; 5.10.7; 5.10.10).**
  - The manual should describe "how shelf life inventory is maintained" and "the method for handling, storing, and using shelf life items and materials."
  - On incoming inspection: "Does the material have any shelf life limitations? If so, the procedures need to address how the material will be identified and controlled."
  - Materials received in lots and issued in smaller units (e.g. "weld wire, NDT fluids and films, and coating powders") need procedures "that ensure traceability of the material back to the original lot."

Source: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_145-9A.pdf

### 3.2 AC 43.13-1B CHG 1, Acceptable Methods, Techniques, and Practices (9/27/01)

Applies to anyone doing Part 43 work, including 9-or-fewer seat Part 135 shops.

- **§12-71, avionics test equipment calibration standards.** Standards "must be derived from and traceable to" one of: NIST; the test-equipment manufacturer's standards; or, for foreign equipment, that country's standards if approved by the Administrator. NIST traceability "can be verified by reviewing test equipment calibration records for references to National Institute of Standards and Technology test report numbers." A calibration standard "cannot be used to perform maintenance."
- **§12-72.** "Test equipment such as meters, torque wrenches, static, and transponder test equipment should be checked at least once a year." "The accepted industry practice for calibration intervals is usually one year." Intervals take account of the manufacturer's recommendation and the facility's past calibration history.
- **§7-40a, torque wrenches.** "Calibrate the torque wrench at least once a year, or immediately after it has been abused or dropped." This is an event-driven recalibration trigger, not just a date-driven one.
- **Ch. 11 crimp-tool guidance (p. 11-69).** "The tool calibration and adjustments are make [sic] only by the manufacturer or an approved calibration laboratory."
- The AC also has scattered material-specific shelf-life and expiration notes, e.g. corrosion-treatment materials and emergency-equipment expiration dates.

Source: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_43.13-1B_w-chg1.pdf

### 3.3 AC 20-62E, Eligibility, Quality, and Identification of Aeronautical Replacement Parts (12/23/10)

- **Para 7.** Documentation accompanying parts may include "Shelf-life data, including manufacturing date or cure date."
- **Para 9.** For surplus parts and materials, "storage time, storage conditions, or shelf life ... are not usually known."
- **Para 10, "Condition for Safe Operation":**
  - "Parts and materials should be properly stored, protected, and maintained."
  - Composites: "Records must be maintained of the cumulative total of material out time to prevent exceeding shelf-life."
  - Dope, paint, sealants and adhesives "may have deteriorated due to age or environmental conditions ... and may require testing before use."
  - Parts with internal seals: "A procedure should be established for control of shelf-life items."

Source: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC%2020-62E.pdf

## 4. Implications for the helper app

These are inferences from the sources above. Fields marked **(core)** are needed to answer the questions an inspector or auditor would ask. The rest are cheap to capture and hard to reconstruct later.

### 4.1 Calibrated tool record

| Field | Source |
|---|---|
| Tool ID, name, manufacturer, model/part number, **serial number** (core) | AC 145-9A 5.12.5, 5.2.5 |
| Ownership: company / employee-owned / leased / borrowed | AC 145-9A 5.12.5, 5.12.12 Q18, Q21 |
| Calibration status: calibrated / calibrate-before-use / limited calibration (with limitation text) / no calibration required ("reference only") | AC 145-9A 5.12.10–5.12.11, Q16–17 |
| Interval: value, unit (days/months/uses), and basis (manufacturer / industry practice / history) | § 145.211(c)(1)(viii); AC 145-9A Q2; AC 43.13-1B 12-72 |
| Location / custody (crib, checked out to whom) | AC 145-9A 5.12.7 |
| State: in service / due / overdue / quarantined / out-of-tolerance / lost / retired | AC 145-9A Q10, Q12 |

### 4.2 Calibration event (append-only history; one per calibration)

| Field | Source |
|---|---|
| Date performed, next due date (core) | AC 145-9A 5.12.5, 5.12.8.1 |
| Performed by: in-house person/title, or vendor name + accreditation (ISO/IEC 17025 / ILAC) | AC 145-9A 5.12.3, 5.12.8.1 |
| Standard used and its own ID/serial; traceability reference (e.g. NIST test report number or cert number); attached certificate | AC 145-9A 5.12.4, 5.12.8.1; AC 43.13-1B 12-71c |
| Method / procedure reference | AC 145-9A 5.12.8.1 |
| **As-found and as-left readings per test point**, with tolerance (not just pass/fail) | AC 145-9A 5.12.8.2, Q13 |
| Result: in tolerance / out of tolerance (as found) / adjusted / failed-retired | AC 145-9A Q11 |
| Trigger: scheduled / dropped or abused / relocated / new-to-inventory acceptance | AC 43.13-1B 7-40a; AC 145-9A 5.2.4.2, 5.12.7 |
| Retention: at least 2 years or one calibration term, whichever is longer | AC 145-9A 5.12.3 |

### 4.3 Shelf-life material lot

| Field | Source |
|---|---|
| Material / part number, description, manufacturer, spec (core) | § 43.13(b); AC 145-9A 5.10.10 |
| **Lot / batch number** (core) | AC 145-9A 5.10.10 Q11 |
| Manufacture or cure date, expiry date, and expiry basis (manufacturer data / extended after test) | AC 20-62E para 7, 10d |
| Storage condition required (e.g. refrigerated range); for composites, **cumulative out-time** log | AC 20-62E para 10a |
| Receiving-inspection result, source/vendor, certs (CoC) attached | AC 145-9A 5.10.7, 5.10.10; 8900.1 V3C32S11 ("Receiving inspection; Shelf time") |
| Quantity received and issued (sub-lot issues keep the parent lot link) | AC 145-9A 5.10.10 |
| Status: serviceable / expiring / expired-quarantined / disposed | AC 145-9A 5.10.10 Q5, Q8 |

### 4.4 Behaviours that must exist from day one

1. **Link work to tools and lots.** Record which tool serials and which material lots were used on each work-order task, with timestamps. Without this link, the AC 145-9A Q11 out-of-tolerance recall ("recall of the article(s) the measuring test equipment was used on") is impossible. It cannot be backfilled later.
2. **Warn about, and later block, use of due, overdue, quarantined or expired items** when they are attached to a task. In helper mode a warning is enough. In official-record mode it would become a hard stop.
3. **Out-of-tolerance workflow.** When a calibration event records out-of-tolerance as found, list every task that used the tool since its last good calibration. Then record the disposition (re-inspected / no airworthiness impact, with justification).
4. **Recall/due reports.** Produce a list of items due in the next N days and overdue items (AC 145-9A 5.12.7; its sample procedure uses a monthly "Calibration Required" report).
5. **Keep history immutable and attributable.** Calibration events and lot records should be append-only, with the user identity and time on every change. § 135.427(c) wants "positive identification" of approvers. Official-record mode will need this, and it is cheap now.
6. **Make records retrievable and printable in English** (§ 135.21(g), § 135.427(d)). Allow export for FAA review (AC 145-9A 5.12.4: traceability records "should be made available for FAA review").

## 5. Open questions for the map

- **Seating.** Are any of the shop's aircraft 10+ passenger seats, or does the operator elect § 135.411(a)(2)? If so, § 135.427(b)(5) and the 8900.1 V3C32S11 checklist apply directly. If not, the shop's own § 135.21 manual governs and is the best place to look for actual intervals and procedures.
- **Existing procedures.** What does the operator's current manual (GMM/GOM) already say about tools and shelf-life items? The app should mirror the manual, not invent a parallel procedure (§ 43.13(c)).
- **Source currency.** AC 145-9A, AC 43.13-1B CHG 1 and AC 20-62E were the editions retrieved from faa.gov. Confirm on DRS that no newer edition exists before relying on them for official-record mode. The 8900.1 sections were read from archived FSIMS copies; check the current DRS text.
