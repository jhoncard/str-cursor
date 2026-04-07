import "server-only";

/**
 * Derive a 4-digit door code from a guest phone number, matching
 * Airbnb's "last 4 digits of your phone" convention.
 *
 * Returns null when a valid code cannot be extracted. Callers should
 * fall back to a random code in that case.
 *
 * Rejected cases:
 *   - null / undefined / empty
 *   - fewer than 4 digits after stripping non-digits
 *   - all same digit ("0000", "1111", etc.) — weak codes
 */
export function extractDoorCodeFromPhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  if (digits.length < 4) return null;
  const last4 = digits.slice(-4);
  // Reject weak codes where every digit is the same.
  if (/^(\d)\1{3}$/.test(last4)) return null;
  return last4;
}
