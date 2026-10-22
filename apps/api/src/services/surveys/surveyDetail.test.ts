import { describe, expect, it } from 'vitest';
import { orderSurveyAnswers } from './surveyOrder.js';

describe('survey answer order', () => {
  it('puts comments last, then the question number, then the text', () => {
    const ordered = orderSurveyAnswers([
      { questionNo: null, question: 'COMENTARIOS', value: 'hola', kind: 'text' },
      { questionNo: 4, question: 'Uniforme', value: 'SI', kind: 'yes' },
      { questionNo: null, question: 'Sin número', value: 'NO', kind: 'no' },
      { questionNo: 3, question: 'Protocolo', value: 'NO', kind: 'no' },
      { questionNo: 3, question: 'Baños', value: 'SI', kind: 'yes' },
    ]);

    expect(ordered.map((row) => row.question)).toEqual(['Baños', 'Protocolo', 'Uniforme', 'Sin número', 'COMENTARIOS']);
  });
});
