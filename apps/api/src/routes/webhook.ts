import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { apiEnv } from '../config/apiEnv.js';
import { db } from '../db/index.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import {
  bodyKeys,
  clientIp,
  interpretBody,
  sanitizeHeaders,
  sanitizeQuery,
  tokenMatches,
} from '../services/webhooks/inbound.js';
import { recalculateSurveyScores } from '../services/surveys/surveyScores.js';
import { processSurveyEvent, reprocessSurveyEvents } from '../services/surveys/surveyWebhook.js';
import { NotFoundError, UnauthorizedError } from '../utils/httpErrors.js';
import { sql } from 'kysely';

const BODY_LIMIT = 1_048_576;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  status: z.enum(['pending', 'processed', 'unmatched', 'invalid', 'error']).optional(),
});

const reprocessSchema = z.object({
  all: z.boolean().optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

function passRaw(_request: FastifyRequest, body: string, done: (error: null, body: string) => void): void {
  done(null, body);
}

function providedSecret(request: FastifyRequest): string | undefined {
  const header = request.headers['x-webhook-secret'];
  return typeof header === 'string' && header.length > 0 ? header : undefined;
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  if (!apiEnv.SECRET_TOKEN) {
    app.log.warn('SECRET_TOKEN no está definido: /api/webhook acepta cualquier petición');
  }

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: BODY_LIMIT }, passRaw);
  app.addContentTypeParser('*', { parseAs: 'string', bodyLimit: BODY_LIMIT }, passRaw);

  app.post(
    '/webhook',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (apiEnv.SECRET_TOKEN && !tokenMatches(providedSecret(request), apiEnv.SECRET_TOKEN)) {
        throw new UnauthorizedError('El token del webhook no es válido');
      }

      const contentType = request.headers['content-type'];
      const { body, rawBody } = interpretBody(request.body, typeof contentType === 'string' ? contentType : undefined);
      const headers = sanitizeHeaders(request.headers);
      const query = sanitizeQuery(request.query as Record<string, unknown>);

      const row = await db
        .insertInto('webhook_events')
        .values({
          method: request.method,
          content_type: typeof contentType === 'string' ? contentType : null,
          headers: JSON.stringify(headers),
          query: JSON.stringify(query),
          body: body === null ? null : JSON.stringify(body),
          raw_body: rawBody,
          remote_ip: clientIp(request.ip),
          status: 'pending',
          station_id: null,
          survey_response_id: null,
          processed_at: null,
          message: null,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      let status = 'error';
      try {
        const result = await processSurveyEvent(row.id);
        status = result.status;
        if (result.status === 'processed' && result.stationId && result.period) {
          await recalculateSurveyScores(new Set([`${result.stationId}|${result.period}`]));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo procesar el envío';
        await db
          .updateTable('webhook_events')
          .set({ status: 'error', message, processed_at: new Date() })
          .where('id', '=', row.id)
          .execute();
        request.log.error({ eventId: row.id, err: error }, 'webhook no procesado');
      }

      request.log.info({ eventId: row.id, contentType: contentType ?? null, keys: bodyKeys(body), status }, 'webhook recibido');

      return reply.send({ ok: true, id: row.id, status });
    },
  );

  app.get(
    '/webhook/events',
    { preHandler: [authenticate, authorize('integraciones.gestionar')] },
    async (request) => {
      const { limit, status } = listQuerySchema.parse(request.query);
      let query = db
        .selectFrom('webhook_events as e')
        .leftJoin('stations as s', 's.id', 'e.station_id')
        .select([
          'e.id',
          'e.status',
          'e.message',
          'e.created_at',
          'e.processed_at',
          'e.station_id',
          's.name as station_name',
          sql<string | null>`e.body->'respuestas'->'Estación de Servicio'->>0`.as('received_station'),
          sql<string | null>`e.body->'respuestas'->'Puntuación'->>0`.as('received_score'),
          sql<string | null>`coalesce(e.body->>'fecha', e.body->'respuestas'->'Marca temporal'->>0)`.as('received_at'),
        ])
        .orderBy('e.created_at', 'desc')
        .limit(limit);
      if (status) query = query.where('e.status', '=', status);
      return query.execute();
    },
  );

  app.post(
    '/webhook/events/reprocess',
    { preHandler: [authenticate, authorize('integraciones.gestionar')] },
    async (request) => {
      const raw = request.body;
      const parsed: unknown = typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : raw ?? {};
      const input = reprocessSchema.parse(parsed && typeof parsed === 'object' ? parsed : {});
      return reprocessSurveyEvents(input.all === true);
    },
  );

  app.get(
    '/webhook/events/:id',
    { preHandler: [authenticate, authorize('integraciones.gestionar')] },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params);
      const event = await db.selectFrom('webhook_events').selectAll().where('id', '=', id).executeTakeFirst();
      if (!event) throw new NotFoundError('No se encontró el evento');
      return event;
    },
  );
}
