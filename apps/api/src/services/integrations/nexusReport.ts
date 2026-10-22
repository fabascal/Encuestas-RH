/** One oil-sales figure per station, taken from the first fuel row that includes it. */
export interface NexusOilSale {
  stationCode: string;
  amount: number;
}

export function stationCodeFromLabel(label: string): string | null {
  const code = label.split(':')[0]?.trim() ?? '';
  return code.length > 0 ? code : null;
}

/** `period` is the first day of the month, `YYYY-MM-01`. */
export function monthBounds(period: string): { dateIni: string; dateEnd: string } {
  const match = /^(\d{4})-(\d{2})-01$/.exec(period);
  if (!match) throw new Error('El mes indicado no es válido');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    dateIni: `${match[1]}-${match[2]}-01`,
    dateEnd: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function mexicoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The day Nexus is allowed to sync: always the previous calendar day in Mexico. */
export function yesterdayInMexico(now = new Date()): string {
  const [year, month, day] = mexicoToday(now).split('-').map(Number);
  const cursor = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  return cursor.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD dates. */
export function daysBetween(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    throw new Error('El rango de días no es válido');
  }
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor += 86_400_000) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
    if (days.length > 62) throw new Error('El rango no puede pasar de 62 días');
  }
  return days;
}

/**
 * Closed days of a month that Nexus can still return. The end is yesterday in
 * Mexico when the month is still open. A future month, or the current month on
 * its first day, has nothing to preview.
 */
export function previewRange(period: string, now = new Date()): { dateIni: string; dateEnd: string } {
  const bounds = monthBounds(period);
  const yesterday = yesterdayInMexico(now);
  if (bounds.dateIni > yesterday) {
    throw new Error('Ese mes todavía no tiene días cerrados en Nexus');
  }
  return {
    dateIni: bounds.dateIni,
    dateEnd: bounds.dateEnd < yesterday ? bounds.dateEnd : yesterday,
  };
}

export function currentMonthPeriod(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
  }).format(now);
  return `${parts.slice(0, 7)}-01`;
}

/**
 * Nexus repeats "Importe Aceites" on every fuel product of the same station.
 * The first numeric value for each station code is the monthly oil sale.
 */
export function oilSalesByStation(rows: unknown[]): NexusOilSale[] {
  const seen = new Set<string>();
  const sales: NexusOilSale[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const label = record['Estación'];
    if (typeof label !== 'string') continue;
    const stationCode = stationCodeFromLabel(label);
    if (!stationCode || seen.has(stationCode)) continue;
    const amount = Number(record['Importe Aceites']);
    if (!Number.isFinite(amount)) continue;
    seen.add(stationCode);
    sales.push({ stationCode, amount });
  }
  return sales;
}
