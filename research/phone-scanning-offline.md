# What can a Next.js web app do on a phone for QR scanning and offline work?

Research for issue #6 (child of map #1). Researched 2026-10-20 against primary sources (MDN and its browser-compat-data, WebKit blog, Next.js docs, Chrome/web.dev docs, library READMEs). Claims not backed by a primary source are marked **(unverified)**.

## TL;DR

- **QR labels: encode a plain HTTPS URL.** Both phone OSes' built-in camera opens the URL with no app code at all. That covers "QR labels open records" for close to zero effort.
- **An in-app scanner, for the guided audit's "scan or tick" step, works on iOS Safari and Android Chrome.** Use `getUserMedia` for the camera plus a decoder. The native `BarcodeDetector` API is Android-only (Safari has it only behind a flag), so ship the `barcode-detector` WASM polyfill.
- **You can install it as a PWA.** Next.js has a built-in `app/manifest.ts`. On iOS, users install manually through Share > Add to Home Screen.
- **Offline capture is doable but is the big cost.** You need a service worker (Serwist) to load the app shell offline, an IndexedDB outbox for audit entries, and replay on reconnect. Safari has no Background Sync API, so replay happens when the app opens or comes back online. Install to the Home Screen on iOS, otherwise Safari's 7-day storage rule can wipe unsynced data.
- **Signature: use a canvas with `signature_pad` (MIT).** It's about a day of work, and the result can be stored as SVG/PNG or point data.

## 1. QR scanning

### 1a. Native camera opens a URL (no app code)

- iPhone: open the Camera, point it at the code, and a notification appears. Tapping it opens the link. ([Apple Support: Scan a QR code](https://support.apple.com/en-au/HT208843))
- Android: when a user follows a link inside an installed PWA's (WebAPK's) `scope`, **the installed app opens** instead of a browser tab, because "it will register a set of intent filters for all URLs within the scope of the app". ([web.dev: WebAPKs on Android](https://web.dev/articles/webapks))
- iOS: we found no documented equivalent. A QR URL opens in Safari, not in the Home Screen app, and Home Screen web apps keep their sessions/storage separate from Safari. So a technician scanning with the system camera may hit a logged-out Safari tab. **(unverified; test on a device)**
- Implication: label format `https://<app>/r/<recordId>` (or a short code). This is good for "open this record". For the audit flow, an in-app scanner avoids the context switch on iOS.

### 1b. In-app scanner

- Camera: `navigator.mediaDevices.getUserMedia` works only in **secure contexts** (HTTPS or localhost), always needs user permission, and gets the rear camera with `facingMode: "environment"`. It is Baseline "widely available". ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia))
- `getUserMedia` inside iOS Home Screen (standalone) web apps has worked since iOS 13.4. ([WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448))
- Decoding with `BarcodeDetector` (supports `qr_code`, secure context only, experimental, **not Baseline**). ([MDN BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)) Support per [browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json):
  - Chrome Android: 83+.
  - Safari / iOS Safari: 17+ **behind the "Shape Detection API" flag only**, so it is effectively unavailable to users.
  - Firefox: not supported.
- Libraries:
  - [`barcode-detector`](https://github.com/Sec-ant/barcode-detector): a polyfill/ponyfill of the same API built on ZXing-C++ WASM. MIT, active. It loads its `.wasm` from jsDelivr by default, so **self-host it** (via `prepareZXingModule`) to scan offline and to satisfy CSP. **Recommended.**
  - [`@zxing/library`](https://github.com/zxing-js/library): in maintenance mode ("we do not have the time to actively maintain zxing-js anymore").
  - [`html5-qrcode`](https://github.com/mebjas/html5-qrcode): in maintenance mode ("The author shall not be able to make any bug fixes"). Avoid both.

## 2. PWA installability

- Next.js App Router supports `app/manifest.ts` / `manifest.json` natively. Installing needs a valid manifest plus HTTPS. Next.js does **not** recommend a custom `beforeinstallprompt` button because it "does not work on Safari iOS". Show iOS users instructions instead (Share > Add to Home Screen). ([Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps))
- iOS 16.4+ Home Screen web apps with `display: standalone` open "like any other app" and can receive Web Push. ([WebKit: Web Push for Web Apps on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/))

## 3. Offline capture and later sync

### Building blocks

| Need | Mechanism | Source |
|---|---|---|
| Show "you're offline", retry navigations/Server Actions | Next.js `experimental.useOffline` + `useOffline()` hook (v16.x, experimental). It is detection plus retry only: no caching and no durable queue. | [Next.js useOffline](https://nextjs.org/docs/app/api-reference/functions/use-offline) |
| Load the app shell/pages with no network | Service worker. Next.js points to **Serwist** (`@serwist/next`, `app/sw.ts`, precache + `defaultCache`, offline fallback). It has separate webpack and Turbopack setup guides. | [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Serwist getting started](https://serwist.pages.dev/docs/next/getting-started) |
| Durable local store for audit entries, photos, signatures | IndexedDB (an outbox table). | WebKit storage policy below |
| Replay when back online | Background Sync `SyncManager`: Chrome 49+ / Android yes, **Safari and Firefox no** ([BCD SyncManager](https://github.com/mdn/browser-compat-data/blob/main/api/SyncManager.json)). Workbox/Serwist background-sync falls back to replaying "whenever your service worker starts up". Also replay from the page on the `online` event or app open. | [workbox-background-sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync) |

### Storage durability (the iOS risk)

- WebKit (Safari 17+/iOS 17) allows an origin quota of up to 60% of disk for browsers and up to 15% for other apps, with LRU eviction under pressure. `navigator.storage.persist()` exists (Safari 15.2+), but WebKit grants it "based on heuristics like whether the website is opened as a Home Screen Web App". ([WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [BCD StorageManager](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json))
- Safari deletes all script-writable storage (IndexedDB, Service Worker registrations, and so on) **after 7 days of Safari use without user interaction on the site**. Home Screen web apps "have their own counter of days of use", which resets with actual use. ([WebKit: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/))
- **Implication:** require installing to the Home Screen on iOS, call `persist()`, and sync eagerly. Never treat the device as the system of record.

### Conflict handling (design recommendation, not a sourced fact)

Audit capture is mostly **append-only**: one technician records a scan, tick, count, or note against a location/item at a time. That makes conflicts rare, so:

- Generate a client UUID per entry or audit session. The server upserts on that ID, so replays are idempotent.
- Store `captured_at` (device time) separately from `synced_at`.
- Treat completed audits as immutable once signed. If two devices touch the same item, keep both entries and surface them for review rather than doing last-write-wins.
- Avoid offline editing of shared master data (locations, item lists) in Release 1. Download it read-only before the audit starts.

## 4. Signature on a touchscreen

- [`signature_pad`](https://github.com/szimek/signature_pad) (MIT): canvas with smooth variable-width Bézier strokes. It exports `toDataURL()` (PNG/JPEG/SVG), `toSVG()`, and `toData()` point groups, and can reload them. Caveats: scale the canvas by `devicePixelRatio`, and resizing or rotation clears the canvas, so redraw from `toData()`.
- This works offline unchanged. Store the SVG or point data in the IndexedDB outbox with the audit.

## 5. Options with effort

| Option | What you get | Effort (rough) |
|---|---|---|
| **A. Online-only, URL QR labels, in-app scanner, signature** | Labels open records through the system camera. The audit flow scans in-app via `barcode-detector`. Signature via `signature_pad`. Fails without signal. | Low: ~2–4 days for scanner + signature + manifest |
| **B. A + installable PWA + offline shell** | Add Serwist precache/offline fallback, the iOS install prompt, `useOffline` banner. The app opens offline, but captures still need network. | +2–3 days |
| **C. B + offline capture with outbox sync** | IndexedDB outbox (Dexie or idb), idempotent server upserts, replay on open/online plus a background-sync queue on Android, pre-download of location item lists, sync-status UI, iOS Home Screen requirement. | +1.5–3 weeks, plus ongoing device testing |
| **D. Native wrapper (Capacitor) or native app** | Native scanner, reliable background sync, no Safari storage rules. | Out of scope for a "Next.js web app". Large. |

Recommendation for Release 1: **B**, with the data layer designed for C. Use client UUIDs and append-only audit entries now, so C can be added later without changing the schema. Pick C if hangars genuinely have dead zones (confirm with users).

## Open questions / to verify on device

- iOS: does a system-camera QR scan open Safari even when the Home Screen app is installed, and is the user logged out there? (Expected yes.)
- Hangar connectivity reality: is it no signal, or just flaky signal? Flaky favors B plus retries. No signal requires C.
- Camera permission persistence in iOS standalone mode across launches.
