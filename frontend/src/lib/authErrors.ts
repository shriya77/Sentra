const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/email-already-in-use': 'This email is already in use. Try signing in.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
};

export function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: string }).code === 'string') {
    const code = (err as { code: string }).code;
    if (AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  }
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
