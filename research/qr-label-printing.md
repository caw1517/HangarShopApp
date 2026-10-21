# How can a small hangar print durable QR labels from a web app?

Research for issue #5 (child of wayfinder map #1). Researched 2026-10-20.

## Short answer

A browser can't send jobs straight to a USB or network label printer. Every vendor needs something on the client, or a printer that connects out to a server. There are three realistic paths:

1. **Print a PDF** with the OS print dialog to a driver-installed label printer or to a laser printer loaded with durable sheet labels. This needs no vendor SDK and works anywhere a driver exists. It is the right starting point for Release 1.
2. **Vendor local agent + JS SDK** (Zebra Browser Print, Brother b-PAC + extension, DYMO Connect). This gives one-click printing with no dialog, but every workstation needs an install, and it ties the app to one vendor.
3. **Printer connects to the server** (Zebra Link-OS Weblink over WebSocket) or a **mobile URL-scheme app** (Brother Smooth Print). This suits a cloud app plus a phone, but costs more setup.

For durability, the strongest low-cost option is **Brother TZe laminated tape** on a P-touch printer: the print sits between layers. On Zebra printers, the equivalent is **polyester labels with a resin ribbon**. Plain direct-thermal paper (standard QL DK and LabelWriter rolls) is not suitable for tools.

## 1. Can a browser print to label printers directly?

| Vendor | Web mechanism | Client install | OS | Source |
|---|---|---|---|---|
| Zebra | **Browser Print**: JS library talks to a local Browser Print app. Bi-directional, so it can read printer status. Sends ZPL. | Browser Print app on the PC the printer is attached to | Desktop builds for Windows and macOS (USB + network); Android build (network + Bluetooth) | [Zebra by-request software page](https://www.zebra.com/us/en/support-downloads/printer-software/by-request-software.html), [Zebra dev blog](https://developer.zebra.com/blog/printing-websites-part-3) |
| Zebra | **Link-OS Weblink**: the printer opens a TLS WebSocket *out* to your server, and the server pushes ZPL down the raw channel. No PC agent. | None on the client. Printer is configured once. Needs a Zebra-signed certificate. | Any (printer-side) | [Weblink WebSocket endpoint config (Zebra techdocs)](https://techdocs.zebra.com/link-os/2-14/webservices/content/Weblink%20WebSocket%20Endpoint%20Configuration.pdf), [Link-OS SDK for Webservices](https://developer.zebra.com/blog/using-link-os-sdk-webservices-print-websites), [Zebra web printing app note](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/application-notes/zebra-web-printing-solutions-app-notes.pdf) |
| Brother (PT / QL / TD) | **b-PAC**: COM component fills P-touch Editor templates. Browsers reach it through the **b-PAC Extension** (Chrome/Edge/Firefox). | b-PAC client + printer driver + extension | **Windows only** | [b-PAC how-to](https://support.brother.com/g/s/es/dev/en/bpac/use/index.html?navi=offall), [b-PAC Extension (Chrome Web Store, "Windows only")](https://chrome.google.com/webstore/detail/ilpghlfadkjifilabejhhijpfphfcfhb), [b-PAC web app guide (PDF)](https://support.brother.com/g/s/es/htmldoc/dev/bpac_webapplication_eng.pdf) |
| Brother | **Smooth Print**: a phone app. The web app calls a URL scheme with field values, and the app fills a template downloaded from your HTTP server, then prints over Wi-Fi/Bluetooth. | Smooth Print app on iOS/Android; templates authored on a Windows PC | iOS, Android | [Smooth Print dev page](https://support.brother.com/g/s/es/dev/en/specific/smooth_print/index.html), [Smooth Print manual](https://support.brother.com/g/s/es/htmldoc/smoothprint/) |
| Brother | Mobile SDK (iOS/Android) and raw command references | Native app only | iOS, Android | [Brother developer index](https://support.brother.com/g/s/es/dev/en/index.html) |
| DYMO | **DYMO Connect Framework** JS SDK (`getPrinters`, `printLabel`, `renderLabel`) talks to DYMO Connect desktop software. Labels are XML (`.dymo`/DLS). | DYMO Connect software | Windows, macOS | [dymosoftware/dymo-connect-framework](https://github.com/dymosoftware/dymo-connect-framework) |
| Any with a driver | Generate a PDF/HTML at exact label size and use `window.print()` / the OS dialog. | Vendor driver only | Any OS with a driver | (standard browser behaviour) |

Takeaways:
- **No vendor offers a zero-install browser path.** The pattern is always either a local agent or a printer that phones home.
- Brother's desktop web path is **Windows only**. Zebra and DYMO agents also run on macOS.
- **Printing a PDF through the driver** is the lowest-friction, vendor-neutral baseline. The trade-off is a print dialog, and the user has to get scale and media settings right ("actual size", correct tape or label size). The app should render the PDF at the exact label dimensions.
- Community wrappers exist (`bpac-js`, `zebra-browser-print-wrapper`). They still need the vendor agent installed.

## 2. Sheet labels (no special hardware)

- Avery sells laser-printable **polyester/film "UltraDuty"** sheets, marketed for GHS chemical labels. Avery says they resist chemicals, abrasion, UV, water and extreme temperatures, and stay adhered 90+ days in seawater ([Avery UltraDuty GHS, e.g. 60501](https://www.ontimesupplies.com/ave60501-ultraduty-ghs-chemical-waterproof-and-uv-resistant-labels-85-x-11-white-50-box.html), reseller listing of Avery claims).
- Pros: uses the office laser printer, and any web app can produce a PDF on the sheet's template grid.
- Cons: the print is **laser toner on the face with no overlaminate**, so it is less abrasion-proof than laminated tape or resin thermal transfer. Sheet layouts waste labels when you print one at a time. The smallest common die-cut sizes are still large for small tools.
- Good fit for **consumable lots**: bins, shelf tags, kits and cans, where the label is not handled constantly.

## 3. Label materials that survive shop conditions

| Option | Construction | Manufacturer durability claims | Source |
|---|---|---|---|
| **Brother TZe laminated tape** (P-touch PT printers) | Thermal-transfer print sealed under a clear laminate | Resistant to abrasion, chemicals, water, UV. Brother cites -80 °C to 150 °C. Extra-strength-adhesive (TZe-S) versions are tested against chemicals and suit rough or textured surfaces. Oil and solvent coverage is **not itemised** on the product page. | [Brother TZe-S251](https://www.brother-usa.com/p/label-tapes/TZES251G), [Brother TZe-S631](https://www.brother-usa.com/p/label-tapes/TZES631G) |
| **Zebra Z-Xtreme 5000T polyester + Image Lock resin ribbon** | White matte polyester, permanent acrylic adhesive, resin thermal transfer | -40 °F to 300 °F. Chemical resistance tests listed include gasoline, transmission fluid, hexane, denatured alcohol, engine coolant and motor oil. | [Z-Xtreme 5000T spec sheet](https://www.zebra.com/content/dam/zebra_dam/en/spec-sheets/z-xtreme-5000t-spec-sheet-en-us.pdf), [Image Lock resin spec sheet](https://WWW.ZEBRA.COM/content/dam/zebra_dam/en/spec-sheets/image-lock-resin-spec-sheet-en-us.pdf) |
| Zebra 8000T Ultra Tuff / PolyPro 4000T | Polypropylene | "Resistant to many solvents as well as alcohol, mild cleaners" | [8000T Ultra Tuff spec](https://www.zebra.com/content/dam/zebra_dam/en_gb/spec-sheets/8000t-ultra-tuff-240-tag-spec-sheet-en-gb.pdf) |
| DYMO LabelWriter "Durable" | Direct-thermal polypropylene | Resists moisture, oils, common solvents and cleaners. Operating range is only about -18 to 50 °C. | Reseller listings of DYMO 1933085 / 2112283 (no first-party page found) |
| Brother QL DK film (DK-22211, DK-22113) | Direct-thermal film | Marketed as "durable film". No chemical claims found. | Reseller listings |
| Plain direct-thermal paper (QL DK paper, LabelWriter paper) | Paper | Not suitable: heat- and solvent-sensitive | — |
| Pre-made metal / anodised / ceramic tags | Bought from a tag vendor, not printed in the shop | This is what commercial asset-tracking vendors sell for harsh environments | See section 5 |

Notes:
- **Neither Brother nor Zebra publishes Skydrol / phosphate-ester hydraulic fluid or MEK results** in the pages reviewed. If labels will sit near Skydrol, test them in the shop before committing.
- Resin ribbon plus polyester (Zebra) or laminated TZe (Brother) are the two print-it-yourself tiers that hold up in a hangar.

## 4. Minimum QR size for tiny tool surfaces

From the standard and Denso Wave (the inventor of QR Code):
- The symbol needs a **4-module quiet zone** on every side (ISO/IEC 18004).
- Denso Wave recommends that **each module be 4 or more printer dots** for stable reading. It says to pick the module size from the scanner's reading limit, and that higher density is "useless if the reading limit of the scanner is exceeded" ([qrcode.com, module size](https://www.qrcode.com/en/howto/cell.html)).

Module size at 4 dots per module:

| Printer resolution | 1 dot | Module (4 dots) | Version 2 symbol + quiet zone (33 modules) |
|---|---|---|---|
| 180 dpi | 0.141 mm | 0.56 mm | about 18.6 mm |
| 203 dpi (common Zebra desktop) | 0.125 mm | 0.50 mm | about 16.5 mm |
| 300 dpi | 0.085 mm | 0.34 mm | about 11.2 mm |
| 360 dpi (Brother PT-P900W/P950NW) | 0.071 mm | 0.28 mm | about 9.3 mm |

PT-P900/950 print at 360 dpi on tapes up to 36 mm, and the printer has built-in QR and Data Matrix support ([PT-P900 series brochure](https://datacapturesolutions.com/customer-content/www/products/files/DataCapture/Brother%20-%20PT-P900%20Series.pdf)).

Design guidance for the app:
- **Keep the encoded payload tiny so the version stays low.** Encode a short URL with a short ID, e.g. `HTTPS://X.APP/T/7K3QX9`. Uppercase letters, digits and `/:.` keep the encoder in the more compact alphanumeric mode. Version 1 is 21×21 modules and Version 2 is 25×25 (see the Denso Wave version table). Don't encode tool data in the label: the label should only point to the record.
- **Phone cameras need bigger modules than industrial imagers.** Treat about 0.4 to 0.5 mm per module as a practical floor for reliable phone scanning. This is engineering judgement, not a standard figure, so verify it with the shop's actual phones. On that basis, plan for a **QR of roughly 13 to 17 mm square including the quiet zone**. That fits 18 or 24 mm TZe tape but not 9 or 12 mm.
- **Micro QR is not an option for a phone-camera / web workflow.** The browser `BarcodeDetector` format list includes `qr_code` and `data_matrix` but no Micro QR ([W3C/WICG Shape Detection API](https://wicg.github.io/shape-detection-api/)). Vendor material says native camera apps don't read it either ([Scandit Micro QR](https://www.scandit.com/products/barcode-scanner/symbologies/micro-qr-code/)).
- **Very small tools** (feeler gauges, small torque screwdrivers, pin gauges): label the **case, pouch or a tie-on flag tag** instead of the tool. A laminated TZe "flag" wrapped around a handle with the QR on the tab is the common workaround. Keep the human-readable tool ID on the label as a fallback, because existing laser-etched serials stay authoritative.

## 5. What existing aviation tool-tracking products do

- **itemit** (sold to MROs and airlines) supplies its own **pre-made heavy-duty QR tags and ceramic RFID tags** rather than relying on customer printing ([itemit aviation](https://itemit.com/asset-tracking/aviation/)).
- **GoCodes** markets **metal QR tags** for aerospace equipment ([GoCodes](https://gocodes.com/manage-your-aerospace-equipment-using-metal-qr-codes-and-an-app)).
- **MROTools.io** (QOCO) supports barcode/QR labels, RFID and smart cabinets ([Capterra listing](https://www.capterra.com/p/10020242/MROTools-io/)).
- **Snap-on Level 5 / L5 Connect** and similar tool-control systems rely on **laser-etched serials**, shadow foam and RFID rather than printed labels ([Aviation Week](https://aviationweek.com/mro/marketplace/tooling-tech-advances-simplify-mro-tool-tracking), [NBAA](https://nbaa.org/news/business-aviation-insider/2025-11/consider-these-tool-control-tips-for-safer-aircraft-maintenance/)).

The pattern in this market: **buy durable pre-made tags** for the tool itself, with a QR or serial that the software links to the record, and **print in-house only where turnover is high** (consumable lots, kits, bins). Those last are secondary sources (vendor marketing and trade press). They are adequate for "what do products do" but not for technical claims.

## Options for Release 1

| Option | Hardware | Web integration effort | Durability | Fit |
|---|---|---|---|---|
| A. **PDF at label size, printed via OS dialog** | Any driver-installed label printer, or a laser printer with durable sheets | Lowest: server renders PDF/SVG | Depends on media | **Recommended baseline**: vendor-neutral, works on any OS |
| B. Brother P-touch (PT-P900W/P950NW or smaller) + TZe laminated, via PDF/driver | About US$300–600 printer + tape | Same as A | High (laminated) | **Recommended media for tools** |
| C. Zebra desktop TT + polyester + resin, via Browser Print or Weblink | Zebra TT printer + ribbon | Medium: ZPL templates, agent or Weblink cert | Highest of the printable options; documented oil and fuel resistance | Upgrade path if the dialog step or volume becomes a pain |
| D. Avery UltraDuty sheets on an office laser | None new | Same as A (template grid) | Medium (unlaminated toner) | Consumable lots and bins |
| E. Pre-printed metal / anodised QR tags bought in batches | None | App only maps tag ID to record ("claim a tag" flow) | Highest | Long-lived calibrated tools |

Implication for the data model: if the app supports **"claim a pre-printed tag"** (scan an unassigned code and link it to a record) as well as **"print a label for this record"**, both A/B/C and E work without redesign. Either way, the QR should encode only a short opaque ID URL, never tenant data.

## Open items to verify hands-on
- Read reliability of the shop's phones at 0.28 / 0.34 / 0.5 mm modules on TZe and polyester.
- Resistance of TZe and polyester to Skydrol and MEK (not published by the manufacturers).
- Whether the shop's workstations are Windows (needed for the Brother b-PAC path) or mixed.
