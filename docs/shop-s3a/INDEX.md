# S3A — Design Foundations & Shared Layout

S3A introduced the public Shop shell, typography tokens, responsive header and footer while keeping Admin outside `ShopShell` on its existing Inter base. The footer reads only public Shop settings, and internal navigation uses App Router paths for the `/shop` base path. Earlier implementation notes and the before manifest remain in this folder.

S3A.1 completed isolated browser verification. The local `/shop` 500 was caused by blocked network access to the configured Firestore project: Firebase Admin initialized, but `getBrandDirectory()` let its required `shopDevices` read failure escape the public layout. The public settings loader already falls back. Against synthetic Firestore/Auth emulators, `/shop` and the authenticated Admin dashboard both rendered successfully. No production Firebase access or writes occurred.

See [S3A.1 verification](VERIFICATION.md) for browser evidence, repeatable Git Bash commands, and remaining limitations. S3B has not been started.

S3A.2 corrected the Shop header to match the approved redesign's full-width light grid and responsive navigation structure. See the S3A.2 note in [verification](VERIFICATION.md). The S3B landing/catalog navigation implementation is recorded in [the S3B report](../shop-s3b/INDEX.md).
