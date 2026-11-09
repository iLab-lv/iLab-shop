import 'server-only';

import { db, serverTimestamp } from './firebaseAdmin';
import { isActiveUser } from './auth/roles.mjs';
import { ACCOUNT_CART_COLLECTION, applyAccountCartOperation, normalizeAccountCartState } from './accountCartModel.mjs';

function accountCartReference(session) {
  if (!session?.token?.uid || !isActiveUser(session.profile)) throw new Error('authentication_required');
  return db.collection(ACCOUNT_CART_COLLECTION).doc(session.token.uid);
}

function publicCart(state) {
  return { items: state.items, revision: state.revision };
}

export async function getAccountCart(session) {
  const snapshot = await accountCartReference(session).get();
  return publicCart(normalizeAccountCartState(snapshot.exists ? snapshot.data() : null));
}

export async function mutateAccountCart(input, session) {
  const reference = accountCartReference(session);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const next = applyAccountCartOperation(snapshot.exists ? snapshot.data() : null, input);
    if (!next.repeated) {
      const { repeated: _repeated, ...state } = next;
      transaction.set(reference, {
        ...state,
        updatedAt: serverTimestamp(),
        ...(!snapshot.exists ? { createdAt: serverTimestamp() } : {}),
      }, { merge: true });
    }
    return publicCart(next);
  });
}
