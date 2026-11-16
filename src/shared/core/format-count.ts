// A whole number with a space between thousands, as in «3 412 tegn» and
// «15 000 tegn» (EXPERIENCE.md, Key strings).
export function formatCount(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// The size of a file in whole kilobytes, at least 1, so a small file is never
// shown as «0 kB».
export function kilobytes(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 1024));
}
