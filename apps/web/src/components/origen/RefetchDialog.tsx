import { ArrowsClockwise } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function RefetchDialog({
  open,
  title,
  detail,
  notice,
  extra,
  isBusy,
  canConfirm = true,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  detail: string;
  notice: string;
  extra?: string | null;
  isBusy: boolean;
  canConfirm?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
            {canConfirm ? 'Cancelar' : 'Cerrar'}
          </Button>
          {canConfirm && (
            <Button type="button" isLoading={isBusy} onClick={onConfirm}>
              <ArrowsClockwise size={18} />
              Volver a consultar
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-fg">
        <p>{detail}</p>
        {extra ? <p className="text-muted">{extra}</p> : null}
        <p>{notice}</p>
        {isBusy ? <p className="text-muted">Consultando Nexus…</p> : null}
      </div>
    </Modal>
  );
}
