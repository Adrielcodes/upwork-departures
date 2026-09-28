import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison so secrets can't be guessed via response timing. */
export function secretMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
