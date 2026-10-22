import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function ExcludeSurveyDialog({
  open,
  mode,
  isLoading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: 'exclude' | 'include';
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');
  const excluding = mode === 'exclude';

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={excluding ? 'No considerar encuesta' : 'Volver a considerar'}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={excluding ? 'danger' : 'primary'}
            isLoading={isLoading}
            disabled={excluding && reason.trim().length < 3}
            onClick={() => onConfirm(excluding ? reason.trim() : undefined)}
          >
            {excluding ? 'No considerar' : 'Volver a considerar'}
          </Button>
        </>
      }
    >
      {excluding ? (
        <label className="flex flex-col gap-1.5 text-sm text-fg">
          Motivo
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Por ejemplo: llegó vacía, sin respuestas"
            className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
          <span className="text-xs text-muted">Mínimo 3 caracteres. La encuesta se conserva, solo deja de contar.</span>
        </label>
      ) : (
        <p className="text-sm text-fg">Esta encuesta volverá a sumar en los promedios del mes.</p>
      )}
    </Modal>
  );
}
