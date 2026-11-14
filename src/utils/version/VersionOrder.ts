import { coerce, compare } from "semver";

/** Pixel Edition's historical 100.10 series precedes Lyssna's release series. */
export function compareLyssnaVersions(a: string, b: string): number {
  const first = coerce(a);
  const second = coerce(b);
  if (!first || !second) return 0;
  const firstLegacy = first.major === 100 && first.minor === 10;
  const secondLegacy = second.major === 100 && second.minor === 10;
  if (firstLegacy !== secondLegacy) return firstLegacy ? -1 : 1;
  return compare(first, second);
}
