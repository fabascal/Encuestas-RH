import { ClockCounterClockwise, Plus } from '@phosphor-icons/react';
import { NavLink, useLocation } from 'react-router-dom';
import { GoalRulesManager } from '../../components/admin/GoalRulesManager';

export function GoalRulesPage() {
  const { pathname } = useLocation();
  const history = pathname.endsWith('/historial');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <NavLink
          to="/admin/reglas/nueva"
          className={({ isActive }) =>
            [
              'inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium',
              isActive || !history ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-bg',
            ].join(' ')
          }
        >
          <Plus size={16} aria-hidden />
          Nueva versión
        </NavLink>
        <NavLink
          to="/admin/reglas/historial"
          className={({ isActive }) =>
            [
              'inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium',
              isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-bg',
            ].join(' ')
          }
        >
          <ClockCounterClockwise size={16} aria-hidden />
          Historial
        </NavLink>
      </div>
      <GoalRulesManager view={history ? 'history' : 'form'} />
    </div>
  );
}
