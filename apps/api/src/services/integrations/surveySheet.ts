/** Parses the live Google Forms export without touching the database. */

export function parseSheetTimestamp(raw: string): Date | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "43 / 44" becomes 97.727... A plain number is kept as-is. */
export function parseSurveyScore(raw: string): number | null {
  const fraction = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (fraction) {
    const numerator = Number(fraction[1]?.replace(',', '.'));
    const denominator = Number(fraction[2]?.replace(',', '.'));
    if (!denominator || Number.isNaN(numerator)) return null;
    return (numerator / denominator) * 100;
  }
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isNaN(value) ? null : value;
}
