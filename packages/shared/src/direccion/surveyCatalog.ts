export interface SurveyCatalogQuestion {
  no: number;
  question: string;
}

export interface ResolvedQuestion {
  section: string;
  questionNo: number | null;
  question: string;
}

export const SURVEY_CATALOG: Record<string, readonly SurveyCatalogQuestion[]> = {
  'SERVICIO AL CLIENTE': [
    { no: 3, question: 'Realizar protocolo de los 5 pasos' },
    { no: 4, question: 'Personal con Uniforme (limpios y en buen estado)' },
    { no: 5, question: 'Ticketeras en buen estado y cerradas?' },
    { no: 6, question: 'Personal con Calzado de Trabajo (en buen estado)' },
    { no: 7, question: 'Personal con Gafete de Identificación (en buen estado)' },
    { no: 8, question: 'COMENTARIOS SERVICIO AL CLIENTE' },
  ],
  LIMPIEZA: [
    { no: 9, question: 'Limpieza del área de bombas' },
    { no: 10, question: 'limpieza de baños públicos' },
    { no: 11, question: 'Limpieza de baños empleados' },
    { no: 12, question: 'Limpieza área de oficinas' },
    { no: 13, question: 'Limpieza de almacén' },
    { no: 14, question: 'Limpieza de exhibidores de aceites' },
    { no: 15, question: 'Limpieza cuarto de maquinas y/o cuarto eléctrico' },
    { no: 16, question: 'Limpieza zona de tanques de almacenamiento' },
    { no: 17, question: 'Limpieza de columnas soporte de techumbres' },
    { no: 18, question: 'Limpieza gasolinera en general.' },
    { no: 19, question: 'COMENTARIO LIMPIEZA' },
  ],
  INSTALACIONES: [
    { no: 20, question: 'Baños en buenas condiciones' },
    { no: 21, question: 'Anuncio Independiente (iluminación)' },
    { no: 22, question: 'Techumbre zona gasolinas (pintura y estado físico)' },
    { no: 23, question: 'Techumbre zona Diesel (pintura y estado físico)' },
    { no: 24, question: 'Guarniciones de isla (pintura y estado físico)' },
    { no: 25, question: 'Protecciones de isla (pintura, Franjas reflejantes y estado físico)' },
    { no: 26, question: 'Exhibidores de aceites (pintura y estado físico de conservación)' },
    { no: 27, question: 'Dispensarios de agua' },
    { no: 28, question: 'Dispensarios de combustible (pintura, calcas, displays, y estado físico)' },
    { no: 29, question: 'Fachada del edificio (pintura y estado físico)' },
    { no: 30, question: 'Muros perimetrales (pintura y estado físico)' },
    { no: 31, question: 'Recipientes para Basura (calcas, pintura y estado físico)' },
    { no: 32, question: 'Recipientes para Residuos Peligrosos (calcas, pintura y estado físico)' },
    { no: 33, question: 'Limpieza en las bocatomas del área de tanque' },
    { no: 34, question: 'Limpieza de la bomba sumergible' },
    { no: 35, question: 'Limpieza de contenedores de bombas' },
    { no: 36, question: 'Condiciones de señaletica en general' },
    { no: 37, question: 'Faldones zona gasolina (logo, texto, franjas)' },
    { no: 38, question: 'Faldones zona gasolina (iluminación)' },
    { no: 39, question: 'Faldones zona Diesel (logo, texto, franjas)' },
    { no: 40, question: 'Faldones zona Diesel (iluminación)' },
    { no: 41, question: 'COMENTARIOS INSTALACIONES' },
  ],
  BOMBAS: [
    { no: 42, question: 'Bombas en buenas condiciones' },
    { no: 43, question: 'Bombas en servicio' },
    { no: 44, question: 'COMENTARIOS BOMBAS' },
  ],
  TERMINALES: [
    { no: 45, question: 'Terminales cargadas (baterias)' },
    { no: 46, question: 'Terminales en buenas condiciones' },
    { no: 47, question: 'Terminales en servicio' },
    { no: 48, question: 'COMENTARIOS TERMINALES' },
  ],
  'RESULTADOS GENERALES': [
    { no: 49, question: 'Areas verdes' },
    { no: 50, question: 'Libre acceso' },
    { no: 51, question: 'Aceiteras limpias y surtidas' },
    { no: 52, question: 'Los botes amarillos cuentan con musgo' },
    { no: 53, question: 'COMENTARIOS GENERALES' },
  ],
};

/** Comparable title: no leading number, lowercase, one space, comma followed by a space. */
export function questionKey(text: string): string {
  return text
    .replace(/^\d+\.\s*/, '')
    .toLowerCase()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface CatalogEntry {
  section: string;
  no: number;
  question: string;
}

const BY_KEY = new Map<string, CatalogEntry>();
for (const [section, questions] of Object.entries(SURVEY_CATALOG)) {
  for (const item of questions) {
    BY_KEY.set(questionKey(item.question), { section, no: item.no, question: item.question });
  }
}

/** Catalog wins over the section the form sent. Unknown titles keep their section, except OTROS. */
export function resolveQuestion(section: string, text: string): ResolvedQuestion {
  const found = BY_KEY.get(questionKey(text));
  if (found) return { section: found.section, questionNo: found.no, question: found.question };

  const match = text.trim().match(/^(\d+)\.\s*(.+)$/);
  const number = match?.[1];
  const question = (match?.[2] ?? text).trim();
  const incoming = section.trim();
  return {
    section: incoming.toUpperCase() === 'OTROS' ? 'RESULTADOS GENERALES' : incoming,
    questionNo: number ? Number(number) : null,
    question,
  };
}
