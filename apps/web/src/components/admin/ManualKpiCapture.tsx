import { useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAllStations } from '../../hooks/useHierarchy';
import { useKpiCategories } from '../../hooks/useKpis';
import { ApiError, api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { ADMIN_ICONS } from '../../lib/icons';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';

/** Rubros without an integration, today only "Dispensarios abiertos". */
export function ManualKpiCapture() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const stationsQuery = useAllStations();
  const categoriesQuery = useKpiCategories();
  const manualCategories = (categoriesQuery.data ?? []).filter((category) => !category.source_provider);

  const [stationId, setStationId] = useState('');
  const [kpiCategoryId, setKpiCategoryId] = useState('');
  const [month, setMonth] = useState('');
  const [value, setValue] = useState(0);

  const save = useMutation({
    mutationFn: () =>
      api.put('/admin/kpi-facts', {
        stationId,
        kpiCategoryId,
        period: `${month}-01`,
        value,
        source: 'manual',
      }),
    onSuccess: () => {
      showToast('Dato guardado', 'success');
      queryClient.invalidateQueries({ queryKey: ['kpi-facts'] });
    },
    onError: (error) =>
      showToast(error instanceof ApiError ? error.message : 'No se pudo guardar el dato', 'danger'),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!stationId || !kpiCategoryId || !month) return;
    save.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={ADMIN_ICONS.captura} size="sm" />}>Captura manual</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Estación"
          placeholder="Selecciona"
          value={stationId}
          onChange={(event) => setStationId(event.target.value)}
          options={(stationsQuery.data ?? []).map((station) => ({ value: station.id, label: station.name }))}
        />
        <Select
          label="Rubro"
          tooltip="Solo rubros que no vienen de una integración. Hoy, dispensarios abiertos."
          placeholder="Selecciona"
          value={kpiCategoryId}
          onChange={(event) => setKpiCategoryId(event.target.value)}
          options={manualCategories.map((category) => ({ value: category.id, label: category.name }))}
        />
        <Input label="Mes" type="month" required value={month} onChange={(event) => setMonth(event.target.value)} />
        <Input
          label="Valor"
          tooltip="Cantidad del mes. Para dispensarios abiertos, cuántos estuvieron abiertos."
          type="number"
          min={0}
          step="0.01"
          required
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <Button type="submit" isLoading={save.isPending} disabled={!stationId || !kpiCategoryId || !month}>
          <FloppyDisk size={18} aria-hidden />
          Guardar dato
        </Button>
      </form>
    </Card>
  );
}
