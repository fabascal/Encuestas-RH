import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CaretDown, ChartBar, ChartLine, Database, GasPump, GearSix, List, SignOut, X } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_SECTIONS } from '../../pages/admin/adminNav';
import { ORIGEN_SECTIONS } from '../../pages/origen/origenNav';
import { REPORT_CATALOG } from '../../pages/reports/catalog';
import { REPORT_ICONS } from '../../lib/icons';
import { IconTile } from '../ui/IconTile';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const adminSections = ADMIN_SECTIONS.filter((section) => can(section.permission));
  const inAdmin = location.pathname.startsWith('/admin');
  const inReports = location.pathname.startsWith('/reportes');
  const inOrigen = location.pathname.startsWith('/origen');
  const [adminOpen, setAdminOpen] = useState(inAdmin);
  const [reportsOpen, setReportsOpen] = useState(inReports);
  const [origenOpen, setOrigenOpen] = useState(inOrigen);

  const linkClass = (active: boolean) =>
    [
      'flex h-11 items-center gap-3 rounded-control px-3 text-sm font-medium',
      active ? 'bg-brand-soft text-brand' : 'text-fg hover:bg-bg',
    ].join(' ');

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <header className="flex items-center justify-between border-b border-border bg-surface p-4 sm:hidden">
        <span className="flex items-center gap-2 text-base font-semibold text-fg">
          <IconTile icon={GasPump} size="sm" />
          Portal de Bonos
        </span>
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMobileNavOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-control text-fg hover:bg-bg"
        >
          <List size={22} />
        </button>
      </header>

      <nav
        className={[
          'z-40 flex w-64 flex-col border-r border-border bg-surface p-4 sm:sticky sm:top-0 sm:h-screen sm:shrink-0 sm:flex',
          mobileNavOpen ? 'fixed inset-0' : 'hidden',
        ].join(' ')}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold text-fg">
            <IconTile icon={GasPump} size="sm" />
            Portal de Bonos
          </span>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileNavOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-bg sm:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {can('panel.ver') && (
            <NavLink to="/" end onClick={() => setMobileNavOpen(false)} className={({ isActive }) => linkClass(isActive)}>
              <ChartLine size={20} />
              Panel
            </NavLink>
          )}
          {can('direccion.ver') && (
            <NavLink to="/direccion" onClick={() => setMobileNavOpen(false)} className={({ isActive }) => linkClass(isActive)}>
              <ChartLine size={20} />
              Panel
            </NavLink>
          )}
          {can('reportes.ver') && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setReportsOpen((open) => !open)}
                className={linkClass(inReports)}
                aria-expanded={reportsOpen || inReports}
              >
                <ChartBar size={20} />
                <span className="flex-1 text-left">Reportes</span>
                <CaretDown size={16} className={reportsOpen || inReports ? 'rotate-180' : ''} />
              </button>
              {(reportsOpen || inReports) &&
                REPORT_CATALOG.map((report) => {
                  const ReportIcon = REPORT_ICONS[report.id];
                  return (
                    <NavLink
                      key={report.id}
                      to={`/reportes/${report.id}`}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        [
                          'flex h-10 items-center gap-2 rounded-control pl-8 pr-3 text-sm',
                          isActive ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-bg hover:text-fg',
                        ].join(' ')
                      }
                    >
                      <ReportIcon size={18} aria-hidden />
                      {report.title}
                    </NavLink>
                  );
                })}
            </div>
          )}

          {(can('origen.ver') || can('origen.gestionar')) && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setOrigenOpen((open) => !open)}
                className={linkClass(inOrigen)}
                aria-expanded={origenOpen || inOrigen}
              >
                <Database size={20} />
                <span className="flex-1 text-left">Origen de datos</span>
                <CaretDown size={16} className={origenOpen || inOrigen ? 'rotate-180' : ''} />
              </button>
              {(origenOpen || inOrigen) &&
                ORIGEN_SECTIONS.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <NavLink
                      key={section.to}
                      to={section.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        [
                          'flex h-10 items-center gap-2 rounded-control pl-8 pr-3 text-sm',
                          isActive ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-bg hover:text-fg',
                        ].join(' ')
                      }
                    >
                      <SectionIcon size={18} aria-hidden />
                      {section.label}
                    </NavLink>
                  );
                })}
            </div>
          )}

          {adminSections.length > 0 && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setAdminOpen((open) => !open)}
                className={linkClass(inAdmin)}
                aria-expanded={adminOpen || inAdmin}
              >
                <GearSix size={20} />
                <span className="flex-1 text-left">Administración</span>
                <CaretDown size={16} className={adminOpen || inAdmin ? 'rotate-180' : ''} />
              </button>
              {(adminOpen || inAdmin) &&
                adminSections.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                  <NavLink
                    key={section.to}
                    to={section.to}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex h-10 items-center gap-2 rounded-control pl-8 pr-3 text-sm',
                        isActive ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-bg hover:text-fg',
                      ].join(' ')
                    }
                  >
                    <SectionIcon size={18} aria-hidden />
                    {section.label}
                  </NavLink>
                  );
                })}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="truncate text-sm font-medium text-fg">{user?.fullName}</p>
          <p className="truncate text-xs text-muted">{user?.role.name}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 flex h-11 w-full items-center gap-2 rounded-control px-3 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <SignOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
