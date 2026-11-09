# Hosted verification and post-rollout smoke plan

Status: **deferred by owner decision, 2026-11-03**. The owner confirmed that no separate hosted Firebase staging environment exists. Continue with emulator-based verification; decide later whether hosted staging is necessary. This document retains an optional future procedure, not a prerequisite for storefront redesign or current rollout preparation. No hosted identities/data/resources were created or changed. Production must not substitute for staging; live modifications remain prohibited without separate explicit approval.

## 1. Establish an isolated target

The owner supplies an existing staging Firebase project ID, Storage bucket, Service URL, Shop URL and deployment owners. If none exists, choose either (a) authorize a dedicated project and two staging deployments, or (b) retain local-only verification and postpone hosted sign-off. Creating the project is not authorized by S2.2.

For the selected target, record Firebase project ID/number, default database, bucket, Auth domain, application build revisions and proposed-rule hash. Operator must inspect each application's **server** Firebase project/bucket credentials and **built client** Firebase configuration. Both staging apps must use the same staging backend, and neither may use `ilab-v2` or `ilab-v2.firebasestorage.app`. Build-time public variables require rebuilding if changed; a runtime-only edit is insufficient. Confirm preview overrides, Auth authorized domains, same-origin/session cookies, disabled production cron jobs and email/payment isolation. Use no production customer data or production credentials. Record attestations without copying secrets.

## 2. Read-only preflight

After actual URLs are supplied, these Git Bash commands fetch public pages only (replace placeholders first):

```bash
SERVICE_STAGE_URL='https://OWNER-SUPPLIED-SERVICE-HOST'
SHOP_STAGE_URL='https://OWNER-SUPPLIED-SHOP-HOST/shop'
curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}\n' "$SERVICE_STAGE_URL/"
curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}\n' "$SERVICE_STAGE_URL/cenas"
curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}\n' "$SHOP_STAGE_URL"
```

Inspect loaded public Firebase bundle identifiers and compare with the operator's server attestation. Stop if project/bucket/URLs are inconsistent or unknown. A successful HTTP response alone does not establish isolation. Do not call invoice GETs during a read-only production check: a missing PDF may self-heal and write Storage/metadata.

## 3. Approval-required setup and test execution

Obtain a concrete approval naming the target project/URLs, resources/deployments, synthetic-data scope, operators and cleanup before these steps:

1. Provision or select the isolated target; deploy the exact reviewed app revisions and proposed Firestore rules there. Keep production proxy, Storage rules and both production applications untouched. Record hosted rule release IDs/hashes.
2. Create synthetic customers A/B, active Admin, active Staff and disabled account; use non-deliverable fixture contacts. Assign roles only through trusted server/operator tooling. Seed only test settings, category/device/service/pricing fixtures and Shop products: positive price+stock, missing price, zero stock and one last-unit item. Seed an account cart and a product image. Use a recorded fixture ID list; no production export.
3. Perform the matrix below in clean browser contexts and compare server data before/after. Capture statuses and redacted IDs, not cookies/tokens/customer details. Actual rule-denial writes must target synthetic staging documents; never probe writes against production to see whether they succeed.
4. Remove exactly the recorded staging fixtures/identities/objects after verifying results. Order deletion retains request receipts by design: inventory those separately and remove only test receipts with approved staging cleanup. Do not reset a shared hosted database or decrement real inventory.

| Verification | Action and required result | Classification |
| --- | --- | --- |
| Service public content | Open home, locations, reviews, devices and pricing; compare expected fixture content; no permission errors. | Read-only after fixtures exist |
| Service booking | Open form, validate fields and navigate/close without submit. | Read-only. Submission requires separately verified mail sink and authorization; no real email. |
| Service Admin | Sign in as active Admin; create/update/reorder/delete synthetic services/prices/devices/categories where supported; Customer/Staff/disabled requests denied without changes. | Auth + staging writes |
| Five shared roots | Anonymous/customer/other/Admin can read; all direct client create/update/delete attempts denied. Admin server routes remain functional. Nested docs denied. | Staging write attempts |
| Shop catalog/auth/cart | Browse; missing-price/out-of-stock inquiry CTAs; guest cart → login/register → merge; refresh/sign out/in preserves owner cart, other identity cannot read it. Do not submit inquiries. | Auth + staging writes |
| Shop admin/products/images | Authorized catalog edit and image upload/reference replacement/deletion; Customer denied; referenced-image deletion protected. Public image read works; private PDF object access denied. | Staging writes |
| Orders/stock | One valid synthetic order; duplicate same UUID and refresh/retry produce one order/invoice and one stock deduction. Two buyers for last unit permit only one. Stale totals/unavailable lines reject without cart loss. Cancel twice restores stock once. | Staging writes |
| Invoice/ownership | Owner/admin can access invoice, other customer denied; regeneration/deletion races remain controlled; immutable number/totals and private/no-store responses. Failed PDF does not erase order success. | Staging writes, including self-healing GET |
| Hosted cookies | Verify login continuation, expiry/sign-out, server authorization, secure/same-site cookie behavior and `/shop` proxy paths on desktop/mobile. | Auth/session operations; no production accounts |

## 4. Ordered production smoke after separately authorized rules rollout

1. Retrieve released source; compare project, ruleset/source hash with the approved proposal and confirm Storage unchanged. Allow rules propagation; record timestamps and repeat after propagation before declaring a mismatch. See [Firebase deployment guidance](https://firebase.google.com/docs/rules/manage-deploy).
2. Read-only anonymous Service home/locations/reviews/device/pricing and Shop catalog/product-image checks. Open booking without submitting; preserve Ads landing/proxy.
3. Read-only unauthenticated admin/protected API denial; no registration, role changes, cart writes, customer-data browsing, orders or invoices. Existing-user sign-in may update auth/session metadata and needs its own approved smoke identity/action scope.
4. Refer to the completed staging mutation evidence for admin catalog, cart, order, invoice and cross-account protections. Additional production test writes require a separate explicit fixture/action approval; this plan grants none. Do not declare runtime enforcement tested merely from a source hash or anonymous public page.
5. Watch logs for new permission-denied errors and identify affected consumers. If public content breaks or a legitimate writer fails and source change is causal, stop rollout and apply the owner-approved rollback decision. Broad-write restoration reopens the vulnerability and must be recorded. If rules drift, unexpected unrelated changes, wrong project or potential privacy exposure appears, stop and escalate to the owner rather than deploying more changes.

Release sign-off records: owner, operator, project, app revisions, before/after rule IDs/hashes, local and staging evidence, read-only production results, approved exceptions, rollback decision and unresolved gates. Without that record, readiness remains pending.
