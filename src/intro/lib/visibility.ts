/**
 * Safely derives visibility from the most recent IntersectionObserver entry.
 */
export function isLatestEntryIntersecting(
  entries: ReadonlyArray<Pick<IntersectionObserverEntry, 'isIntersecting'>>,
  fallback = true,
): boolean {
  if (!entries.length) return fallback;
  return Boolean(entries[entries.length - 1]?.isIntersecting);
}
