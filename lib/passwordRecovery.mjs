export const PASSWORD_RECOVERY_COPY = Object.freeze({
  en: Object.freeze({
    title: 'Reset password',
    forgot: 'Forgot password?',
    description: 'Enter the email address for your account and we’ll send a reset link if an account exists.',
    email: 'Email',
    send: 'Send reset link',
    sending: 'Sending…',
    back: 'Back to login',
    required: 'Enter your email address.',
    invalid: 'Enter a valid email address.',
    failed: 'We couldn’t send a reset link right now. Check your connection and try again.',
    sent: "If an account exists for this email, you'll receive a password reset link.",
  }),
  lv: Object.freeze({
    title: 'Atiestatīt paroli',
    forgot: 'Aizmirsāt paroli?',
    description: 'Ievadiet sava konta e-pasta adresi. Ja konts eksistē, nosūtīsim atiestatīšanas saiti.',
    email: 'E-pasts',
    send: 'Nosūtīt atiestatīšanas saiti',
    sending: 'Sūta…',
    back: 'Atpakaļ uz pieteikšanos',
    required: 'Ievadiet savu e-pasta adresi.',
    invalid: 'Ievadiet derīgu e-pasta adresi.',
    failed: 'Pašlaik nevarējām nosūtīt atiestatīšanas saiti. Pārbaudiet savienojumu un mēģiniet vēlreiz.',
    sent: 'Ja konts ar šo e-pasta adresi eksistē, saņemsiet paroles atiestatīšanas saiti.',
  }),
  ru: Object.freeze({
    title: 'Сбросить пароль',
    forgot: 'Забыли пароль?',
    description: 'Введите адрес электронной почты аккаунта. Если аккаунт существует, мы отправим ссылку для сброса пароля.',
    email: 'Электронная почта',
    send: 'Отправить ссылку',
    sending: 'Отправка…',
    back: 'Вернуться ко входу',
    required: 'Введите адрес электронной почты.',
    invalid: 'Введите корректный адрес электронной почты.',
    failed: 'Не удалось отправить ссылку для сброса пароля. Проверьте подключение и повторите попытку.',
    sent: 'Если аккаунт с таким адресом существует, вы получите ссылку для сброса пароля.',
  }),
});

export function getPasswordRecoveryCopy(locale) {
  return PASSWORD_RECOVERY_COPY[locale] || PASSWORD_RECOVERY_COPY.en;
}

export function validateRecoveryEmail(value, copy = PASSWORD_RECOVERY_COPY.en) {
  const email = String(value ?? '').trim();
  if (!email) return { email, error: copy.required };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { email, error: copy.invalid };
  return { email, error: '' };
}

export async function requestPasswordRecovery({ auth, email, locale = 'en', sendResetEmail }) {
  const copy = getPasswordRecoveryCopy(locale);
  const validated = validateRecoveryEmail(email, copy);
  if (validated.error) return { ok: false, error: validated.error };

  const previousLanguage = auth.languageCode;
  auth.languageCode = PASSWORD_RECOVERY_COPY[locale] ? locale : 'en';
  try {
    await sendResetEmail(auth, validated.email);
    return { ok: true, message: copy.sent };
  } catch (error) {
    // Older Firebase Auth configurations can return user-not-found; treat it as
    // the same confirmation as success to avoid exposing account existence.
    if (error?.code === 'auth/user-not-found' || error?.code === 'user-not-found') {
      return { ok: true, message: copy.sent };
    }
    // Keep other Firebase errors opaque so the UI never exposes service details.
    return { ok: false, error: copy.failed };
  } finally {
    auth.languageCode = previousLanguage;
  }
}
