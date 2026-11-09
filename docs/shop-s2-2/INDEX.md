# S2.2 — Firebase rollout preparation and hosted verification

2026-11-03 (Europe/Riga). **Ready for an explicitly authorized production rules rollout, based on the emulator-verified plan.** The owner confirmed no separate hosted staging project exists and both applications use `ilab-v2`. Hosted staging is deferred and is not a prerequisite for storefront redesign. Hosted runtime compatibility and operator permissions remain unverified limitations. This recommendation is preparation only: deployment and every live Firebase modification remain prohibited without separate explicit authorization.

Shop remains on `home_design`, HEAD `6d6c37171f2328833f9bbb2772387955ddb92119`, origin `https://github.com/iLab-lv/iLab-shop.git`. Service was inspected read-only at `feature/redesign-integration`, HEAD `ea79068ddc72110b66ab1f38ae698a343b80fbdc`, origin `https://github.com/iLab-lv/iLab.git`. No application code, dependency, production data/configuration, deployment or Git staging was changed. [Before manifest](evidence/before-manifest.json) and [change manifest](evidence/change-manifest.json) preserve the existing S0–S2.1 work. Explorer, Functional QA and a scoped test Implementer were used, at most two concurrently.

## Environment inventory

| Environment | Project/backend evidence | Confidence and limits |
| --- | --- | --- |
| Production Service `https://ilab.lv` | Public `/admin/login` JavaScript contains `ilab-v2`, auth domain `ilab-v2.firebaseapp.com`, bucket `ilab-v2.firebasestorage.app`. Public homepage/pricing/login GETs returned 200. | Client build verified by public GET. Hosted server credentials/environment and deployment source revision were not exposed or independently attested. |
| Production Shop `https://ilab.lv/shop` | Public client bundle contains the same project/domain/bucket. HTTP 200. | Client configuration verified; hosted server environment requires operator attestation. |
| Direct Shop host `https://i-lab-shop.vercel.app/shop` | Same Firebase identifiers and client chunk as the public Shop proxy; HTTP 200. | **Not isolated staging**. A separate hostname is not a separate backend. |
| Local Shop and Service | Each `.env.local` has server `FIREBASE_PROJECT_ID` and client `NEXT_PUBLIC_FIREBASE_PROJECT_ID` equal to `ilab-v2`, with the same public domain/bucket. | These development configurations target production. Values were read with an identifier-only allowlist; credentials were not logged. |
| Local integration suite | `demo-ilab-shop-s21`; Auth 9099, Firestore 8080, Storage 9199, all loopback. | Guarded emulator-only fixtures; no `.env.local` loading. |
| Hosted staging / other previews | Owner confirmed no separate hosted Firebase staging environment has been created; both apps use `ilab-v2`. | Staging creation/verification is deferred. Other preview configurations are not independently inventoried; never assume a preview is isolated. |

[Public environment evidence](evidence/public-environments.json) and [local identifier inventory](evidence/local-environments.json) record only GET statuses, asset paths and non-secret identifiers. The Firebase/rules owner and hosting environment owner still need to confirm production server project IDs, billing/project ownership, preview backend assignments and staging isolation. Possession of a read-capable credential is not rollout approval. Firebase recommends a separate project for each environment; do not treat a preview connected to production as staging. [Official guidance](https://firebase.google.com/docs/projects/dev-workflows/overview-environments).

## Fresh deployed rules and compatibility matrix

Read-only Admin Security Rules retrieval at **2026-11-03 15:05:34 UTC** confirms both rulesets still match S2 byte-for-byte. [Record](evidence/current-rules-network/record.json), [full Firestore source](evidence/current-rules-network/firestore.json), [full Storage source](evidence/current-rules-network/storage.json). Initial sandbox network denial was resolved by permitting only this read. No Firestore documents/customer records were queried for this backup.

| Root path | Current → proposed client access | Legitimate readers and writers; impact |
| --- | --- | --- |
| `modelServices/{docId}` | Public get/list; any signed-in write → public get/list; no client writes | Service `lib/pricing/getModelPricing.client.js` and `BrandPickerPricelist.jsx` read legacy model pricing. No current client writer found; newer pricing writes use the server route below. Shop customers lose unauthorized mutation access. Legacy external writers require owner inventory. |
| `servicePricing/{docId}` | Same | Service `PricelistScreen.jsx` reads; `/api/admin/pricelist` writes via Admin SDK after active Admin session/profile authorization. Preserved in emulator. |
| `services/{docId}` | Same | Service repair-services/pricelist screens read; `/api/admin/services` saves, reorders and deletes through the same authorized server path. Preserved in emulator. |
| `categories/{docId}` | Same | Service admin screens and `lib/content/categories.js` read; `/api/admin/categories` writes through server Admin SDK. Embedded brands/series arrays are document fields. Preserved in emulator. |
| `devices/{docId}` | Same | Service pricelist UI and `lib/content/{devices,catalogDevices}.js` read; `/api/admin/devices` creates/renames/deletes via server Admin SDK. Preserved in emulator. |

All five allow create/update/delete to any authenticated identity today; proposed rules deny those direct operations for everyone, including client Admin claims. Actual Service authorization requires **active Admin** in `users/{uid}` after verified session-cookie identity; Staff, Partner, Customer and inactive profiles cannot mutate these routes. No role/body claim substitutes for server authorization. Shop sensitive operations use its existing permission helpers and Admin SDK. No direct Shop writer to these Service collections was found.

Exact root matches do not grant nested access. The recursive catch-all denies everything else and there is no broader permissive overlap. [Configuration review](evidence/configuration-review.json) verifies the only semantic Firestore change is the five write conditions; public reads remain identical. The proposal file itself was not changed in S2.2.

Service locations/configuration (`settings/site`), review data (`places`), FAQ and cron processing use server Admin SDK paths; they remain outside the five exposed roots and directly denied by the catch-all. `/api/reviews` mutations are Admin-gated. Booking submission sends email through `/api/booking`; it was not submitted. The pricelist's `models` fallback is already client-denied by the current catch-all, so this is not a new restriction. No observed workflow needs broad client writes. Older deployed code or external scripts remain a compatibility risk until the owner checks them.

## Storage

Current rules and the local fixture are semantically identical: public reads under `shop/products/**`; all client writes and all other reads/writes denied, including private invoices. **No Storage change or Storage rollback is planned.**

Shop image POST/DELETE routes authorize `MANAGE_CATALOG` and same-origin before Admin SDK operations. Upload accepts declared JPEG/PNG/WebP, nonempty and at most 5 MiB, then writes a UUID object path. Deletion validates the path and rejects files still referenced by Products. Replacement creates a new file and updates the Product reference; clients do not overwrite objects directly. This remains compatible with unchanged rules. MIME checking is not byte-signature verification, and the size check follows multipart parsing; those existing S0 hardening items are not fixed here. Invoice PDFs use authorized server streaming and private Storage paths. Raw Storage client requests remain denied even to an invoice owner.

## Validation

- Baseline emulator suite: **10/10 passed**. Independent inspection found that the earlier five-root test covered anonymous/customer only, despite broader S2.1 prose. S2.2 expands it to anonymous/customer/different-customer/Admin, each get/list plus denied create/update/delete and nested access.
- Final emulator suite: **12/12 passed**, zero skips/failures. New tests load the actual read-only Service session module, policy and four admin routes; real Auth emulator session-cookie creation/verification, Firestore profiles, catalog/pricing writes and authorization denials execute. Only Next request-cookie access and JSON-response wrappers are adapted. They are not hosted HTTP/browser tests. [Final log](evidence/qa-emulator-final.log).
- Existing Shop emulator tests retain cart ownership/MAX merge, order ownership/idempotency/stock transactions, cancellation, invoice upload/download/deletion and private Storage access. Added checks deny product-image overwrite/delete and invoice delete across all four client classes, and direct access to deletion receipts, Service settings and reviews. PDF rendering uses synthetic bytes here; actual rendering evidence remains S2. Admin Shop product/image route execution itself is still source/unit coverage, not newly certified end-to-end emulator coverage.
- Authorization **9/9** and security-boundary **10/10** focused tests pass using controlled adapters. The final complete application suite passes **276/276** after the loader change. [Application log](evidence/application-tests.log).
- **Lint passed**. No production build was repeated: changes are test utilities, read-only audit scripts and documentation; S2.1's passing build remains historical evidence. No production behavior changed.
- Full-source backup extraction hashes match; Storage semantics match; Firestore comparison confirms only the five intended write permissions differ. The four Git Bash rollout/rollback command blocks pass syntax-only `bash -n`; no command in those blocks was executed by that check. Deploy/rollback operations remain unexecuted. Emulators shut down cleanly.

New Service integration tests require the read-only Service checkout at the documented local path; they fail rather than silently skip if it is unavailable. Source revision and file hashes are recorded in [Service fixture provenance](evidence/service-source.json). Auth emulator results do not certify every hosted revocation/session-cookie condition.

## Readiness, approvals and remaining gates

The [updated rollout](../shop-s2-1/FIREBASE_RULES_ROLLOUT.md) provides exact project, Git Bash commands, fresh backup/hash checks, minimal Firestore-only deployment, verification and rollback conditions. The [hosted staging and smoke plan](HOSTED_VERIFICATION.md) separates read-only checks from approval-required writes.

Before hosted work: identify an isolated Firebase project plus both application URLs and owners; attest server/client/bucket separation; approve any project/resource creation, app/rule deployments, synthetic identities/data, test writes and cleanup. No such authorization is inferred from this preparation task. Before production: obtain separate approval for **only Firestore rules on `ilab-v2`**, a change window, operator IAM and compatibility sign-off; record whether rollback to the insecure baseline is authorized under specified failure conditions. No owner/IAM grant was changed or deployment permission proven.

Remaining production rollout actions: deployed-version attestation, owner sign-off, explicit deployment approval and actual production rule rollout/post-checks. Hosted staging is deferred by owner decision; emulator-based verification remains the current test approach. The known broad-write exposure remains until an authorized rollout succeeds. Existing dependency deferrals (0 critical / 4 high / 8 moderate production entries), catalog readiness, image-byte validation, manual order monitoring, receipt/accounting retention and crash-orphan reconciliation remain in prior reports. No new dependency finding materially changes this rules-only proposal; none is declared resolved. These production release actions and the absence of staging do not block storefront redesign development. No redesign/SEO implementation is included in this pass.
