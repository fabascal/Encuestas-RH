import { Info } from '@phosphor-icons/react';

export function FieldHint({ id, text }: { id: string; text: string }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-full text-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label="Más información"
        aria-describedby={id}
      >
        <Info size={14} aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className="invisible absolute bottom-full left-0 z-30 mb-1.5 w-64 rounded-control bg-fg px-2.5 py-2 text-left text-xs font-normal leading-snug text-on-brand opacity-0 shadow-sm group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({
  htmlFor,
  label,
  tooltip,
  tooltipId,
}: {
  htmlFor: string;
  label: string;
  tooltip?: string;
  tooltipId?: string;
}) {
  return (
    <div className="flex items-start gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-5 text-fg">
        {label}
      </label>
      {tooltip && tooltipId ? <FieldHint id={tooltipId} text={tooltip} /> : null}
    </div>
  );
}
