import { CART_STORAGE_KEY, normalizeCartItems } from './commerce.mjs';
import { applyAccountCartOperation } from './accountCartModel.mjs';

const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const accountKey = (uid) => `${CART_STORAGE_KEY}:account:${uid}`;

// I/O coordinator for CartProvider, including local recovery of unacknowledged writes.
export function createCartSync({ storage, getAccount, postOperation, onChange, uuid }) {
  let snapshot = { items: [], userId: null, status: 'loading', error: '', notice: '' };
  let generation = 0, ready = false, association = null, queue = Promise.resolve();
  const emit = (changes) => { snapshot = { ...snapshot, ...changes }; onChange(snapshot); };
  function read(key, fallback) { try { return JSON.parse(storage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } }
  function readItems(key) { try { return normalizeCartItems(read(key, [])); } catch { return []; } }
  const save = (key, value) => storage.setItem(key, JSON.stringify(value));
  const serial = (work) => { const task = queue.then(work); queue = task.catch(() => {}); return task; };
  function checkOwner(data, uid) {
    if (data.userId !== uid) throw new Error('Your account changed. Retry saving the cart.');
    return normalizeCartItems(data.items);
  }
  async function replay(uid) {
    const key = accountKey(uid);
    let pending = read(`${key}:pending`, []), result;
    if (!Array.isArray(pending)) throw new Error('Your local cart needs review before it can be saved.');
    while (pending.length) {
      result = await postOperation(uid, pending[0]);
      save(key, checkOwner(result, uid));
      pending = pending.slice(1);
      save(`${key}:pending`, pending);
    }
    return result;
  }
  function failure(error, currentGeneration) {
    if (currentGeneration === generation) emit({ status: 'error', error: error.message || 'Unable to save your cart. Please retry.' });
    return false;
  }
  function hydrate() { emit({ items: readItems(CART_STORAGE_KEY), status: 'ready' }); }
  function signOut() {
    generation += 1; ready = false; association = null;
    emit({ userId: null, items: readItems(CART_STORAGE_KEY), status: 'ready', error: '', notice: '' });
  }
  function associate(uid, { refresh = false } = {}) {
    if (association?.uid === uid) return association.promise;
    if (!refresh && snapshot.userId === uid && ready && snapshot.status === 'ready') return Promise.resolve(true);
    if (snapshot.userId !== uid) {
      generation += 1; ready = false;
      const cached = readItems(accountKey(uid));
      emit({ userId: uid, items: cached.length ? cached : readItems(CART_STORAGE_KEY) });
    }
    const currentGeneration = generation;
    emit({ status: 'syncing', error: '' });
    const promise = serial(async () => {
      if (currentGeneration !== generation) return false;
      let result = await getAccount(uid);
      checkOwner(result, uid);
      if (currentGeneration !== generation) return false;
      result = await replay(uid) ?? result;
      if (currentGeneration !== generation) return false;
      const guest = readItems(CART_STORAGE_KEY);
      if (guest.length) {
        const previous = read(`${CART_STORAGE_KEY}:merge`, null);
        const operation = previous?.uid === uid && sameItems(previous.items, guest)
          ? previous : { uid, operationId: uuid(), type: 'merge', items: guest };
        save(`${CART_STORAGE_KEY}:merge`, operation);
        result = await postOperation(uid, operation);
        checkOwner(result, uid);
        if (currentGeneration !== generation) return false;
        if (sameItems(readItems(CART_STORAGE_KEY), guest)) save(CART_STORAGE_KEY, []);
      }
      const items = checkOwner(result, uid);
      save(accountKey(uid), items);
      if (currentGeneration !== generation) return false;
      ready = true;
      emit({ items, status: 'ready', error: '', notice: guest.length ? 'Your guest and saved carts are combined. Matching products keep the larger quantity. Review availability before checkout.' : 'Your cart is saved to your account.' });
      return true;
    }).catch((error) => failure(error, currentGeneration)).finally(() => { if (association?.promise === promise) association = null; });
    association = { uid, promise };
    return promise;
  }
  function mutate(type, fields = {}) {
    const operation = { operationId: uuid(), type, ...fields };
    try {
      const next = applyAccountCartOperation({ items: snapshot.items }, operation).items;
      const uid = snapshot.userId;
      if (!uid) { save(CART_STORAGE_KEY, next); emit({ items: next, error: '', status: 'ready' }); return Promise.resolve(true); }
      if (!ready || snapshot.status !== 'ready') throw new Error('Retry saving your cart before making more changes.');
      const key = accountKey(uid), pending = read(`${key}:pending`, []);
      save(`${key}:pending`, [...pending, operation]);
      save(key, next);
      emit({ items: next, status: 'syncing', error: '' });
      const currentGeneration = generation;
      return serial(async () => {
        const result = await replay(uid);
        if (currentGeneration !== generation) return false;
        emit({ items: checkOwner(result, uid), status: 'ready', error: '' });
        return true;
      }).catch((error) => {
        // Validation rejection confirms this operation was not applied. Keep
        // the visible error, but do not retry an invalid write indefinitely.
        if (error.status === 400) save(`${key}:pending`, read(`${key}:pending`, []).filter((entry) => entry.operationId !== operation.operationId));
        return failure(error, currentGeneration);
      });
    } catch (error) { emit({ error: error.message }); return Promise.resolve(false); }
  }
  return {
    hydrate, signOut, associate, mutate, getSnapshot: () => snapshot,
    retry: () => {
      if (snapshot.userId) return associate(snapshot.userId, { refresh: true });
      emit({ error: '', status: 'ready' });
      return Promise.resolve(true);
    },
    completeOrder: () => snapshot.userId ? associate(snapshot.userId, { refresh: true }) : mutate('clear'),
  };
}
