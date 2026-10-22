import { describe, expect, it } from 'vitest';
import { parseSurveyScore } from '../integrations/surveySheet.js';
import { extractSurvey, normalizeStationName, parseMexicoTimestamp, scoreHasTotal } from './surveyPayload.js';

const sample = {
  esHistorico: true,
  filaNumero: 59,
  fecha: '25/9/2026 11:31:51',
  respuestas: {
    'Estación de Servicio': ['Rancho'],
    Puntuación: ['43 / 44'],
    'Marca temporal': ['25/9/2026 11:31:51'],
    'Dirección de correo electrónico': ['jefe@ejemplo.com'],
  },
};

describe('survey webhook', () => {
  it('reads the first value of each answer array', () => {
    const extracted = extractSurvey(sample);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.survey.stationName).toBe('Rancho');
    expect(extracted.survey.scoreText).toBe('43 / 44');
    expect(extracted.survey.email).toBe('jefe@ejemplo.com');
  });

  it('turns a fraction into a percent and rejects a score without the total', () => {
    const score = parseSurveyScore('43 / 44');
    expect(score).not.toBeNull();
    expect(Math.round((score ?? 0) * 100) / 100).toBe(97.73);
    expect(scoreHasTotal('43 / 44')).toBe(true);
    expect(scoreHasTotal('44')).toBe(false);
  });

  it('matches station names ignoring case and accents', () => {
    expect(normalizeStationName('La Peñita')).toBe(normalizeStationName('LA PEÑITA'));
    expect(normalizeStationName('las Garzas')).toBe(normalizeStationName('LAS GARZAS'));
  });

  it('keeps the last minute of September in that month', () => {
    expect(parseMexicoTimestamp('30/9/2026 23:50:00')?.period).toBe('2026-09-01');
  });
});
