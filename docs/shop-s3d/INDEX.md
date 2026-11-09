# S3D — Cart, authentication and checkout

The existing Cart drawer already follows the approved dark counter composition, so its focus, Escape, backdrop, quantity, removal, and checkout behavior remains intact. Its controls now have consistent touch sizing, long item names wrap safely, and an empty cart no longer shows a zero-total checkout footer. The auth modal now follows the approved account drawer pattern from `src/partials/panels-shop.html`; Firebase login/registration, session creation, focus management, cart association, and checkout continuation are preserved.

Checkout follows `src/pages/shop/checkout.html`: breadcrumb, editorial form groups, 7:5 form/summary layout, and a dark order-summary counter. The Account order section follows `src/pages/shop/account.html` with open hairline rows. Existing payment, delivery, confirmation, invoice, account-order, Contact drawer, and inquiry behavior remain connected. No cart/auth/order/security logic, Admin, Firebase rules, or Service files were changed.

Validation: 101 focused cart, account-cart, checkout recovery, order, invoice, inquiry, navigation, and security-contract tests passed; lint passed. `next build` compiled, then failed prerendering `/sitemap.xml` because Firestore access is blocked (`connect EACCES`), matching the known S3C limitation. Browser rendering was not verified: the existing isolated visual runner writes into preserved S3A evidence and its prior localhost bind failed. No live order, payment, inquiry, or email was submitted.

S3D.1 adds password recovery inside the existing account drawer. Login retains the entered email when opening recovery; the view validates the address, sends via Firebase `sendPasswordResetEmail`, displays a neutral success message, and returns to Login without changing cart or checkout intent. Recovery copy follows the existing LV/RU Service-language preference (English fallback); Firebase email language is set for the request and restored afterward. No custom action URL or redirect is supplied, so Firebase uses its standard reset handler. Tests mock the Firebase call; no reset email was sent.

Before launch, verify in Firebase Console that Email/Password sign-in is enabled, the Password reset template/sender is configured, and the required public domains are present under Authentication settings. No Firebase Console or production configuration was changed in this pass.

S3D.1 validation: 6 focused password-recovery tests passed; lint passed. `git diff --check` reported pre-existing trailing blank lines in unrelated dirty files; the changed tracked files pass. No browser/Firebase-emulator email delivery check was performed. S4 technical SEO remains separate; the sitemap/Firestore build dependency is an existing S4 issue.

Manual review checklist: at 375px, 1024px, and 1440px check the empty/non-empty Cart drawer, Login/Register/Recovery drawer, authenticated checkout form and summary, guest checkout gate, order confirmation, and Account order rows.
