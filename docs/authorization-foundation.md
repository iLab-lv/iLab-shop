# Authorization foundation

Firebase Authentication is the identity provider. The shared profile lives at
`users/{firebaseAuthUid}` in the `ilab-v2` Firestore project. Browser requests to
protected route handlers must send the current Firebase ID token as
`Authorization: Bearer <id-token>`; the server verifies it with Firebase Admin and
never accepts a request-body UID as proof of identity.

The profile schema is:

```text
uid, email, name, phone
role: customer | partner | staff | admin
status: active | pending | disabled
partnerStatus: none | pending | approved | rejected
discountPercent: number (0..100)
company?: { name, registrationNumber, vatNumber }
createdAt, updatedAt: Firestore timestamps
```

Role permissions and active-account enforcement are centralized in
`lib/auth/roles.mjs`. Server authentication is in `lib/auth/serverAuth.js`, and all
user writes are in `lib/auth/userProfiles.js`.

The separate iLab service repository is not present in this workspace. Before its
admin is shared with shop identities, its guard must verify a Firebase ID token,
load `users/{decodedToken.uid}`, and require both `status === "active"` and the
central equivalent of `canAccessServiceAdmin`. With the current policy, that
permission belongs only to `admin`; `staff` must be rejected. The service app must
repeat this check at every privileged server mutation, not only in its UI or route
layout.

No Firestore Security Rules file or Firebase deployment configuration was present
in this repository when this foundation was added. These server routes use the
Admin SDK, which bypasses Firestore Rules, so their permission checks remain
mandatory. Before enabling any direct browser writes to `users`, the deployed
rules should be audited and restricted so clients cannot change `role`, `status`,
`partnerStatus`, or `discountPercent`.
