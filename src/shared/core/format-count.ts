// A whole number with a space between thousands, as in «3 412 tegn» and
// «15 000 tegn» (EXPERIENCE.md, Key strings).
export function formatCount(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
