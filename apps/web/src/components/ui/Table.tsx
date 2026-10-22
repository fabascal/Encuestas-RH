import { Tray } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

/** Renders as a real table from `sm` up, and as stacked cards on narrower screens. */
export function Table<T>({ columns, rows, getRowKey, emptyMessage = 'Sin datos' }: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Tray size={28} className="text-muted" aria-hidden />
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-2 font-medium ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-border last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-3 text-fg ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <div key={getRowKey(row)} className="rounded-control border border-border p-3">
            {columns.map((column) => (
              <div key={column.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="text-muted">{column.header}</span>
                <span className="text-right font-medium text-fg">{column.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
