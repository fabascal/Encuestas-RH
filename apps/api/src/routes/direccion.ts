import { directorOilQuerySchema, directorSheetsQuerySchema, directorSurveyQuerySchema } from '@portal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { buildSurveyCoverage } from '../services/direccion/surveyCoverage.js';
import { getSectionSheet, listSectionSheets } from '../services/direccion/surveySheets.js';
import { buildDirectorSurveys } from '../services/direccion/surveySections.js';
import { buildDirectorOil } from '../services/oil/oilSales.js';

export async function direccionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/direccion/encuestas', { preHandler: authorize('direccion.ver') }, async (request) => {
    const query = directorSurveyQuerySchema.parse(request.query);
    return buildDirectorSurveys(request.authUser!, query);
  });

  app.get('/direccion/encuestas/cobertura', { preHandler: authorize('direccion.ver') }, async (request) => {
    const query = directorSurveyQuerySchema.parse(request.query);
    return buildSurveyCoverage(request.authUser!, query);
  });

  app.get('/direccion/encuestas/hojas', { preHandler: authorize('direccion.ver') }, async (request) => {
    const query = directorSheetsQuerySchema.parse(request.query);
    return listSectionSheets(request.authUser!, query);
  });

  app.get('/direccion/encuestas/hojas/:id', { preHandler: authorize('direccion.ver') }, async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return getSectionSheet(request.authUser!, id);
  });

  app.get('/direccion/aceite', { preHandler: authorize('direccion.ver') }, async (request) => {
    const query = directorOilQuerySchema.parse(request.query);
    return buildDirectorOil(request.authUser!, query);
  });
}
