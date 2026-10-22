export function mexicoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function mexicoYesterday(now = new Date()): string {
  const [year, month, day] = mexicoToday(now).split('-').map(Number);
  const cursor = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  return cursor.toISOString().slice(0, 10);
}

export function mexicoMonth(now = new Date()): string {
  return mexicoToday(now).slice(0, 7);
}
