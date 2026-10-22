import { describe, expect, it } from 'vitest';
import { classifyAnswer, extractSurvey, gradeAnswers, parseSurveyTimestamp, splitQuestion, surveyResponseRefresh } from './surveyPayload.js';

const sectioned = {
  fecha: '2026-09-28T18:20:00.000Z',
  puntuacion: '41 / 44',
  estacion: '8 de julio',
  secciones: {
    'DATOS GENERALES': {
      'Marca temporal': '28/09/2026 12:20:00',
      'Dirección de correo electrónico': 'ejemplo@combu-express.com.mx',
      Puntuación: '41 / 44',
      'Estación de Servicio': '8 de julio',
    },
    'SERVICIO AL CLIENTE': {
      '3. Realizar protocolo de los 5 pasos': 'SI',
      '4. Personal con Uniforme (limpios y en buen estado)': 'Sí',
      '8. COMENTARIOS SERVICIO AL CLIENTE': 'Todo en orden',
    },
    LIMPIEZA: {
      '9. Limpieza del área de bombas': 'SI',
      '10. limpieza de baños públicos': 'NO',
      '11. Faldón diesel': 'N/A',
    },
    OTROS: {
      'Sin número': 'No',
    },
  },
};

describe('survey sections payload', () => {
  it('reads the sectioned form and skips general data', () => {
    const extracted = extractSurvey(sectioned);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.survey.stationName).toBe('8 de julio');
    expect(extracted.survey.scoreText).toBe('41 / 44');
    expect(extracted.survey.submittedAtText).toBe('28/09/2026 12:20:00');
    expect(extracted.survey.email).toBe('ejemplo@combu-express.com.mx');
    expect(extracted.survey.sections.map((row) => row.section)).not.toContain('DATOS GENERALES');
    expect(extracted.survey.sections).toEqual([
      {
        section: 'SERVICIO AL CLIENTE',
        questionNo: 3,
        question: 'Realizar protocolo de los 5 pasos',
        value: 'SI',
        kind: 'yes',
      },
      {
        section: 'SERVICIO AL CLIENTE',
        questionNo: 4,
        question: 'Personal con Uniforme (limpios y en buen estado)',
        value: 'Sí',
        kind: 'yes',
      },
      {
        section: 'SERVICIO AL CLIENTE',
        questionNo: 8,
        question: 'COMENTARIOS SERVICIO AL CLIENTE',
        value: 'Todo en orden',
        kind: 'text',
      },
      {
        section: 'LIMPIEZA',
        questionNo: 9,
        question: 'Limpieza del área de bombas',
        value: 'SI',
        kind: 'yes',
      },
      {
        section: 'LIMPIEZA',
        questionNo: 10,
        question: 'limpieza de baños públicos',
        value: 'NO',
        kind: 'no',
      },
      {
        section: 'LIMPIEZA',
        questionNo: 11,
        question: 'Faldón diesel',
        value: 'N/A',
        kind: 'na',
      },
      {
        section: 'RESULTADOS GENERALES',
        questionNo: null,
        question: 'Sin número',
        value: 'No',
        kind: 'no',
      },
    ]);
  });

  it('puts a mistyped instalaciones question back in its section with its number', () => {
    const extracted = extractSurvey({
      fecha: '2026-09-28T18:20:00.000Z',
      puntuacion: '41 / 44',
      estacion: '8 de julio',
      secciones: {
        OTRAS_PREGUNTAS: {
          'Dispensarios de combustible (pintura, calcas, displays,  y estado físico)': 'NO',
          'Recipientes para Basura (calcas,pintura y estado físico)': 'SI',
        },
        INSTALACIONES: {
          '28. Dispensarios de combustible (pintura, calcas, displays, y estado físico)': 'SI',
        },
        OTROS: {
          'Areas verdes': 'NO',
          'COMENTARIOS GENERALES': 'Sin novedad',
        },
        LIMPIEZA: {
          'Pregunta que no está en el mapa': 'SI',
        },
      },
    });
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.survey.sections).toEqual([
      {
        section: 'INSTALACIONES',
        questionNo: 28,
        question: 'Dispensarios de combustible (pintura, calcas, displays, y estado físico)',
        value: 'NO',
        kind: 'no',
      },
      {
        section: 'INSTALACIONES',
        questionNo: 31,
        question: 'Recipientes para Basura (calcas, pintura y estado físico)',
        value: 'SI',
        kind: 'yes',
      },
      {
        section: 'RESULTADOS GENERALES',
        questionNo: 49,
        question: 'Areas verdes',
        value: 'NO',
        kind: 'no',
      },
      {
        section: 'RESULTADOS GENERALES',
        questionNo: 53,
        question: 'COMENTARIOS GENERALES',
        value: 'Sin novedad',
        kind: 'text',
      },
      {
        section: 'LIMPIEZA',
        questionNo: null,
        question: 'Pregunta que no está en el mapa',
        value: 'SI',
        kind: 'yes',
      },
    ]);
  });

  it('grades yes over yes and no, and leaves N/A and comments out', () => {
    const sections = [
      ...Array.from({ length: 36 }, () => ({ section: 'INSTALACIONES', questionNo: null, question: 'sí', value: 'SI', kind: 'yes' as const })),
      ...Array.from({ length: 6 }, () => ({ section: 'INSTALACIONES', questionNo: null, question: 'no', value: 'NO', kind: 'no' as const })),
      ...Array.from({ length: 3 }, () => ({ section: 'INSTALACIONES', questionNo: null, question: 'na', value: 'N/A', kind: 'na' as const })),
      { section: 'INSTALACIONES', questionNo: 41, question: 'COMENTARIOS', value: 'Nota', kind: 'text' as const },
    ];
    expect(gradeAnswers(sections)).toEqual({ yes: 36, no: 6, na: 3, score: 85.71 });
    expect(gradeAnswers(sections.filter((row) => row.kind === 'na' || row.kind === 'text'))).toEqual({
      yes: 0,
      no: 0,
      na: 3,
      score: null,
    });
  });

  it('classifies yes, no and n/a without caring about accents', () => {
    expect(classifyAnswer('Sí')).toBe('yes');
    expect(classifyAnswer('NO')).toBe('no');
    expect(classifyAnswer('N/A')).toBe('na');
    expect(classifyAnswer('N.A.')).toBe('na');
    expect(classifyAnswer('Todo en orden')).toBe('text');
  });

  it('splits a numbered question and leaves a bare title alone', () => {
    expect(splitQuestion('3. Realizar protocolo de los 5 pasos')).toEqual({
      questionNo: 3,
      question: 'Realizar protocolo de los 5 pasos',
    });
    expect(splitQuestion('COMENTARIOS GENERALES')).toEqual({
      questionNo: null,
      question: 'COMENTARIOS GENERALES',
    });
  });

  it('keeps the old flat payload and returns no sections', () => {
    const extracted = extractSurvey({
      fecha: '25/9/2026 11:31:51',
      respuestas: {
        'Estación de Servicio': ['Rancho'],
        Puntuación: ['43 / 44'],
        'Marca temporal': ['25/9/2026 11:31:51'],
      },
    });
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.survey.stationName).toBe('Rancho');
    expect(extracted.survey.sections).toEqual([]);
  });

  it('does not clear the exclusion mark when the same submission arrives again', () => {
    const keys = Object.keys(
      surveyResponseRefresh({
        answers: '{}',
        stationId: 'station',
        period: '2026-09-01',
        email: null,
        submittedAt: new Date('2026-09-28T18:20:00.000Z'),
      }),
    );
    expect(keys).not.toContain('excluded');
    expect(keys).not.toContain('excluded_reason');
    expect(keys).not.toContain('excluded_by');
    expect(keys).not.toContain('excluded_at');
  });

  it('turns an ISO instant into the Mexico calendar month', () => {
    expect(parseSurveyTimestamp('2026-09-28T18:20:00.000Z')?.period).toBe('2026-09-01');
    expect(parseSurveyTimestamp('28/09/2026 12:20:00')?.period).toBe('2026-09-01');
  });
});
