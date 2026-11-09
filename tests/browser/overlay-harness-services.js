// Firebase is replaced at module resolution: these calls never reach a real account.
export const auth = { currentUser: null };
export const onAuthStateChanged = (_, callback) => { queueMicrotask(() => callback(auth.currentUser)); return () => {}; };
const user = { uid: 'fixture-user', email: 'fixture@example.invalid', getIdToken: async () => 'fixture-token' };
async function authenticate(kind, email) {
  window.__authCalls.push({ kind, email });
  if (window.__authDelay) await new Promise(resolve => setTimeout(resolve, window.__authDelay));
  if (window.__authFail) throw Object.assign(new Error('Invalid credentials'), { code: 'auth/invalid-credential' });
  auth.currentUser = user;
  return { user };
}
export const signInWithEmailAndPassword = (_, email) => authenticate('login', email);
export const createUserWithEmailAndPassword = (_, email) => authenticate('register', email);
export const signOut = async () => { auth.currentUser = null; };
export const deleteUser = signOut;
export const updateProfile = async () => {};
export const sendPasswordResetEmail = async (_, email) => { window.__authCalls.push({ kind: 'recovery', email }); };
const router = { refresh() {}, push(path) { window.__navigation = path; }, replace(path) { window.__navigation = path; } };
export const useRouter = () => router;
export const usePathname = () => '/';
