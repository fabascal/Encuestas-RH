import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import type { GoogleSurveyDetail, GoogleSurveySection } from '@portal/shared';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SurveyScore } from '../surveys/SurveyScore';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { prefetchSurveySheet, useSurveySheet, useSurveySheets } from '../../hooks/useSurveySheets';
import type { DirectorFilters } from '../../hooks/useDirectorSurveys';
import { MONTH_NAMES, sectionLabel } from '../../lib/surveySections';

const KIND_LABEL = { yes: 'Sí', no: 'No', na: 'N/A', text: 'Comentario' } as const;

export function SurveyFlipbook({
  section,
  filters,
  onClose,
}: {
  section: string;
  filters: DirectorFilters;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<(delta: number) => void>(() => undefined);
  const sheets = useSurveySheets(filters, section, true);
  const [onlyNo, setOnlyNo] = useState(false);
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const lock = useRef(false);
  const startX = useRef<number | null>(null);

  const all = sheets.data?.sheets ?? [];
  const pages = useMemo(() => (onlyNo ? all.filter((sheet) => sheet.sectionNo > 0) : all), [all, onlyNo]);
  const index = pages.length === 0 ? 0 : Math.min(page, pages.length - 1);
  const current = pages[index] ?? null;
  const detail = useSurveySheet(current?.id ?? null);
  const noCount = all.filter((sheet) => sheet.sectionNo > 0).length;

  const step = (delta: number) => {
    if (lock.current) return;
    const next = index + delta;
    if (next < 0 || next >= pages.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPage(next);
      return;
    }
    lock.current = true;
    setTurn(delta > 0 ? 'next' : 'prev');
    window.setTimeout(() => {
      setPage(next);
      setTurn(null);
      lock.current = false;
    }, 350);
  };
  stepRef.current = step;

  useEffect(() => {
    const next = pages[index + 1];
    const previous = pages[index - 1];
    if (next) void prefetchSurveySheet(queryClient, next.id);
    if (previous) void prefetchSurveySheet(queryClient, previous.id);
  }, [index, pages, queryClient]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const root = dialogRef.current;
    const focusable = () =>
      root ? [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
    focusable()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepRef.current(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepRef.current(-1);
      } else if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [onClose]);

  const monthName = filters.month ? (MONTH_NAMES[filters.month - 1] ?? '') : '';
  const title = monthName
    ? `Encuestas de ${sectionLabel(section)} · ${monthName} ${filters.year}`
    : `Encuestas de ${sectionLabel(section)}`;
  const ordered = orderSections(detail.data?.sections ?? [], section);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flipbook-title"
        className="relative z-10 flex max-h-[100dvh] w-full flex-col bg-bg sm:m-4 sm:max-h-[92vh] sm:max-w-5xl sm:rounded-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="flipbook-title" className="text-base font-semibold text-fg">
              {title}
            </h2>
            <p className="text-sm text-muted">{pages.length === 0 ? 'Sin hojas' : `Hoja ${index + 1} de ${pages.length}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={onlyNo}
              onClick={() => {
                setOnlyNo((current) => !current);
                setPage(0);
              }}
              className={`h-11 rounded-control px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${onlyNo ? 'bg-danger text-on-brand' : 'border border-border bg-surface text-fg'}`}
            >
              Solo con no ({noCount})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-surface"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-stretch gap-2 p-3 sm:p-4">
          <button
            type="button"
            aria-label="Hoja anterior"
            disabled={index <= 0 || pages.length === 0}
            onClick={() => step(-1)}
            className="hidden h-11 w-11 shrink-0 self-center items-center justify-center rounded-control border border-border bg-surface text-fg disabled:opacity-40 sm:flex"
          >
            <CaretLeft size={18} />
          </button>
          <div className="min-w-0 flex-1 [perspective:1200px]">
            {sheets.isLoading && <SheetSkeleton />}
            {!sheets.isLoading && pages.length === 0 && (
              <p className="px-4 py-16 text-center text-sm text-muted">
                {onlyNo ? 'No hay encuestas con no en esta sección' : 'No hay encuestas en esta sección'}
              </p>
            )}
            {current && (
              <article
                onPointerDown={(event) => {
                  startX.current = event.clientX;
                }}
                onPointerUp={(event) => {
                  if (startX.current === null) return;
                  const delta = event.clientX - startX.current;
                  startX.current = null;
                  if (delta > 48) step(-1);
                  else if (delta < -48) step(1);
                }}
                className={`mx-auto h-full max-h-[calc(100dvh-13rem)] max-w-3xl overflow-y-auto rounded-card bg-surface p-4 shadow-xl transition-[transform,opacity] duration-300 ease-in motion-reduce:transform-none motion-reduce:transition-none sm:p-6 ${
                  turn === 'next' ? 'opacity-40 [transform:rotateY(-75deg)]' : turn === 'prev' ? 'opacity-40 [transform:rotateY(75deg)]' : ''
                }`}
                style={{ transformOrigin: turn === 'prev' ? 'right center' : 'left center' }}
              >
                {detail.isLoading || !detail.data ? (
                  <SheetSkeleton />
                ) : (
                  <SheetPage detail={detail.data} focus={section} ordered={ordered} showOrigin={can('origen.ver')} />
                )}
              </article>
            )}
          </div>
          <button
            type="button"
            aria-label="Hoja siguiente"
            disabled={index >= pages.length - 1}
            onClick={() => step(1)}
            className="hidden h-11 w-11 shrink-0 self-center items-center justify-center rounded-control border border-border bg-surface text-fg disabled:opacity-40 sm:flex"
          >
            <CaretRight size={18} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-border p-3 sm:hidden">
          <button type="button" aria-label="Hoja anterior" disabled={index <= 0 || pages.length === 0} onClick={() => step(-1)} className="flex h-11 w-11 items-center justify-center rounded-control border border-border bg-surface disabled:opacity-40">
            <CaretLeft size={18} />
          </button>
          <button type="button" aria-label="Hoja siguiente" disabled={index >= pages.length - 1} onClick={() => step(1)} className="flex h-11 w-11 items-center justify-center rounded-control border border-border bg-surface disabled:opacity-40">
            <CaretRight size={18} />
          </button>
        </div>

        {pages.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-4">
            {pages.map((sheet, dot) => (
              <button
                key={sheet.id}
                type="button"
                aria-label={`Hoja ${dot + 1}, ${sheet.stationName}${sheet.sectionNo > 0 ? ', con no' : ''}`}
                aria-current={dot === index ? 'true' : undefined}
                onClick={() => setPage(dot)}
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${sheet.sectionNo > 0 ? 'bg-danger' : 'bg-border'} ${dot === index ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function orderSections(sections: GoogleSurveySection[], focus: string): GoogleSurveySection[] {
  return [...sections.filter((item) => item.section === focus), ...sections.filter((item) => item.section !== focus)];
}

function SheetPage({
  detail,
  focus,
  ordered,
  showOrigin,
}: {
  detail: GoogleSurveyDetail;
  focus: string;
  ordered: GoogleSurveySection[];
  showOrigin: boolean;
}) {
  const when = new Date(detail.submittedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="flex flex-col gap-4">
      <header>
        {detail.respondentName ? (
          <>
            <p className="text-lg font-semibold text-fg">{detail.respondentName}</p>
            {detail.email && <p className="text-xs text-muted">{detail.email}</p>}
          </>
        ) : (
          <p className="text-lg font-semibold text-fg">{detail.email ?? 'Sin correo'}</p>
        )}
        <p className="mt-1 text-sm text-muted">{when}</p>
        <p className="text-sm text-fg">
          {detail.stationName} · {detail.zoneName}
        </p>
        <div className="mt-1 text-sm text-fg">
          <SurveyScore
            scoreText={detail.scoreText}
            score={detail.score}
            formScoreText={detail.formScoreText}
            naCount={detail.naCount}
          />
        </div>
        {showOrigin && (
          <Link to={`/origen/google/${detail.id}`} className="mt-2 inline-block text-sm text-brand hover:underline">
            Ver en Orígenes de datos
          </Link>
        )}
      </header>
      {ordered.map((item) => {
        const reviewed = item.section === focus;
        return (
          <section key={item.section} className={`rounded-card border p-4 ${reviewed ? 'border-brand ring-2 ring-brand' : 'border-border'}`}>
            <h3 className="mb-3 text-sm font-semibold text-fg">
              {sectionLabel(item.section)}
              {reviewed && <span className="ml-2 text-xs font-medium text-brand">Sección revisada</span>}
            </h3>
            <ul className="flex flex-col gap-2">
              {item.answers.map((answer) => (
                <li
                  key={`${item.section}-${answer.question}`}
                  className={`flex items-start justify-between gap-3 text-sm ${answer.kind === 'no' ? 'rounded-control bg-danger-soft px-2 py-1' : ''}`}
                >
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
          </section>
        );
      })}
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-6 w-48 animate-pulse rounded-control bg-border" />
      <div className="h-4 w-32 animate-pulse rounded-control bg-border" />
      <div className="mt-4 h-24 animate-pulse rounded-card bg-border" />
      <div className="h-24 animate-pulse rounded-card bg-border" />
    </div>
  );
}
