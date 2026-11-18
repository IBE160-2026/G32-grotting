const OSLO_DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The calendar day in Oslo for an instant, as `YYYY-MM-DD`. The Daily cap
 * resets at Oslo midnight, and the offset (UTC+1 or UTC+2) follows the
 * daylight saving rules of the time zone database.
 */
export function osloDay(date: Date): string {
  const part = (type: string) =>
    OSLO_DAY.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
