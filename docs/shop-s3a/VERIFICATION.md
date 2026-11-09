# S3A.1 — Isolated Visual Verification

## Findings

The earlier `/shop` HTTP 500 was environmental. Firebase Admin initialized; the server-rendered public layout then failed when `getBrandDirectory()` read `shopDevices` from Firestore. The blocked connection returned `14 UNAVAILABLE` / `connect EACCES` to the configured Firebase host on port 443. `getPublicShopSettings()` already catches read failures, but the brand-directory read is required by the shell and its error propagates. The 500 is therefore a failed required data dependency, not a missing-credentials or authentication initialization defect. No production fallback catalog was added.

The route rendered HTTP 200 with synthetic Firestore fixtures in the `demo-ilab-shop-s3a-visual` emulator project. Synthetic Auth was used to enter the existing Admin dashboard. The emulator ended with one fixture product, zero orders and zero inquiries. No production project or data was accessed.

## Browser results

Standalone headless Chrome was controlled through its local DevTools Protocol using Node's built-in WebSocket. Playwright was not installed; the attempted development-only install was blocked by network egress, so no dependency was added. The reusable runner starts isolated Auth/Firestore emulators and the Shop dev server, seeds synthetic fixtures, runs Chrome, captures evidence, and cleans up its processes.

The installed `webapp-testing` workflow was used for the isolated run. This font follow-up also used the installed `web-design-guidelines` skill.

The public route rendered at 375, 1024 and 1440 CSS pixels. Header, footer, navigation links and light Shop theme appeared; measured document width did not exceed the viewport at any size. Service and terms links resolved to `https://ilab.lv/` and `https://ilab.lv/noteikumi`. Mobile navigation and Login opened; Cart, Contact and Search panels opened; Admin login reached the Dashboard. Admin kept Inter, rendered its own navigation, and did not include the public Shop header or footer.

In the original isolated run, the Google Fonts stylesheet request was denied and Shop rendered with fallbacks. This follow-up moved Geologica and IBM Plex Mono to `next/font/google`, matching the existing Inter loading approach. The production build succeeded and emitted local `.woff2` files with generated `@font-face` rules for both families, so normal Shop builds no longer depend on a browser request to Google Fonts. Admin remains on Inter. A separate headless font-render check could not complete because local Chrome timed out; the generated same-origin assets and CSS were verified from the build output.

The automated Cart-dismissal result was inconclusive; the user manually verified that the Cart drawer closes correctly. No drawer behavior was changed. No order, inquiry, payment or email was submitted.

Screenshots and machine-readable results are in [`evidence/`](evidence/): mobile 375px, breakpoint 1024px, desktop 1440px, and Admin dashboard 1440px. The captured files were opened for visual inspection; Admin retains its separate light layout and Inter typography.

## Reuse from Git Bash

From the repository root, run the single guarded command below. It does not read `.env.local` into the harness; all app Firebase settings are overridden with synthetic emulator values. It refuses to start if its required local ports are already occupied.

```bash
cd /c/Users/info/Desktop/shop
# Optional when Chrome is installed outside its default Windows location:
export CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/shop-s3a-visual.mjs
```

The runner starts the Auth emulator on `9099`, Firestore on `8080`, and Shop on `3000`; it uses a demo-only Firebase project ID. It captures screenshots under `docs/shop-s3a/evidence/` and stops its own browser/server/emulator processes on completion. Press `Ctrl+C` to abort. No separate emulator, server, credential, production seed, or browser-host session is needed. Requires the repository's installed npm dependencies, cached Firebase emulator/Java files, Node, and local Chrome/Chromium.

## Files and remaining work

S3A.1 adds the guarded Auth emulator URL option in `lib/firebaseClient.js`, the reusable runner `scripts/shop-s3a-visual.mjs`, this report, and the evidence files. It does not add a package dependency or change catalog/order behavior. Validation passed: `npm test` (276/276) and `npm run lint`. No production build was needed for this opt-in client emulator setting and test tooling.

S3A.1's Cart automation result is superseded by the user's manual confirmation. Typography now uses same-origin build assets; only a headless browser render check remains unavailable in this environment. No S3B catalog work was started.

## S3A.2 — Header correction

The approved `header-shop.html` and `components.css` define a sticky, solid-paper header with a full-width three-column grid: logo, adjacent Shop navigation, then service/account/search actions. At mobile widths the service switch sits beside the logo and Search/menu remain at the right. Shop's former header instead used a fixed dark glass frame, capped its inner row at 1440px, and kept desktop navigation hidden below 1200px, which made it read as a bounded legacy bar.

The Shop header now uses the reference grid without an inner max-width, switches to desktop navigation at 1024px, and keeps the Shop switch beside the logo on mobile. Navigation, auth, Search, mobile menu, locale-aware Service link, and the existing Cart/Contact dock were retained. The ShopShell top offset was removed because the header now participates in normal sticky layout. At 375px, 1024px and 1440px, static breakpoint/layout inspection confirms the mobile and desktop structures switch as intended, header content is full-width and unbounded, and the existing dock remains available. The isolated visual runner could not start in this environment (`listen EACCES` on `127.0.0.1:3000`), so no fresh browser screenshots or interaction claims are recorded.

Focused header tests passed (6/6) and `npm run lint` passed. The change is limited to `ShopHeader.js`, its CSS module, `ShopShell.module.css`, the Shop header variant in `AuthControl.module.css`, the focused header test, and this S3A note. No S3B work was started.
