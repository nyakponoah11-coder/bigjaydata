/**
 * Utility to encode and decode obfuscated / encrypted agent tokens.
 * Allows agents to share disguised/encrypted links that do not reveal
 * the internal store structure or source brand.
 */

export function encodeAgentToken(slug: string): string {
  if (!slug) return "";
  try {
    const hex = Buffer.from(slug.toLowerCase().trim(), "utf-8").toString("hex");
    return `x${hex}`;
  } catch {
    return slug;
  }
}

export function decodeAgentToken(token: string): string {
  if (!token) return "";
  const clean = token.toLowerCase().trim();
  if (clean.startsWith("x") && clean.length > 1) {
    try {
      const hexPart = clean.slice(1);
      const decoded = Buffer.from(hexPart, "hex").toString("utf-8");
      if (decoded && /^[a-z0-9-_]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      // Fallback
    }
  }
  return clean;
}
