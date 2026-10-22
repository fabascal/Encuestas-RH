-- migrate:up

-- The form map has 51 questions, numbered 3 to 53. The key matches questionKey:
-- drop a leading number, lowercase, one space after each comma, collapse spaces, trim.
WITH catalog(section, question_no, question) AS (
  VALUES
    ('SERVICIO AL CLIENTE', 3, 'Realizar protocolo de los 5 pasos'),
    ('SERVICIO AL CLIENTE', 4, 'Personal con Uniforme (limpios y en buen estado)'),
    ('SERVICIO AL CLIENTE', 5, 'Ticketeras en buen estado y cerradas?'),
    ('SERVICIO AL CLIENTE', 6, 'Personal con Calzado de Trabajo (en buen estado)'),
    ('SERVICIO AL CLIENTE', 7, 'Personal con Gafete de Identificación (en buen estado)'),
    ('SERVICIO AL CLIENTE', 8, 'COMENTARIOS SERVICIO AL CLIENTE'),
    ('LIMPIEZA', 9, 'Limpieza del área de bombas'),
    ('LIMPIEZA', 10, 'limpieza de baños públicos'),
    ('LIMPIEZA', 11, 'Limpieza de baños empleados'),
    ('LIMPIEZA', 12, 'Limpieza área de oficinas'),
    ('LIMPIEZA', 13, 'Limpieza de almacén'),
    ('LIMPIEZA', 14, 'Limpieza de exhibidores de aceites'),
    ('LIMPIEZA', 15, 'Limpieza cuarto de maquinas y/o cuarto eléctrico'),
    ('LIMPIEZA', 16, 'Limpieza zona de tanques de almacenamiento'),
    ('LIMPIEZA', 17, 'Limpieza de columnas soporte de techumbres'),
    ('LIMPIEZA', 18, 'Limpieza gasolinera en general.'),
    ('LIMPIEZA', 19, 'COMENTARIO LIMPIEZA'),
    ('INSTALACIONES', 20, 'Baños en buenas condiciones'),
    ('INSTALACIONES', 21, 'Anuncio Independiente (iluminación)'),
    ('INSTALACIONES', 22, 'Techumbre zona gasolinas (pintura y estado físico)'),
    ('INSTALACIONES', 23, 'Techumbre zona Diesel (pintura y estado físico)'),
    ('INSTALACIONES', 24, 'Guarniciones de isla (pintura y estado físico)'),
    ('INSTALACIONES', 25, 'Protecciones de isla (pintura, Franjas reflejantes y estado físico)'),
    ('INSTALACIONES', 26, 'Exhibidores de aceites (pintura y estado físico de conservación)'),
    ('INSTALACIONES', 27, 'Dispensarios de agua'),
    ('INSTALACIONES', 28, 'Dispensarios de combustible (pintura, calcas, displays, y estado físico)'),
    ('INSTALACIONES', 29, 'Fachada del edificio (pintura y estado físico)'),
    ('INSTALACIONES', 30, 'Muros perimetrales (pintura y estado físico)'),
    ('INSTALACIONES', 31, 'Recipientes para Basura (calcas, pintura y estado físico)'),
    ('INSTALACIONES', 32, 'Recipientes para Residuos Peligrosos (calcas, pintura y estado físico)'),
    ('INSTALACIONES', 33, 'Limpieza en las bocatomas del área de tanque'),
    ('INSTALACIONES', 34, 'Limpieza de la bomba sumergible'),
    ('INSTALACIONES', 35, 'Limpieza de contenedores de bombas'),
    ('INSTALACIONES', 36, 'Condiciones de señaletica en general'),
    ('INSTALACIONES', 37, 'Faldones zona gasolina (logo, texto, franjas)'),
    ('INSTALACIONES', 38, 'Faldones zona gasolina (iluminación)'),
    ('INSTALACIONES', 39, 'Faldones zona Diesel (logo, texto, franjas)'),
    ('INSTALACIONES', 40, 'Faldones zona Diesel (iluminación)'),
    ('INSTALACIONES', 41, 'COMENTARIOS INSTALACIONES'),
    ('BOMBAS', 42, 'Bombas en buenas condiciones'),
    ('BOMBAS', 43, 'Bombas en servicio'),
    ('BOMBAS', 44, 'COMENTARIOS BOMBAS'),
    ('TERMINALES', 45, 'Terminales cargadas (baterias)'),
    ('TERMINALES', 46, 'Terminales en buenas condiciones'),
    ('TERMINALES', 47, 'Terminales en servicio'),
    ('TERMINALES', 48, 'COMENTARIOS TERMINALES'),
    ('RESULTADOS GENERALES', 49, 'Areas verdes'),
    ('RESULTADOS GENERALES', 50, 'Libre acceso'),
    ('RESULTADOS GENERALES', 51, 'Aceiteras limpias y surtidas'),
    ('RESULTADOS GENERALES', 52, 'Los botes amarillos cuentan con musgo'),
    ('RESULTADOS GENERALES', 53, 'COMENTARIOS GENERALES')
),
keyed AS (
  SELECT
    section,
    question_no::integer AS question_no,
    question,
    trim(regexp_replace(regexp_replace(lower(regexp_replace(question, '^\d+\.\s*', '')), '\s*,\s*', ', ', 'g'), '\s+', ' ', 'g')) AS key
  FROM catalog
)
UPDATE survey_answers AS a
SET
  section = k.section,
  question_no = k.question_no,
  question = k.question
FROM keyed AS k
WHERE trim(regexp_replace(regexp_replace(lower(regexp_replace(a.question, '^\d+\.\s*', '')), '\s*,\s*', ', ', 'g'), '\s+', ' ', 'g')) = k.key;

UPDATE survey_answers
SET section = 'RESULTADOS GENERALES'
WHERE section = 'OTROS';

-- migrate:down

-- The wording that arrived stays in webhook_events. This correction is not reversed.
