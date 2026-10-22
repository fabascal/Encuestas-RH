import { excludeSurveySchema, googleSurveyQuerySchema, nexusOilQuerySchema, nexusRefetchSchema } from '@portal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { getGoogleSurvey, listGoogleSurveys, setGoogleSurveyExcluded } from '../services/origen/googleSurveys.js';
import { getRefetchStatus, listNexusOil, refetchNexus } from '../services/origen/nexusOil.js';

export async function origenRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('origen.ver', 'origen.gestionar'));

  app.get('/origen/google/encuestas', async (request) => {
    const query = googleSurveyQuerySchema.parse(request.query);
    return listGoogleSurveys(request.authUser!, query);
  });

  app.get('/origen/google/encuestas/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return getGoogleSurvey(request.authUser!, id);
  });

  app.patch('/origen/google/encuestas/:id', { preHandler: authorize('origen.gestionar') }, async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = excludeSurveySchema.parse(request.body);
    return setGoogleSurveyExcluded(request.authUser!, id, input, request.ip);
  });

  app.get('/origen/nexus/aceite', async (request) => {
    const query = nexusOilQuerySchema.parse(request.query);
    return listNexusOil(request.authUser!, query);
  });

  app.post('/origen/nexus/consultar', { preHandler: authorize('origen.gestionar') }, async (request, reply) => {
    const input = nexusRefetchSchema.parse(request.body);
    const result = await refetchNexus(request.authUser!, input, request.ip);
    return reply.status(202).send(result);
  });

  app.get('/origen/nexus/consultas/:jobId', async (request) => {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params);
    return getRefetchStatus(jobId);
  });
}
