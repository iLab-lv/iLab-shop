# Proposed Firestore rollout — operator procedure, not executed

## Source and compatibility

S2.2 refreshed both deployed sources on 2026-11-03: [complete backup and hashes](../shop-s2-2/evidence/current-rules-network/record.json). Project **`ilab-v2`**, default Firestore database; Firestore ruleset `5e89f999-300d-48ce-a25c-c720819482ff` still matches S2. Proposal: `firebase/firestore.proposed.rules`, SHA-256 `9d8a1e0fd5be565abcee8125ef82996acaedf9379f42ab386e1d05285e7f2c71`. Source comparison confirms only five write conditions change semantically. No indexes, Storage, functions or hosting change is included. [S2.2 readiness assessment](../shop-s2-2/INDEX.md).

| Consumers inspected read-only | Access preserved |
| --- | --- |
| Service `lib/pricing/getModelPricing.client.js`, `BrandPickerPricelist.jsx`, admin `RepairServicesScreen.jsx` and `PricelistScreen.jsx` | Browser reads of the five shared root collections remain public. Category brand/series arrays are embedded fields, not permission-inheriting subcollections. |
| Service `lib/content/{categories,devices,catalogDevices}.js`, server pages and sitemap | Server reads remain available. |
| Service `app/api/admin/{services,pricelist,categories,devices}/route.js` | Existing Admin SDK writes remain. `requireServiceAdminRequest` validates session and shared user profile; `canAccessServiceAdmin` requires active Admin. Staff is not Service Admin. |
| Shop catalog and server commerce/admin helpers | Authorized Admin SDK access remains; client direct access to Shop/Users continues to be denied. |
| Storage | No production rule change proposed. The local fixture retains public `shop/products/**` reads and denies other client access. Invoice bytes stream through the authorized server. |

No Web SDK add/set/update/delete/writeBatch/transaction writer was found in Service app/lib. Therefore no Service code change is needed for the inspected workflows. External scripts, older deployments and third-party clients are not certified. If an additional legitimate browser writer is found, migrate it to an authorized server operation under separate Service authorization before rollout; do not restore broad authenticated writes.

## Isolated verification

Run `npm run test:emulators` in Shop with Node 22 and Java 21. The guard uses only the explicit demo project and loopback endpoints. Test matrix includes all five root collections with anonymous/customer/other/admin identities; all direct browser writes are denied, including Admin. Authorized server writes are demonstrated with actual Admin SDK application modules. Shop owner cart access is through its authenticated API/service, not a direct Firestore owner rule. Cross-owner service denial and direct client denial are distinct tests. Public reads, nested denial, private invoices and public images are covered.

S2.2 corrects the earlier coverage description: the old five-root test exercised anonymous/customer only. The expanded final suite passes **12 tests**, covering all four client identity classes on every root plus actual Service Admin routes, Auth emulator session-cookie verification and Firestore writes/denials. Only Next cookie/JSON wrappers are adapted. Service UI and hosted HTTP deployment are not covered. The owner confirmed no separate staging project exists and deferred that decision; use emulator evidence for current preparation, record hosted verification as unperformed, and obtain deployed-version/consumer attestation before an authorized production change. Staging does not block storefront redesign.

## Required authorization and exact steps

These Git Bash commands are an owner-run plan only; the latest instruction still prohibits live Firebase modifications. Obtain shared Firebase/rules owner authorization accepting the documented emulator-only verification limits, deployed Service/Shop revision attestation and a change window. Hosted staging sign-off is deferred, not a current prerequisite. Confirm `ilab-v2` independently in Firebase Console; do not use a default alias. A successful read-only backup does not prove the operator can deploy.

The operator needs Rules read/create/release-update permissions (for example reviewed `roles/firebaserules.admin`) plus project visibility. Installed Firebase CLI 15.34.2 also preflights `datastore.indexes.list/create/update/delete` for its Firestore target, even with rules-only filtering; have the IAM owner review those CLI requirements rather than granting broad Owner access or bypassing denied permissions. Deployment authentication/IAM is not exercised here. [Rules IAM reference](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaserules).

1. From the authoritative Shop directory, create a **fresh**, non-overwriting read-only backup immediately before the authorized change. Existing `.env.local` Admin credentials must match the explicit project; never paste credentials into commands/logs. Single operator/change window prevents concurrent rules drift.

   ```bash
   cd /c/Users/info/Desktop/shop
   FIREBASE_RELEASE_PROJECT='ilab-v2'
   BACKUP_DIR="docs/shop-s2-2/evidence/predeploy-$(date -u +%Y%m%dT%H%M%SZ)"
   node docs/shop-s2-2/read-rules.mjs "$FIREBASE_RELEASE_PROJECT" "$BACKUP_DIR"
   sha256sum "$BACKUP_DIR/firestore.rules" "$BACKUP_DIR/storage.rules" firebase/firestore.proposed.rules
   ```

2. Review `record.json`, full JSON sources and extracted files. Rebase/retest if the current source changed since S2.2. Keep the fresh baseline for rollback; do not use the historical snapshot blindly. Prepare Firestore-only configs **at the repository root** so relative paths are unambiguous; these commands refuse to overwrite existing configs:

   ```bash
   node --input-type=module - "$BACKUP_DIR" <<'NODE'
   import fs from 'node:fs';
   const backup = process.argv[2];
   fs.writeFileSync('firebase.rules-rollout.json', JSON.stringify({firestore:{rules:'firebase/firestore.proposed.rules'}}, null, 2), {flag:'wx'});
   fs.writeFileSync('firebase.rules-rollback.json', JSON.stringify({firestore:{rules:`${backup}/firestore.rules`}}, null, 2), {flag:'wx'});
   NODE
   npm run test:emulators
   ```

3. Verify configs name only `firestore.rules`, no Storage/index/hosting targets. Record proposal/baseline hashes and app compatibility sign-off. Stop for any discrepancy. **Approval gate: the next command changes production; not executed in S2.2.**

   ```bash
   node node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules --project "$FIREBASE_RELEASE_PROJECT" --config firebase.rules-rollout.json
   ```

4. Retrieve rules again to a new timestamped output directory with `read-rules.mjs`; compare the deployed Firestore source hash to the approved proposal and Storage to the unchanged baseline. Record the released ruleset ID. Allow propagation before enforcement checks. Execute the [ordered smoke plan](../shop-s2-2/HOSTED_VERIFICATION.md); production checks remain read-only unless separately approved. Admin SDK success does not prove client denial. [Selective deployment guidance](https://firebase.google.com/docs/rules/manage-deploy).

## Rollback

If compatibility fails, stop further rollout and identify the affected consumer. The previous source reopens the known authenticated-write exposure: restoring it requires an explicit risk decision by the shared-project security owner, not an automatic fallback. Prefer fixing an identified consumer/server path where safe.

Rollback candidates: a legitimate deployed browser consumer was missed and now fails, or public content breaks because the wrong source was released. Stop for wrong-project selection, unrelated rules drift or privacy concerns; investigate before any further mutation. The owner must explicitly accept reopening the exposure before restoring the previous policy.

For an authorized rollback, verify the saved **fresh predeploy** baseline hash and that no intervening rules release exists. This command is a plan, not an executed/tested production restoration:

```bash
node node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules --project "$FIREBASE_RELEASE_PROJECT" --config firebase.rules-rollback.json
```

Retrieve released source to a new directory, compare its hash to the baseline, record the new ruleset ID, allow propagation and repeat read-only smoke checks. Source-equivalent redeployment may create a new ruleset ID; equality is proven by content hash, not ID equality. No Storage rollback is necessary because no Storage deployment is planned. Backup completeness/extraction is verified locally and against current retrieved source; rollback execution, operator IAM and hosted recovery remain unverified. Preserve the known exposure as OPEN after rollback.
