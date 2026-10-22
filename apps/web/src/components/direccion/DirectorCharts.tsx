import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, CaretRight } from '@phosphor-icons/react';
import type { DirectorMonth, DirectorQuestionLoss, DirectorSectionScore, DirectorWorstQuestion } from '@portal/shared';
import { percent, points } from '../reports/format';
import { MONTH_LABELS, SECTION_GOAL, TOTAL_COLOR, sectionColor, sectionDelta, sectionLabel } from '../../lib/surveySections';
import { DeltaBadge, GoalBar, goalGap, levelBarClass, useMountAnimation } from './visuals';
import { SurveyFlipbook } from './SurveyFlipbook';
import type { DirectorFilters } from '../../hooks/useDirectorSurveys';

const GAP_PREVIEW = 8;

function sectionAria(section: DirectorSectionScore, delta: number | null): string {
  const label = sectionLabel(section.section);
  const change = delta === null ? '' : ` Cambio contra el mes anterior: ${points(delta)}.`;
  if (section.ratio === null) return `${label}: sin dato. Meta 90 %.`;
  return `${label}: ${percent(section.ratio)}. Meta 90 %. ${goalGap(section.ratio)}.${change} ${section.yes} sí, ${section.no} no, ${section.questions} preguntas.`;
}

function pointsOf(ratio: number): string {
  return (ratio * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

function questionTitle(loss: DirectorQuestionLoss): string {
  return loss.questionNo ? `${loss.questionNo}. ${loss.question}` : loss.question;
}

function questionsToGoal(ratio: number, losses: DirectorQuestionLoss[]): number | null {
  if (ratio >= SECTION_GOAL) return null;
  let running = ratio;
  let count = 0;
  for (const loss of losses) {
    count += 1;
    running += loss.impact;
    if (running + 1e-9 >= SECTION_GOAL) return count;
  }
  return null;
}

function goalFixLabel(count: number): string {
  if (count === 1) return 'Corrigiendo la primera llega a la meta';
  return `Corrigiendo las ${count} primeras llega a la meta`;
}

function dangerShade(index: number, total: number): string {
  const step = total <= 1 ? 0 : index / (total - 1);
  const danger = Math.round(100 - step * 55);
  return `color-mix(in srgb, var(--color-danger) ${danger}%, var(--color-danger-soft))`;
}

function lossKey(loss: DirectorQuestionLoss, index: number): string {
  return `${index}:${loss.questionNo ?? ''}:${loss.question}`;
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    if (!open) {
      setGrown(false);
      const timer = window.setTimeout(() => setMounted(false), 300);
      return () => window.clearTimeout(timer);
    }
    setMounted(true);
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!mounted) return null;
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${grown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function SectionBars({
  sections,
  monthly,
  filters,
}: {
  sections: DirectorSectionScore[];
  monthly: DirectorMonth[];
  filters: DirectorFilters;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const signature = sections.map((section) => `${section.section}:${section.ratio ?? ''}`).join('|');
  const mounted = useMountAnimation(signature);
  const ordered = [...sections].sort((left, right) => {
    if (left.ratio === null && right.ratio === null) return 0;
    if (left.ratio === null) return 1;
    if (right.ratio === null) return -1;
    return left.ratio - right.ratio;
  });
  const canOpenAny = ordered.length > 0;

  return (
    <div className="relative pt-5 [--label:9.75rem] [--value:4.5rem] sm:[--label:13rem]">
      <span
        className="absolute top-0 z-20 -translate-x-1/2 text-[11px] font-medium uppercase tracking-wide text-muted"
        style={{ left: 'calc(var(--label) + (100% - var(--label) - var(--value)) * 0.9)' }}
      >
        Meta 90%
      </span>
      <ul className="flex flex-col gap-4">
        {ordered.map((section, index) => {
          const label = sectionLabel(section.section);
          const delta = sectionDelta(monthly, section.section);
          const detail = `${section.yes} sí, ${section.no} no · ${section.questions} preguntas`;
          const isOpen = openSection === section.section;
          const row = (
            <>
              <div className="flex min-w-0 items-start gap-1 pr-3">
                <CaretRight
                  size={14}
                  aria-hidden
                  className={`mt-0.5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{label}</p>
                  <p className="text-xs text-muted">{section.ratio === null ? 'Sin dato' : goalGap(section.ratio)}</p>
                  <DeltaBadge delta={delta} />
                  <p className="text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{detail}</p>
                </div>
              </div>
              <GoalBar ratio={section.ratio} mounted={mounted} delay={index * 60} />
              <p className="pl-2 text-right text-base font-bold tabular-nums text-fg">{percent(section.ratio)}</p>
            </>
          );
          const rowClass = 'group grid w-full grid-cols-[var(--label)_minmax(0,1fr)_var(--value)] items-center rounded-control text-left';
          return (
            <li key={section.section}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={sectionAria(section, delta)}
                onClick={() => setOpenSection((current) => (current === section.section ? null : section.section))}
                className={`${rowClass} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
              >
                {row}
              </button>
              <Collapse open={isOpen}>
                <SectionGap section={section} filters={filters} />
              </Collapse>
            </li>
          );
        })}
      </ul>
      {canOpenAny && <p className="mt-4 text-xs text-muted">Da clic en una sección para ver qué le resta</p>}
    </div>
  );
}

function SectionGap({ section, filters }: { section: DirectorSectionScore; filters: DirectorFilters }) {
  const [showAll, setShowAll] = useState(false);
  const [activeLoss, setActiveLoss] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const mounted = useMountAnimation(section.section);
  const ratio = section.ratio ?? 0;
  const losses = section.losses;
  const largest = losses[0]?.impact ?? 0;
  const toGoal = section.ratio === null ? null : questionsToGoal(section.ratio, losses);
  const summary = `${sectionLabel(section.section)}: ${percent(section.ratio)}. Faltan ${pointsOf(1 - ratio)} puntos para el 100 %, repartidos en ${losses.length} preguntas.`;

  const selectLoss = (index: number | null) => {
    if (index === null) {
      setActiveLoss(null);
      return;
    }
    const loss = losses[index];
    if (!loss) return;
    setActiveLoss(lossKey(loss, index));
    if (index >= GAP_PREVIEW) setShowAll(true);
  };

  return (
    <div className="mt-3 rounded-card bg-bg p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">Faltan {pointsOf(1 - ratio)} puntos para el 100%</p>
          <p className="text-xs text-muted">
            {losses.length === 0 ? 'Sin respuestas en no' : losses.length === 1 ? '1 pregunta con no' : `${losses.length} preguntas con no`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBookOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          <BookOpen size={16} aria-hidden />
          Ver encuestas
        </button>
      </div>
      {bookOpen && <SurveyFlipbook section={section.section} filters={filters} onClose={() => setBookOpen(false)} />}
      {losses.length === 0 ? (
        <p className="text-sm text-muted">Todas las respuestas son sí</p>
      ) : (
      <>
      <div className="relative pt-5">
        <span
          className="absolute top-0 z-20 -translate-x-1/2 text-[11px] font-medium uppercase tracking-wide text-muted"
          style={{ left: `${SECTION_GOAL * 100}%` }}
        >
          Meta 90%
        </span>
        <div className="relative flex h-8 overflow-hidden rounded-full" role="group" aria-label={summary}>
          <div
            className={`h-full min-w-0 ${levelBarClass(section.ratio)} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
            style={{ width: mounted ? `${Math.max(0, Math.min(ratio, 1)) * 100}%` : '0%' }}
            title={`Calificación ${percent(section.ratio)}`}
          />
          {losses.map((loss, index) => {
            const key = lossKey(loss, index);
            const detail = `${index + 1}. ${questionTitle(loss)}: resta ${pointsOf(loss.impact)} puntos, ${loss.no} no de ${loss.yes + loss.no}`;
            const selected = activeLoss === key;
            const dimmed = activeLoss !== null && !selected;
            return (
              <button
                key={key}
                type="button"
                title={detail}
                aria-label={detail}
                onMouseEnter={() => selectLoss(index)}
                onMouseLeave={() => selectLoss(null)}
                onFocus={() => selectLoss(index)}
                onBlur={() => selectLoss(null)}
                className={`relative h-full min-w-0 appearance-none overflow-hidden border-0 p-0 transition-[width] duration-700 ease-out motion-reduce:transition-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg focus-visible:outline-none ${dimmed ? 'opacity-40' : 'opacity-100'} ${selected ? 'z-20 ring-2 ring-inset ring-fg' : ''}`}
                style={{
                  width: mounted ? `${loss.impact * 100}%` : '0%',
                  backgroundColor: dangerShade(index, losses.length),
                  transitionDelay: `${index * 40}ms`,
                }}
              >
                {loss.impact >= 0.03 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-on-brand">
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-fg/35"
            style={{ left: `${SECTION_GOAL * 100}%` }}
          />
        </div>
      </div>
      {section.ratio !== null && (
        <p className="mt-2 text-xs text-muted">
          {goalGap(section.ratio)}
          {toGoal !== null ? `. ${goalFixLabel(toGoal)}` : ''}
        </p>
      )}
      <ol className="mt-4 flex flex-col gap-1">
        {losses.map((loss, index) => {
          if (!showAll && index >= GAP_PREVIEW) return null;
          const key = lossKey(loss, index);
          const color = dangerShade(index, losses.length);
          const width = largest === 0 ? 0 : (loss.impact / largest) * 100;
          const selected = activeLoss === key;
          return (
            <li key={key}>
              <button
                type="button"
                onMouseEnter={() => selectLoss(index)}
                onMouseLeave={() => selectLoss(null)}
                onFocus={() => selectLoss(index)}
                onBlur={() => selectLoss(null)}
                className={`flex w-full items-start gap-3 rounded-control px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${selected ? 'bg-surface' : ''}`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-brand"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm text-fg">{questionTitle(loss)}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-danger">resta {pointsOf(loss.impact)} pts</span>
                  </span>
                  <span className="mt-1 flex items-center gap-3">
                    <span className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${selected ? 'bg-bg' : 'bg-surface'}`}>
                      <span
                        className="block h-1.5 rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: mounted ? `${width}%` : '0%', backgroundColor: color }}
                      />
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {loss.no} no de {loss.yes + loss.no}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {losses.length > GAP_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-3 text-sm font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {showAll ? 'Ver menos' : `Ver todas (${losses.length})`}
        </button>
      )}
      </>
      )}
    </div>
  );
}

interface TrendSeries {
  id: string;
  label: string;
  color: string;
  values: Array<number | null>;
}

export function SectionTrend({ monthly, sections }: { monthly: DirectorMonth[]; sections: string[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const monthRefs = useRef<Array<SVGRectElement | null>>([]);
  const series: TrendSeries[] = [
    { id: 'total', label: 'Calificación total', color: TOTAL_COLOR, values: monthly.map((month) => month.total) },
    ...sections.map((section, index) => ({
      id: section,
      label: sectionLabel(section),
      color: sectionColor(section, index),
      values: monthly.map((month) => month.sections[section] ?? null),
    })),
  ];
  const visible = series.filter((item) => !hidden.has(item.id));
  const signature = `${visible.map((item) => item.id).join(',')}:${monthly.map((month) => month.total ?? '').join(',')}`;
  const mounted = useMountAnimation(signature);

  const width = 640;
  const height = 248;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const baseline = padTop + innerHeight;

  const point = (index: number, value: number) => {
    const x = padLeft + (monthly.length <= 1 ? innerWidth / 2 : (index / (monthly.length - 1)) * innerWidth);
    const y = padTop + (1 - Math.min(Math.max(value, 0), 1)) * innerHeight;
    return { x, y };
  };

  const yFor = (value: number) => padTop + (1 - value) * innerHeight;
  const slot = monthly.length === 0 ? innerWidth : innerWidth / monthly.length;

  const lineOf = (values: Array<number | null>): string[] => {
    const parts: string[] = [];
    let current: string[] = [];
    values.forEach((value, index) => {
      if (value === null) {
        if (current.length > 0) parts.push(current.join(' '));
        current = [];
        return;
      }
      const { x, y } = point(index, value);
      current.push(`${x},${y}`);
    });
    if (current.length > 0) parts.push(current.join(' '));
    return parts;
  };

  const areaOf = (values: Array<number | null>): string[] => {
    const paths: string[] = [];
    let current: Array<{ x: number; y: number }> = [];
    const close = () => {
      const first = current[0];
      const last = current[current.length - 1];
      if (!first || !last) return;
      const commands = current.map((spot, index) => `${index === 0 ? 'M' : 'L'}${spot.x},${spot.y}`);
      commands.push(`L${last.x},${baseline}`, `L${first.x},${baseline}`, 'Z');
      paths.push(commands.join(' '));
      current = [];
    };
    values.forEach((value, index) => {
      if (value === null) {
        close();
        return;
      }
      current.push(point(index, value));
    });
    close();
    return paths;
  };

  const focusMonth = (index: number) => {
    const next = Math.max(0, Math.min(index, monthly.length - 1));
    setActive(next);
    monthRefs.current[next]?.focus();
  };

  const activeMonth = active === null ? null : monthly[active];
  const activeX = active === null ? 0 : point(active, 0).x;
  const tooltipRows = active === null
    ? []
    : visible
        .map((item) => ({ id: item.id, label: item.label, color: item.color, value: item.values[active] ?? null }))
        .sort((left, right) => (right.value ?? -1) - (left.value ?? -1));

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative"
        onMouseLeave={(event) => {
          if (!event.currentTarget.contains(document.activeElement)) setActive(null);
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Tendencia mensual por sección">
          <defs>
            <linearGradient id="director-total-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-fg)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-fg)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={padLeft} y={yFor(1)} width={innerWidth} height={yFor(SECTION_GOAL) - yFor(1)} fill="var(--color-success)" opacity="0.08" />
          {[0, 0.5, 0.8, 0.9, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke={tick === SECTION_GOAL ? 'var(--color-fg)' : 'var(--color-border)'}
                strokeDasharray={tick === SECTION_GOAL ? '4 4' : undefined}
              />
              <text x={0} y={yFor(tick) + 3} fontSize="10" fill="var(--color-muted)">
                {Math.round(tick * 100)}
              </text>
            </g>
          ))}
          <text x={padLeft + 4} y={yFor(SECTION_GOAL) - 4} fontSize="10" fill="var(--color-muted)">
            Meta 90%
          </text>
          {visible.map((item) => {
            const dim = emphasis !== null && emphasis !== item.id;
            const opacity = dim ? 0.2 : item.id === 'total' ? 1 : 0.55;
            const widthOf = item.id === 'total' ? 3 : 1.5;
            return (
              <g key={item.id} opacity={opacity}>
                {item.id === 'total' &&
                  areaOf(item.values).map((path) => <path key={path} d={path} fill="url(#director-total-area)" stroke="none" />)}
                {lineOf(item.values).map((segment) => (
                  <polyline
                    key={segment}
                    points={segment}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={widthOf}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-[900ms] ease-out motion-reduce:transition-none"
                    style={{ strokeDasharray: 1600, strokeDashoffset: mounted ? 0 : 1600 }}
                  />
                ))}
                {item.values.map((value, index) => {
                  if (value === null) return null;
                  const { x, y } = point(index, value);
                  return <circle key={`${item.id}-${index}`} cx={x} cy={y} r={item.id === 'total' ? 3.5 : 2.2} fill={item.color} />;
                })}
              </g>
            );
          })}
          {active !== null && <line x1={activeX} x2={activeX} y1={padTop} y2={baseline} stroke="var(--color-fg)" strokeOpacity="0.35" />}
          {monthly.map((month, index) => {
            const x = point(index, 0).x;
            return (
              <g key={month.month}>
                <text x={x} y={height - 8} fontSize="10" fill="var(--color-muted)" textAnchor="middle">
                  {MONTH_LABELS[month.month - 1]}
                </text>
                <rect
                  ref={(node) => {
                    monthRefs.current[index] = node;
                  }}
                  x={x - slot / 2}
                  y={padTop}
                  width={slot}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={active === index || (active === null && index === 0) ? 0 : -1}
                  role="button"
                  aria-label={monthSummary(month, visible)}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      focusMonth(index + 1);
                    }
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      focusMonth(index - 1);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
        {activeMonth && (
          <div
            className="pointer-events-none absolute z-20 w-48 rounded-control border border-border bg-surface p-2 text-xs shadow-sm"
            style={{
              left: `${(activeX / width) * 100}%`,
              top: 8,
              transform: activeX > width * 0.62 ? 'translateX(-105%)' : 'translateX(8px)',
            }}
          >
            <p className="mb-1 font-semibold text-fg">{MONTH_LABELS[activeMonth.month - 1]}</p>
            <ul className="flex flex-col gap-1">
              {tooltipRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1 text-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="font-medium text-fg">{percent(row.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {series.map((item) => {
          const off = hidden.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={!off}
              onClick={() =>
                setHidden((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
              onMouseEnter={() => setEmphasis(item.id)}
              onMouseLeave={() => setEmphasis(null)}
              onFocus={() => setEmphasis(item.id)}
              onBlur={() => setEmphasis(null)}
              className={`inline-flex items-center gap-1.5 rounded-control border px-2 py-1 text-xs ${off ? 'border-border text-muted' : 'border-transparent text-on-brand'}`}
              style={off ? undefined : { backgroundColor: item.color }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: off ? 'var(--color-border)' : 'currentColor' }} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function monthSummary(month: DirectorMonth, series: TrendSeries[]): string {
  const parts = series.map((item) => `${item.label} ${percent(item.values[month.month - 1] ?? null)}`);
  return `${MONTH_LABELS[month.month - 1] ?? ''}: ${parts.join(', ')}`;
}

export function WorstQuestions({ questions }: { questions: DirectorWorstQuestion[] }) {
  const mounted = useMountAnimation(questions.map((question) => `${question.section}:${question.question}:${question.ratio ?? ''}`).join('|'));
  return (
    <ol className="flex flex-col gap-4">
      {questions.map((question, index) => {
        const rank = index + 1;
        const title = question.questionNo ? `${question.questionNo}. ${question.question}` : question.question;
        const graded = question.yes + question.no;
        const width = Math.max(0, Math.min((question.ratio ?? 0) * 100, 100));
        return (
          <li key={`${question.section}-${question.question}`} role="img" aria-label={`${rank}. ${title}: ${question.no} no de ${graded}, ${percent(question.ratio)}`}>
            <div className="mb-1.5 flex items-start gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rank <= 3 ? 'bg-danger text-on-brand' : 'bg-bg text-muted'}`}
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-on-brand"
                    style={{ backgroundColor: sectionColor(question.section, index) }}
                  >
                    {sectionLabel(question.section)}
                  </span>
                  <span className="text-xs text-muted">
                    {question.no} no de {graded}
                  </span>
                </div>
              </div>
              <span className="text-base font-bold tabular-nums text-fg">{percent(question.ratio)}</span>
            </div>
            <div className="relative ml-10 h-7 overflow-hidden rounded-full bg-bg">
              <div
                className="h-7 rounded-full bg-gradient-to-r from-danger to-danger/70 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: mounted ? `${width}%` : '0%', transitionDelay: `${index * 60}ms` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
