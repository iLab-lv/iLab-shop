# Shop repository recovery ? 2026-10-31

Consolidation completed in the authoritative `C:\Users\info\Desktop\shop`. The duplicate remains intact. No deletion, staging, commit, branch switch, push, merge, deployment or production-data mutation was performed.

## Original Git states

| Item | Authoritative | Duplicate |
| --- | --- | --- |
| Folder | C:\Users\info\Desktop\shop | C:\Users\info\Desktop\website\iLab-shop |
| Origin | https://github.com/iLab-lv/iLab-shop.git | https://github.com/iLab-lv/iLab-shop.git |
| Branch | home_design | feature/redesign-integration |
| HEAD | 6d6c37171f2328833f9bbb2772387955ddb92119 | f05b9665c187c8ae0f6d435ceb08ae073c44a77f |
| Original working changes | 6 untracked export files/script; no tracked edits | 13 tracked edits and 1 untracked test |
| Remote-tracking comparison | 0 ahead / 0 behind origin/home_design | No upstream; 1 ahead / 0 behind local origin/main |

These are independent clones with separate Git directories. Their common ancestor is 6d6c371. The duplicate includes merge commit 292848b and one local documentation commit f05b966. Comparing committed trees against the common ancestor changes only docs/REDESIGN_MIGRATION.md. All refs and local branch histories are preserved in verified bundles; no remote fetch or remote-history changes were needed. Remote comparisons describe the existing local tracking refs, not a fresh GitHub query.

## Differences and consolidation manifest

- **Authoritative only:** scripts/export-shop-catalog.mjs, five catalog export files, .env.local and four ignored Firestore backup files. All remain byte-identical.
- **Duplicate only:** Pass 1B changes in eight app files, three existing documentation files, the migration tracker and the dock/drawer regression test (13 integrated files).
- **Present in both:** 45 byte-identical files and 246 files differing only by CRLF/LF. The latter were not copied. Dependencies, lockfile, Next /shop configuration, Firebase/server/auth/catalog/commerce code, migrations and assets have no substantive differences.
- **Conflict resolution:** no overlapping source edits. The duplicate .env.example changed an empty private-key placeholder into an invalid self-named value; retained the valid authoritative template and preserved the rejected version in the duplicate backup. No local environment files were transferred between repositories.
- **Excluded:** node_modules, .next, caches and generated coverage are regenerable and were neither integrated nor archived. Git was preserved through bundles and recovery metadata, never transplanted between checkouts.

Exact transferred files:

- app/components/shop/CartDrawer.js
- app/components/shop/CartDrawer.module.css
- app/components/shop/ContactPanel.js
- app/components/shop/ContactPanel.module.css
- app/components/shop/ShopCtaDock.module.css
- app/components/shop/ShopFullscreenPanel.js
- app/components/shop/ShopFullscreenPanel.module.css
- app/layout.js
- docs/architecture.md
- docs/design-system.md
- docs/file-map.md
- docs/REDESIGN_MIGRATION.md
- tests/shop-cta-dock-redesign.test.mjs

Additional recovery documentation edits: AGENTS.md and docs/README.md now identify the authoritative folder; docs/REDESIGN_MIGRATION.md retains its full recovered text with an appended recovery note; this report is new. No implementation refactoring was introduced.

## Pass 1B state

Recovered responsive CTA dock styling, Contact location tabs, Contact/Cart drawer presentation, shared overlay drawer variant, scoped Geologica font loading, production state bindings and the two regression tests. Checkout remains attached to its existing form, cart resolution remains server-authoritative, and live contact settings remain provider-owned. No static redesign data or auth/cart/checkout mocks were introduced.

The duplicate tracker says the Shop CTA Dock presentation is complete. Authenticated/populated valid-cart/order-request browser checks were still outstanding there. This recovery preserves that implementation and does not silently mark a whole redesign migration or those deferred flows complete. The invalid persisted-cart and guest access paths were verified here; no order/inquiry/account mutation was submitted.

## Verified recovery backups

Backup root: `C:/Users/info/Desktop/shop-recovery-2026-10-31T15-37-31-560Z`.

Each of authoritative/ and duplicate/ contains working-state.tar, state.json, worktree.patch, index.patch, all-refs.bundle, bundle-verification.txt and an extracted verified-working-state/. Git local configuration/index metadata is preserved separately in git-metadata/ for recovery only. The archives include all meaningful working files, untracked exports/tests and ignored local configuration/data backups; secrets were not printed or copied between shop folders. Keep these backups private because the authoritative archive includes .env.local and existing database backups.

All 314 authoritative and 305 duplicate files were extracted and SHA-256 checked against their original inventories. Both bundles passed git bundle verify. audit.json records original HEAD, branch, refs, recent/local commits, complete status, file names/sizes/hashes and environment filenames only. To restore working files, use the verified extraction; to recover history, clone the corresponding bundle into a new recovery location and apply the archived working state. Do not overwrite a live checkout blindly. Generated dependencies/build outputs can be recreated from the retained lockfile.

## Validation

| Check | Result |
| --- | --- |
| npm test | PASS: 204/204, no failures/skips |
| npm run lint | PASS: exit 0, no errors/warnings |
| npm run build | PASS: exit 0, all 10 static pages generated and dynamic routes compiled |
| Browser interaction regression | PASS: 45/45 checks; eight client-rendered routes; five widths |
| Direct HTTP follow-up | Home 200; guest Checkout 500 from pre-existing AuthControl SSR bug |
| Original authoritative files outside planned edits | PASS: 301 byte-identical |
| Duplicate working files | PASS: all 305 byte-identical |
| Integrated duplicate files | PASS: 13/13 (migration text preserved with appended recovery note) |
| Remaining valuable source exclusive to duplicate | NONE |
| Git refs, original branch/HEAD and empty index | Unchanged |

Browser checks used a temporary local production preview at 127.0.0.1:3107: /shop, live iPhone brand/model and product routes, /shop/account, /shop/checkout, /shop/admin and /shop/admin/products. Checked dock/contact/empty cart at 375/768/1024/1280/1600, true drawer widths, location switching, scroll locking, Tab containment, Escape/focus restoration, fullscreen Search, no horizontal overflow, guest checkout gate and admin login boundary. A private browser-only nonexistent persisted cart identity was resolved by the existing API, retained and blocked from checkout; only productId/quantity persisted. No production data was written. No browser runtime exceptions were recorded for the normal route checks.

**Pre-existing server-render defect found during final log review:** a fresh direct GET /shop/checkout returns HTTP500 because app/components/AuthControl.js:315 calls createPortal(modal, document.body) while checkoutIntent initializes its modal open during SSR. The browser subsequently renders the guest gate, which explains the passing visible interaction check; this is not a clean server response. AuthControl.js and CheckoutAuthGate.js match the original authoritative hashes exactly, and have only line-ending differences from the duplicate. The homepage control returns HTTP200. Evidence: http-followup.json and server-followup.log in the backup root. This is an outstanding production issue, not an integration conflict or a newly introduced change; it was documented without expanding this task into an auth refactor. The temporary preview was stopped.

Initial browser diagnostic: one test incorrectly expected a 560px Cart at 768px. Source correctly specifies full-width drawers below 1024px. The test expectation was corrected and all 45 checks rerun successfully with no app change. Both diagnostic and final JSON remain in the backup root. Screenshot evidence is contact-{375,1280}.jpg and cart-{375,1280}.jpg.

The authoritative environment allowed a complete build, resolving the duplicate's recorded missing-credentials build limitation. Authenticated/privileged administrative actions, valid populated-cart price changes and actual checkout/order/invoice creation were not exercised. Automated business/security tests pass; authenticated end-to-end verification remains a separate task requiring a suitable test identity/data. Runtime Google Fonts dependency/fallback remains the recovered design's existing behavior.

Detailed machine-readable evidence in the backup root: consolidation-manifest.json, integrated-files.json, final-verification.json, browser-validation.json; full tests.log, lint.log and build.log. Local server logs contain no intentionally exposed environment values.

## Final authoritative Git state

Origin remains https://github.com/iLab-lv/iLab-shop.git; branch home_design; HEAD 6d6c37171f2328833f9bbb2772387955ddb92119. The recovered work and this report are intentionally uncommitted, with no staged changes. The original export script/files and local ignored configuration/backups remain in place. The duplicate branch, refs, status and all meaningful files remain unchanged.

## Removal readiness and remaining path references

All valuable duplicate source is present in the authoritative tree, and all duplicate history/working files (including the rejected template) are preserved independently in verified backups. The duplicate is safe to remove **after review and explicit deletion approval**. It was not removed during this task.

AGENTS.md and docs/README.md now direct future Shop work to C:\Users\info\Desktop\shop. The migration tracker's branch labels are explicitly historical and its recovery note gives the actual current branch. The only duplicate-directory mentions in active Shop docs are recovery/history explanations. The export script's phrase "iLab-shop repository root" names the GitHub repository, not a hard-coded duplicate path, and is unchanged. No stale absolute duplicate path was found in the inspected Service docs/project instructions; historical evidence and external references are not rewritten.

This Codex session's originally opened workspace is still the separate Service folder. Open C:\Users\info\Desktop\shop as the workspace for future Shop passes, and repoint any manually configured IDE launch/task paths that still select the duplicate. The Service repository and read-only redesign reference were not modified. No automatic changes were made to global Codex settings.
