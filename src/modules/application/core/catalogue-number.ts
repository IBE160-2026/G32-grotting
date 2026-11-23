// The catalogue number of an Application (Story 6.7): `JA-` and the Student's
// own sequence number, zero-padded to at least three digits; from 1000 it is
// simply as long as it needs to be.
export function formatCatalogueNumber(seq: number): string {
  return `JA-${String(seq).padStart(3, "0")}`;
}
