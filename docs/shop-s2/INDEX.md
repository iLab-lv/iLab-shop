# S2 — Security, order lifecycle and technical reliability

Completed 2026-11-03 (Europe/Riga), locally on `home_design`, HEAD `6d6c37171f2328833f9bbb2772387955ddb92119`. Changes remain uncommitted. No staging, branch switch, deployment, live commerce mutation or Service repository edit occurred.

## Scope and preservation

This implements the remaining security/dependency prerequisites of **S0 Pass 1** and isolated lifecycle/PDF verification from **S0 Pass 2**. It does not replace the five-pass roadmap or complete catalog readiness. Redesign, SEO, new providers and business policies remain outside scope.

[Before manifest](evidence/before-manifest.json), `evidence/before-worktree.patch` and [S2 change manifest](evidence/change-manifest.json) distinguish S2 from existing recovery/S1 work. Existing S0/S1 screenshots and logs are preserved. Only their linked status documents are updated.

Used the configured Explorer, Implementer and Functional QA roles, with at most two concurrent subagents. Applied `webapp-testing`, official documentation research and the PDF skill. `web-design-guidelines` was not found in installed skill locations; existing repository rules guided the focused checks. No frontend redesign skill or storefront restyling was needed. Browser smoke was completed by the primary agent after the QA subagent became unavailable.

## Authentication and authorization

Firebase remains the identity provider. Cookie and bearer helpers verify tokens with revocation checking and reload the server-owned User profile. Active status and centralized permissions gate access; Staff retains its established Shop management permissions. Cart ownership comes from the verified UID, Order history queries that UID, and invoice download permits the active owner or authorized Staff/Admin before reading/generating PDF bytes. Browser-supplied UID, role, wholesale claims and prices do not grant authority.

Corrections:

- Session-cookie creation and deletion now require the existing same-origin check before changing cookies.
- Shared authentication errors and the session, profile, admin order-list, cart-resolution and invoice routes now consistently return `private, no-store` on their sensitive response paths.
- Malformed registration input returns controlled 400. Invoice outages return a useful 503 without Firebase diagnostics in the response.

Ten new behavioral security tests execute actual modules with isolated token, cookie and database adapters. They cover revoked/expired tokens, active/pending/disabled roles, forged profile fields, other-account isolation, owner-filtered history, and customer/cross-origin denial of admin mutations. These establish application behavior; they do not simulate every production SDK condition.

## Actual deployed rules: retrieved, not changed

The existing Admin SDK credentials safely retrieved the **currently applied** rules through `getFirestoreRuleset()` and `getStorageRuleset()`. No customer records were read. Evidence records the retrieval time, ruleset identifiers and SHA-256 hashes:

- [Retrieval record](evidence/deployed-rules-read.json)
- [Firestore source](evidence/deployed-firestore-rules.json): ruleset `5e89f999-300d-48ce-a25c-c720819482ff`, created 2026-04-11.
- [Storage source](evidence/deployed-storage-rules.json): ruleset `bcaa055b-f8c2-4567-9cb3-8ec3f0c8f9f2`, created 2026-09-18.

| Boundary | Deployed source result |
| --- | --- |
| Shop products/devices/types, carts, orders, invoices, settings and Users | No permissive match; recursive catch-all denies all direct browser reads/writes, including owners and client Admin identities. Approved operations go through server authorization and Admin SDK. |
| Public product images under `shop/products/**` | Public reads; all client writes denied. |
| Private invoice Storage paths | Catch-all denies client reads/writes. Authorized server streaming remains the access path. |
| Shared Service `modelServices`, `servicePricing`, `services`, `categories`, `devices` | Public reads and **writes allowed to any signed-in Firebase identity**, without role/status checks. |

**High-priority shared-project release finding:** normal Shop registration creates a Firebase identity in the same project. By the retrieved rule logic, that identity satisfies the Service collections' write condition. This is a source-proven authorization gap, not a production exploit test. Fixing it requires the Service/rules owner to define and deploy compatible permissions under separate authorization; S2 cannot modify the Service application or deployed rules.

No local Firebase configuration, rule ownership manifest, Java runtime or Firebase emulator was available. Consequently **no emulator rule tests ran**. The above matrix is review of actual deployed source, not executed production read/write probes. The cloud Rules test API was researched but not used because its documentation warns of production-resource involvement. IAM, other buckets/databases, Storage token/ACL configuration, indexes and complete runtime deployment security are not certified. Rule deployment ownership and isolated execution tests remain gates. Successful Admin SDK calls bypass these rules and are not evidence of client permission correctness.

## Orders and cart regression

Existing S1 transaction behavior remains: active authentication; current Product existence/status/positive retail prerequisite; entitlement-aware prices; bounded quantities and current stock; server-calculated total; fee/settings in the transaction read set; expected-total conflict; one UUID-owned Order, Invoice and Riga-year sequence; atomic stock deduction and purchased-cart subtraction. Missing-price/out-of-stock items cannot bypass eligibility via forged requests. Wholesale-only pricing does not bypass the retail prerequisite.

Six new lifecycle tests verify concurrent cancellation restores stock once, cancellation stays terminal, payment/status edits preserve invoices, deletion honors the explicit stock choice without rolling back sequence numbers, transaction failure preserves rows, all three fulfillment methods snapshot configured fees/VAT, stale fees reject checkout, and concurrent cart merges retain MAX quantities. Existing S1 tests retain guest/account association, account separation, stable operation replay, failed-sync preservation, registration observer deduplication, stale availability/price rejection and order replay coverage. Existing profile-save failure tests confirm a successful Order remains successful.

Concurrency tests use a serialized transactional double executing real server modules. They do **not** certify Firestore contention/retry behavior. No real orders, stock changes, account creations or saved-cart writes were performed.

Recovery limits retained explicitly:

- Network retries within the mounted Checkout reuse its UUID. A full page reload loses the in-memory request UUID; Account history is the recovery path after uncertain success. Durable interrupted-checkout recovery is not verified or newly implemented here. A coordinated pending-request/history flow needs a focused follow-up before claiming refresh-safe exactly-once UX.
- Permanent deletion spans Firestore and Storage. The current PDF-first deletion can be recovered by download if the database transaction fails, but concurrent generation/deletion can leave an orphan private file. No document resurrection occurs because PDF metadata uses `update`. Cross-service coordination remains unverified; no accounting-retention/deletion policy was invented.
- Account operations are transactional, but no realtime cross-device UI subscription exists. Recent retry receipts remain bounded to 100; shared-browser/offline stress beyond existing fixtures remains unverified.

## Invoice/PDF verification

The actual renderer generated **synthetic 1-, 18- and 100-line invoices**, totaling eight pages. All pages were rendered and checked for Latvian characters, SKU completeness, page bounds, totals and footer clearance. No real customer invoice was generated, fetched or sent.

Fixed a reproduced long-invoice footer collision by reserving space for the existing footer. A Storage object disappearing between existence check and download now recovers only for genuine 404; other failures remain controlled errors. Accounting snapshots, invoice numbers, VAT settings and payment terms are preserved. Existing ready PDFs are not bulk regenerated.

Thirteen added invoice tests cover actual service/route authorization and failures with mocked I/O, plus snapshot immutability. See [invoice findings](evidence/invoice-findings.md), [geometry/text metrics](evidence/invoice-verification.json) and [18-line sample](evidence/invoice-18/invoice-fixture.pdf). Actual Storage upload/download and SDK concurrency remain isolated-environment release gates.

## Notification and operating workflow

| Feature | Classification / verification |
| --- | --- |
| Customer in-place confirmation and Account history | Implemented; source and isolated route/order tests. Full authenticated production UI not exercised. |
| Invoice generation/download | Implemented and verified locally with actual PDF renderer plus isolated I/O tests; deployed private rule source inspected. Live integration unverified. |
| Admin Order queue/status/payment management | Implemented; authorization and lifecycle tests verify application behavior. |
| Inventory deduction/restoration and order identifiers | Implemented and verified in isolated transaction tests. |
| Bank transfer/cash processing | Intentionally manual; no payment gateway. |
| Customer/admin automated order email or push | Missing; no provider or sending path found. |
| Invoice/inquiry email | Intentionally deferred. |
| Manual queue monitoring and customer follow-up | Launch operating decision still required. |

The existing workflow can support a low-volume manual launch **only with an assigned owner and response schedule**, payment reconciliation and a process for failed PDFs. No automated notification infrastructure was introduced. No emails/messages were sent. Permanent accounting deletion/retention and credit-note requirements remain owner decisions.

## Dependencies

See [dependency review](DEPENDENCIES.md) and raw before/after audits. Next, `@next/env` and `eslint-config-next` moved together from **16.3.5 to 16.4.4** after official compatibility/security review. React 19.2.8 satisfies the target peer range. Existing caching flags and app architecture remain unchanged. Compatible transitive patches update sharp, node-forge, source-map-js, brace-expansion and Zod. No forced fixes, Firebase downgrade or major SDK migration was applied.

Production audit: **16 affected entries → 12**, with **0 critical, 4 high, 8 moderate** remaining. Those entries aggregate two remaining upstream dependency families; counts are not distinct exploitable application flaws. gRPC server advisories and UUID buffered v3/v5/v6 usage have no demonstrated reachable path in this app; affected packages still remain installed and are documented, not declared eliminated.

## Validation

- **261 automated tests passed**, zero failures/skips (S1 baseline 232; 29 added). [Output](evidence/tests.log).
- **Lint passed**. [Output](evidence/lint.log).
- **Production build passed** on Next 16.4.4. [Output](evidence/build.log). Existing font/catalog network access was required; no reproducible offline-build claim.
- Local guest browser smoke at **375 and 1280px**: checkout HTTP200, Login/Register toggle preserves seeded guest cart, Escape closes modal, no horizontal overflow or JS errors. [Results](evidence/browser-smoke.json). S1's existing five-width evidence remains preserved; unchanged storefront pages were not broadly re-audited.
- Direct local protected APIs returned 401 with private/no-store; cross-origin/missing-origin session mutations returned 403. [HTTP results](evidence/http-smoke.json).
- Real local PDF rendering plus isolated PDF/authorization/lifecycle tests; **no emulator rule tests**, no live authenticated commerce tests.
- Installation tree has no missing/invalid dependency errors. Optional sharp-WASM/runtime packages remain reported as extraneous; no destructive cleanup was performed.

## Files modified and next gate

S2 production changes: `package.json`, `package-lock.json`, `lib/auth/serverAuth.js`, `app/api/auth/session/route.js`, `app/api/users/me/route.js`, `app/api/admin/orders/route.js`, `app/api/cart/resolve/route.js`, `app/api/invoices/[orderId]/route.js`, `lib/invoices/invoiceService.js`, `lib/invoices/invoicePdf.js`. Fixture/test changes: `scripts/render-invoice-fixture.mjs`, `tests/invoice-model.test.mjs`, new `tests/invoice-service.test.mjs`, `tests/security-boundaries.test.mjs`, `tests/order-lifecycle.test.mjs`. Documentation changes are listed in the [manifest](evidence/change-manifest.json).

S2's authorized local audit, safe corrections and validation are complete; **production release is not approved**. Next, finish the original S0 Pass 1/2 gates: separately authorized shared-Service rule remediation; designated isolated Firebase role/transaction/Storage tests; durable interrupted-checkout and deletion/upload recovery; dependency deferral or SDK upgrade review; real launch assortment and operational/accounting ownership. Only then proceed to S0 Pass 3's approved storefront shell/catalog redesign. No next pass has begun.

## S2.1 follow-up — 2026-11-03

See [S2.1 release-gate report](../shop-s2-1/INDEX.md): durable checkout recovery and deletion/PDF coordination implemented, actual isolated Firebase integration/rule tests added, and least-privilege shared rules prepared. Production rule deployment remains OPEN; local tests do not close that exposure. Historical findings/evidence above remain as recorded at the original pass.
