/** Several clock hours become one cron, because each queue accepts a single schedule. */
export function cronFromHours(hours: number[]): string {
  const unique = [...new Set(hours)].filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);
  unique.sort((left, right) => left - right);
  if (unique.length === 0) throw new Error('Indica al menos un horario');
  return `0 ${unique.join(',')} * * *`;
}

/** Returns the hours of a top-of-the-hour daily cron, or null when it is a custom expression. */
export function hoursFromCron(cron: string): number[] | null {
  const match = /^0 (\d{1,2}(?:,\d{1,2})*) \* \* \*$/.exec(cron.trim());
  if (!match?.[1]) return null;
  const hours = match[1].split(',').map(Number);
  if (hours.some((hour) => !Number.isInteger(hour) || hour < 0 || hour > 23)) return null;
  return hours;
}
