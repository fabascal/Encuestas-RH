export function periodRange(year: number, month?: number): { start: string; end: string } {
  if (month === undefined) return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { start, end };
}
