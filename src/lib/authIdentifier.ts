/**
 * Smart identifier helpers: accept email OR phone number,
 * normalize phone to a stable pseudo-email so Supabase email-auth keeps working
 * without requiring a paid SMS provider.
 */

const PHONE_DOMAIN = 'phone.smartnotebook.local';

export type IdentifierKind = 'email' | 'phone' | 'invalid';

export const detectIdentifierKind = (raw: string): IdentifierKind => {
  const v = (raw || '').trim();
  if (!v) return 'invalid';
  // Email check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  // Phone check: allow +, digits, spaces, dashes, parentheses. Need at least 6 digits.
  const digits = v.replace(/[^\d]/g, '');
  if (/^[+()\-\s\d]+$/.test(v) && digits.length >= 6 && digits.length <= 15) return 'phone';
  return 'invalid';
};

export const normalizePhone = (raw: string): string => {
  const digits = (raw || '').replace(/[^\d]/g, '');
  return digits;
};

/**
 * Convert any identifier to the email string used by Supabase auth.
 * - Email → lowercase email
 * - Phone → `<digits>@phone.smartnotebook.local`
 */
export const identifierToAuthEmail = (raw: string): string | null => {
  const kind = detectIdentifierKind(raw);
  if (kind === 'email') return raw.trim().toLowerCase();
  if (kind === 'phone') return `${normalizePhone(raw)}@${PHONE_DOMAIN}`;
  return null;
};

export const isPhoneAuthEmail = (email: string | null | undefined): boolean =>
  !!email && email.endsWith(`@${PHONE_DOMAIN}`);

export const displayIdentifier = (email: string | null | undefined): string => {
  if (!email) return '';
  if (isPhoneAuthEmail(email)) return '+' + email.split('@')[0];
  return email;
};
