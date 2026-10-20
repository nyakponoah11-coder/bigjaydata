/**
 * Secret key masking and validation utilities.
 * Client & Server safe (no Node.js fs/path dependencies).
 */

export function isMaskedSecret(val: any): boolean {
  if (!val || typeof val !== "string") return true;
  const s = val.trim();
  if (!s) return true;
  // If it contains bullet chars, asterisks, question marks, or unicode replacement char
  if (/[\u2022\u25cf\*\?\ufffd]/.test(s)) return true;
  // If it's pure dots/dashes/placeholder chars
  if (/^[\s•●\*\?_\-]+$/.test(s)) return true;
  return false;
}

export function isValidPaystackSecret(val: any): boolean {
  if (isMaskedSecret(val)) return false;
  const clean = String(val).trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
  return (clean.startsWith("sk_live_") || clean.startsWith("sk_test_") || clean.startsWith("sk_")) && clean.length >= 20;
}
