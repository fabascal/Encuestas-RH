import { questionKey, resolveQuestion } from '@portal/shared';

const STATION_FIELD = 'Estación de Servicio';
const SCORE_FIELD = 'Puntuación';
const TIME_FIELD = 'Marca temporal';
const EMAIL_FIELD = 'Dirección de correo electrónico';

export type AnswerKind = 'yes' | 'no' | 'na' | 'text';

export interface SurveySectionAnswer {
  section: string;
  questionNo: number | null;
  question: string;
  value: string;
  kind: AnswerKind;
}

export interface ExtractedSurvey {
  stationName: string;
  scoreText: string;
  submittedAtText: string;
  email: string;
  answers: Record<string, string>;
  sections: SurveySectionAnswer[];
}

export function firstAnswer(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

/** Lowercase, no accents, single spaces. "La Peñita" and "LA PEÑITA" compare equal. */
export function normalizeStationName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function scoreHasTotal(raw: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?$/.test(raw.trim());
}

export interface SurveyGrade {
  yes: number;
  no: number;
  na: number;
  /** yes / (yes + no), as a percent rounded to 2 decimals. Null when nothing was graded. */
  score: number | null;
}

/** N/A and comments are left out. The grade is the share of yes among yes and no. */
export function gradeAnswers(sections: SurveySectionAnswer[]): SurveyGrade {
  let yes = 0;
  let no = 0;
  let na = 0;
  for (const section of sections) {
    if (section.kind === 'yes') yes += 1;
    else if (section.kind === 'no') no += 1;
    else if (section.kind === 'na') na += 1;
  }
  const graded = yes + no;
  return { yes, no, na, score: graded === 0 ? null : Math.round((yes / graded) * 10000) / 100 };
}

const GENERAL_SECTION = 'datos generales';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** SI and Sí are yes, NO is no, N/A is skipped. Anything else is a comment. */
export function classifyAnswer(raw: string): AnswerKind {
  const value = normalizeStationName(raw).replace(/\./g, '');
  if (value === 'si') return 'yes';
  if (value === 'no') return 'no';
  if (value === 'n/a' || value === 'na') return 'na';
  return 'text';
}

/** "3. Realizar protocolo..." becomes number 3 and the text without the number. */
export function splitQuestion(raw: string): { questionNo: number | null; question: string } {
  const match = raw.trim().match(/^(\d+)\.\s*(.+)$/);
  if (!match?.[1] || !match[2]) return { questionNo: null, question: raw.trim() };
  return { questionNo: Number(match[1]), question: match[2].trim() };
}

function findGeneral(secciones: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(secciones)) {
    if (normalizeStationName(key) === GENERAL_SECTION && isRecord(value)) return value;
  }
  return {};
}

function readSections(secciones: Record<string, unknown>): SurveySectionAnswer[] {
  const seen = new Set<string>();
  const rows: SurveySectionAnswer[] = [];
  for (const [sectionName, body] of Object.entries(secciones)) {
    if (normalizeStationName(sectionName) === GENERAL_SECTION || !isRecord(body)) continue;
    const section = sectionName.trim();
    for (const [key, value] of Object.entries(body)) {
      const text = firstAnswer(value);
      if (!text) continue;
      const resolved = resolveQuestion(section, key);
      if (!resolved.question) continue;
      const identity = `${resolved.section}\n${questionKey(resolved.question)}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      rows.push({
        section: resolved.section,
        questionNo: resolved.questionNo,
        question: resolved.question,
        value: text,
        kind: classifyAnswer(text),
      });
    }
  }
  return rows;
}

/** "25/9/2026 11:31:51" is 11:31 in Mexico (UTC-6). The period uses the calendar month in that text. */
export function parseMexicoTimestamp(raw: string): { date: Date; period: string } | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}-06:00`,
  );
  if (Number.isNaN(date.getTime())) return null;
  return { date, period: `${year}-${String(month).padStart(2, '0')}-01` };
}

/** Accepts "28/09/2026 12:20:00" or an ISO instant. The month is the one in Mexico (UTC-6). */
export function parseSurveyTimestamp(raw: string): { date: Date; period: string } | null {
  const mexico = parseMexicoTimestamp(raw);
  if (mexico) return mexico;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const local = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  return { date, period: `${year}-${String(month).padStart(2, '0')}-01` };
}

/** Columns refreshed when the same form submission arrives again. The exclusion mark is intentionally absent. */
export function surveyResponseRefresh(input: {
  answers: string;
  stationId: string;
  period: string;
  email: string | null;
  submittedAt: Date;
}) {
  return {
    answers: input.answers,
    station_id: input.stationId,
    period: input.period,
    respondent_email: input.email,
    submitted_at: input.submittedAt,
  };
}

export function extractSurvey(body: unknown): { ok: true; survey: ExtractedSurvey } | { ok: false; message: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'El envío no trae respuestas' };
  }
  const record = body as Record<string, unknown>;
  if (isRecord(record['secciones'])) {
    return extractSectionSurvey(record, record['secciones']);
  }

  const respuestas = record['respuestas'];
  if (!isRecord(respuestas)) {
    return { ok: false, message: 'El envío no trae respuestas' };
  }
  const stationName = firstAnswer(respuestas[STATION_FIELD]);
  const scoreText = firstAnswer(respuestas[SCORE_FIELD]);
  const submittedAtText = firstAnswer(respuestas[TIME_FIELD]) || firstAnswer(record['fecha']);
  const email = firstAnswer(respuestas[EMAIL_FIELD]);
  if (!stationName || !scoreText || !submittedAtText) {
    return { ok: false, message: 'Faltan la estación, la puntuación o la fecha' };
  }
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(respuestas)) answers[key] = firstAnswer(value);
  return { ok: true, survey: { stationName, scoreText, submittedAtText, email, answers, sections: [] } };
}

function extractSectionSurvey(
  record: Record<string, unknown>,
  secciones: Record<string, unknown>,
): { ok: true; survey: ExtractedSurvey } | { ok: false; message: string } {
  const general = findGeneral(secciones);
  const stationName = firstAnswer(record['estacion']) || firstAnswer(general[STATION_FIELD]);
  const scoreText = firstAnswer(record['puntuacion']) || firstAnswer(general[SCORE_FIELD]);
  const submittedAtText = firstAnswer(general[TIME_FIELD]) || firstAnswer(record['fecha']);
  const email = firstAnswer(general[EMAIL_FIELD]);
  if (!stationName || !scoreText || !submittedAtText) {
    return { ok: false, message: 'Faltan la estación, la puntuación o la fecha' };
  }
  const answers: Record<string, string> = {
    [STATION_FIELD]: stationName,
    [SCORE_FIELD]: scoreText,
    [TIME_FIELD]: submittedAtText,
  };
  if (email) answers[EMAIL_FIELD] = email;
  return {
    ok: true,
    survey: { stationName, scoreText, submittedAtText, email, answers, sections: readSections(secciones) },
  };
}
