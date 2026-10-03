'use client';

const API_BASE = '/shop/api';

export const SESSION_ENDPOINT = `${API_BASE}/auth/session`;

export function friendlyAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/user-disabled': 'This account has been disabled.',
    'account-disabled': 'This shop account has been disabled.',
    'account-pending': 'Your wholesale account is awaiting approval. You can sign in after it has been approved.',
    'auth/user-not-found': 'No account exists for this email address.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
    'auth/wrong-password': 'The password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  };
  return messages[error?.code] ?? error?.message ?? 'Authentication failed. Please try again.';
}

export async function authenticatedFetch(user, path, options = {}) {
  const idToken = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: { ...options.headers, Authorization: `Bearer ${idToken}` },
  });
}

export async function createServerSession(user) {
  const response = await authenticatedFetch(user, '/auth/session', { method: 'POST' });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to establish a secure session.');
    error.code = result.code;
    throw error;
  }
  return result;
}

export function clearServerSession() {
  return fetch(SESSION_ENDPOINT, { method: 'DELETE' });
}
