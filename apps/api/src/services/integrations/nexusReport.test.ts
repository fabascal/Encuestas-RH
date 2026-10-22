import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  monthBounds,
  oilSalesByStation,
  previewRange,
  stationCodeFromLabel,
  yesterdayInMexico,
} from './nexusReport.js';

const SAMPLE = [
  { Estación: '10195: BONANZA', Producto: '87 Octanos', 'Importe Aceites': '22398.04' },
  { Estación: '10195: BONANZA', Producto: '91 Octanos', 'Importe Aceites': '22398.04' },
  { Estación: '10195: BONANZA', Producto: 'Diesel', 'Importe Aceites': '99999.99' },
  { Estación: '7846: RANCHO', Producto: '87 Octanos', 'Importe Aceites': '176600.13' },
  { Estación: '7846: RANCHO', Producto: '91 Octanos', 'Importe Aceites': '176600.13' },
  { Estación: '7846: RANCHO', Producto: 'Diesel', 'Importe Aceites': '176600.13' },
];

describe('nexus report', () => {
  it('uses the station code before the colon', () => {
    expect(stationCodeFromLabel('7846: RANCHO')).toBe('7846');
  });

  it('covers the whole month', () => {
    expect(monthBounds('2026-01-01')).toEqual({ dateIni: '2026-01-01', dateEnd: '2026-01-31' });
    expect(monthBounds('2026-02-01')).toEqual({ dateIni: '2026-02-01', dateEnd: '2026-02-28' });
  });

  it('uses the previous day in Mexico, including the month boundary', () => {
    expect(yesterdayInMexico(new Date('2026-03-01T07:00:00Z'))).toBe('2026-02-28');
    expect(yesterdayInMexico(new Date('2026-01-01T18:00:00Z'))).toBe('2025-12-31');
  });

  it('lists every day in a range', () => {
    expect(daysBetween('2026-01-30', '2026-02-01')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
  });

  it('previews a past month in full', () => {
    expect(previewRange('2026-08-01', new Date('2026-09-30T18:00:00Z'))).toEqual({
      dateIni: '2026-08-01',
      dateEnd: '2026-08-31',
    });
  });

  it('stops the current month at yesterday', () => {
    expect(previewRange('2026-09-01', new Date('2026-09-30T18:00:00Z'))).toEqual({
      dateIni: '2026-09-01',
      dateEnd: '2026-09-29',
    });
  });

  it('rejects the current month on its first day', () => {
    expect(() => previewRange('2026-09-01', new Date('2026-09-01T18:00:00Z'))).toThrow(
      'Ese mes todavía no tiene días cerrados en Nexus',
    );
  });

  it('rejects a future month', () => {
    expect(() => previewRange('2026-10-01', new Date('2026-09-30T18:00:00Z'))).toThrow(
      'Ese mes todavía no tiene días cerrados en Nexus',
    );
  });

  it('keeps the first oil amount of each station', () => {
    expect(oilSalesByStation(SAMPLE)).toEqual([
      { stationCode: '10195', amount: 22398.04 },
      { stationCode: '7846', amount: 176600.13 },
    ]);
  });
});
