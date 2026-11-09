# S2.1 — Commerce release gates and Firebase security

Implemented locally on 2026-11-03 (Europe/Riga), branch `home_design`, HEAD `6d6c37171f2328833f9bbb2772387955ddb92119`. Changes remain uncommitted. No deployment, production commerce mutation, notification, payment, inquiry, or Service source edit occurred. Existing S0–S2 implementation and evidence are preserved; see [before manifest](evidence/before-manifest.json), `evidence/before-worktree.patch`, and [change manifest](evidence/change-manifest.json).

## Shared Firebase security

The [S2 deployed source](../shop-s2/evidence/deployed-firestore-rules.json) permits public reads and any authenticated identity's create/update/delete at exactly `modelServices/{docId}`, `servicePricing/{docId}`, `services/{docId}`, `categories/{docId}`, and `devices/{docId}`. Nested collections do not inherit that permission. This lets ordinary Shop identities alter shared Service catalog/pricing documents. This finding is based on retrieved rule source, not a production exploit.

The [proposed rules](../../firebase/firestore.proposed.rules) retain those public reads and deny direct client writes, including client Admin identities. Inspected Service mutations already use Admin SDK routes with verified, active Admin authorization. Shop sensitive data also uses authorized server APIs. Server Admin SDK operations bypass client rules; UI role visibility is not authority. No legitimate browser writer was found. See [consumer mapping, compatibility limits, rollout and rollback](FIREBASE_RULES_ROLLOUT.md).

**Production exposure remains open:** rules were prepared and tested locally, not deployed. The S2 snapshot is the latest retrieved production evidence; this pass does not certify current deployed rules, IAM, indexes, Storage ACLs/tokens, or uninspected consumers.

## Interrupted checkout

`lib/checkoutRecovery.mjs` persists only an account-scoped request UUID before POST. Storage failure prevents submission. Remount/refresh looks up that request through the owner-only, private/no-store `GET /api/orders/[orderId]`; the mounted browser URL includes `/shop`. A missing order retains the same UUID for retry, including a request still committing. A committed order restores its actual order/payment status even when its purchased cart lines are already gone. Session/error responses stop ordering and offer recovery guidance without discarding the request or cart. An expected-account assertion detects a session/account change; the verified server session remains authoritative.

The reference remains until explicit **Start another order**. Same-page submit locking and browser Web Locks coordinate request-ID allocation where available; Firestore retains the authoritative same-UUID transaction check. Existing price/stock/quantity/auth validation, atomic cart subtraction and invoice numbering remain unchanged. This is recovery for the same intended request, not deduplication of independently created purchase intents across devices.

Permanent deletion writes a minimal `shopOrderRequests/{UUID}` receipt containing owner UID, deleted status and timestamp in the deletion transaction. Delayed retries return controlled 410 instead of recreating the deleted purchase. Receipts contain no customer/accounting snapshot. They must not be automatically expired without defining the retry/retention contract; an owner-approved retention policy remains an operational decision.

## Invoice generation and deletion

PDF generation claims a Firestore lease (five minutes) and a unique private object path per generation. Competing generators receive controlled conflict responses; expired claims can recover. Upload checks and transactional finalization reject missing/deleting invoices or replaced claims, and late workers clean up only their own object. Deletion marks the invoice `deleting` before Storage cleanup, then atomically removes Order/Invoice and applies the existing explicit stock-restoration choice. Failed cleanup leaves a retryable deletion marker. Downloads recheck availability after fetching bytes. Known missing resources return 404, active conflicts 409, and unexpected outages controlled 503 through the existing authorized route.

Invoice number, buyer, items, VAT and totals remain immutable. Missing PDF metadata/object recovery does not allocate another invoice. Existing legacy invoice ownership remains supported. Tests cover deletion during render/upload/download, competing generation, missing metadata, cleanup retries and immutable snapshots.

Firestore and Storage are separate services. A process crash after an upload combined with deletion/cleanup failure can still leave an inaccessible private orphan object. This pass does not claim cross-service atomicity or introduce a cleanup service. Operators must reconcile residual private objects against invoice metadata after failures; accounting retention/credit-note policy remains a separate decision.

## Isolated Firebase environment

`npm run test:emulators` starts Auth (`127.0.0.1:9099`), Firestore (`8080`) and Storage (`9199`), runs tests, then shuts down. Configuration is `firebase.emulators.json`; project is **demo-ilab-shop-s21** with no production alias. `--running` is only for already running emulators. Tests refuse missing/wrong project or non-loopback hosts and external credential variables. The runner does not load `.env.local`; Admin credentials in the test harness are generated synthetic keys.

Dev-only tools: Firebase CLI 15.34.2 and rules-unit-testing 5.0.2. Java 21 is required. This machine uses ignored portable Temurin 21.0.13+9 in `.local-tools/java21`; archive SHA-256 `2332c0b4cff6bed722da3567c91d5e47568bcba863fa4945d0a8d6fc76158628`. No system Java installation or production dependency was added.

The ten emulator tests execute real Auth/Firestore/Storage SDK operations: synthetic sign-in/token verification/disabled-account rejection; account cart MAX merge/replay; order ownership, stale/missing prices, last-unit contention, cancellation, stock/idempotency; invoice upload/download/deletion/receipt; public Service reads and direct-write denial across anonymous/customer/other/admin identities; nested-path and Shop direct-access denial; private invoices/public product-image access. Invoice rendering is substituted with synthetic bytes in emulator tests; actual renderer evidence remains in S2. Application authorization/lifecycle unit tests use controlled adapters. Emulator Auth is not proof of production revocation behavior.

## Dependency follow-up

Production audit remains **12 affected entries: 0 critical, 4 high, 8 moderate**. All four high entries propagate the same gRPC family: `@grpc/grpc-js` 1.9.16 under Firebase 12.7.0, `@firebase/firestore`, `@firebase/firestore-compat`, and `firebase`. The implicated functionality is a gRPC server using certificate auth context/error handlers; this application uses Firestore clients, not a gRPC server. Patched authentication versions are 1.13.6/1.14.5; the parent pins the older family. Forced overrides, downgrade suggestions and a major Firebase migration were not justified. UUID 9.0.1 remains in Google clients using v4; the buffered v3/v5/v6 advisory has no identified application path. See [S2 reachability and upstream links](../shop-s2/DEPENDENCIES.md) and [current paths](evidence/dependency-paths.log).

Full tooling audit is **41 entries: 0 critical, 5 high, 36 moderate**, increased by emulator development dependencies. The fifth high entry is rules-unit-testing's propagated Firebase issue, not a new production path. Remaining tooling findings stay in the dependency risk register. No claim of zero vulnerabilities. Raw [production](evidence/audit-production.json) and [full](evidence/audit-all.json) reports retain affected ranges and advisory URLs.

## Validation and modified files

- **276 application tests passed**, zero failures/skips (S2 baseline 261; 15 added). These are unit and controlled-adapter tests, separate from emulators. [Log](evidence/tests.log). The final UI copy/style correction also passed all 15 focused recovery/contract tests. [Log](evidence/final-focused-tests.log).
- **10 actual Firebase emulator tests passed**, zero failures/skips; expected permission-denied messages are rejection assertions. [Log](evidence/emulator-tests.log). Test-only Auth/Firestore/Storage shut down after execution.
- **16 browser component scenarios passed** at 375px and 1280px, using the actual CheckoutClient, styles and Inter font with mocked providers/network. They cover refresh after commit with empty cart, same-ID network retries, missing-order recovery, GET/POST 401 and 410 gates, cancelled status and explicit new checkout. Controls/screenshots were reviewed; no horizontal overflow. This is not a full live authentication/browser journey. [Results](evidence/browser-results.json), [mobile recovery](evidence/browser-recovery-401-375.png), [desktop recovery](evidence/browser-recovery-401-1280.png).
- **Lint passed** after the final UI fix. Generated browser bundles live in ignored `.local-tools`, while test source is linted. [Log](evidence/lint.log).
- **Production build passed** on Next 16.4.4 after allowing its existing read-only Firebase catalog connection for sitemap generation; the initial sandbox attempt failed on that connection. [Log](evidence/build.log). No reproducible offline-build claim.

The regular suite excludes emulator tests intentionally; emulators have their own guarded command. Explorer, Implementer, Functional QA and Visual QA roles were used with no more than two concurrent subagents. Existing `webapp-testing` and focused frontend guidance supported validation; no redesign was introduced.

Production files: CheckoutClient, its CSS and server page; order POST and new owner GET route; checkout validation/recovery; `lib/shopOrders.js`; invoice service and download route. Infrastructure: package/lockfile, emulator runner/config/rules, `.gitignore`, ESLint generated-tool ignore. Tests: checkout recovery, invoice service/lifecycle/contract assertions, emulator harness, isolated browser harness. Documentation: this report/rollout, architecture/domain/file map, S0 issue/roadmap and S1/S2 follow-up links. The change manifest distinguishes these from earlier uncommitted work. No files from the baseline were deleted. Prior screenshots/reports remain intact; one old Chrome profile's volatile `CrashpadMetrics-active.pma` changed during the session and is recorded rather than overwritten.

## Remaining release gates and next pass

1. Rules owner approves compatible rollout, verifies other consumers, deploys proposed Firestore rules separately and verifies both apps. Until then the shared write exposure is unresolved.
2. Validate hosted session/cookie behavior and authorized commerce workflows in a separately approved isolated staging environment. Local emulator/component results do not certify production deployment.
3. Assign manual order/payment monitoring ownership, failure handling, retention and private-object reconciliation policy. No notification/payment provider was added.
4. Track upstream dependency patches; review an SDK migration separately if needed.

Recommended next work is the authorized rules rollout and staging release verification, followed by remaining catalog/operational readiness. Do not start the storefront redesign automatically.
