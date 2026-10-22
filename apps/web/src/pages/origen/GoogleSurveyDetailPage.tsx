import { useState } from 'react';
import { ArrowCounterClockwise, ArrowLeft, EyeSlash } from '@phosphor-icons/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ExcludeSurveyDialog } from '../../components/origen/ExcludeSurveyDialog';
import { SurveyScore } from '../../components/surveys/SurveyScore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useGoogleSurvey, useSetSurveyExcluded } from '../../hooks/useGoogleSurveys';
import { ApiError } from '../../lib/api';
import { sectionLabel } from '../../lib/surveySections';

const KIND_LABEL = { yes: 'Sí', no: 'No', na: 'N/A', text: 'Comentario' } as const;

export function GoogleSurveyDetailPage() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canAdjust = can('origen.gestionar');
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const survey = useGoogleSurvey(id);
  const update = useSetSurveyExcluded();
  const [open, setOpen] = useState(false);
  const data = survey.data;

  const confirm = (reason?: string) => {
    if (!data) return;
    const excluded = !data.excluded;
    update.mutate(
      { id: data.id, excluded, ...(reason ? { reason } : {}) },
      {
        onSuccess: () => {
          showToast(excluded ? 'La encuesta ya no cuenta en los promedios' : 'La encuesta vuelve a contar en los promedios', 'success');
          setOpen(false);
        },
        onError: (error) => showToast(error instanceof ApiError ? error.message : 'No se pudo actualizar la encuesta', 'danger'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/origen/google?${searchParams.toString()}`} className="inline-flex items-center gap-2 text-sm text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden />
        Todas las encuestas
      </Link>

      {survey.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {survey.isError && (
        <Card>
          <p className="text-center text-sm text-danger">
            {survey.error instanceof ApiError ? survey.error.message : 'No se pudo cargar la encuesta.'}
          </p>
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-fg">{data.stationName}</h1>
              <p className="text-sm text-muted">
                {data.zoneName} · {new Date(data.submittedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {data.respondentName ? (
                <p className="text-sm text-fg">
                  {data.respondentName}
                  {data.email && <span className="block text-xs text-muted">{data.email}</span>}
                </p>
              ) : (
                data.email && <p className="text-sm text-muted">{data.email}</p>
              )}
              <div className="mt-1 text-sm text-fg">
                <SurveyScore
                  scoreText={data.scoreText}
                  score={data.score}
                  formScoreText={data.formScoreText}
                  naCount={data.naCount}
                />
              </div>
              {data.excluded && (
                <p className="mt-2 text-sm text-muted">
                  No considerada{data.excludedReason ? `: ${data.excludedReason}` : ''}
                  {data.excludedByName ? ` · ${data.excludedByName}` : ''}
                </p>
              )}
            </div>
            {canAdjust && (
              <Button
                type="button"
                variant={data.excluded ? 'secondary' : 'danger'}
                aria-label={data.excluded ? 'Volver a considerar' : 'No considerar'}
                title={data.excluded ? 'Volver a considerar' : 'No considerar'}
                className="h-11 w-11 px-0"
                onClick={() => setOpen(true)}
              >
                {data.excluded ? <ArrowCounterClockwise size={20} /> : <EyeSlash size={20} />}
              </Button>
            )}
          </div>

          {data.sections.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Esta encuesta no trae respuestas por sección.</p>
            </Card>
          ) : (
            data.sections.map((section) => (
              <Card key={section.section}>
                <CardTitle className="mb-4">{sectionLabel(section.section)}</CardTitle>
                <ul className="flex flex-col gap-3">
                  {section.answers.map((answer) => (
                    <li key={`${section.section}-${answer.question}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-fg">
                        {answer.questionNo ? `${answer.questionNo}. ` : ''}
                        {answer.question}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={answer.kind === 'yes' ? 'success' : answer.kind === 'no' ? 'danger' : 'neutral'}>
                          {KIND_LABEL[answer.kind]}
                        </Badge>
                        {answer.kind === 'text' && <span className="max-w-64 text-muted">{answer.value}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}

          <ExcludeSurveyDialog
            open={open}
            mode={data.excluded ? 'include' : 'exclude'}
            isLoading={update.isPending}
            onClose={() => setOpen(false)}
            onConfirm={confirm}
          />
        </>
      )}
    </div>
  );
}
