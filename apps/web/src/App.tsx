import { Navigate, Route, Routes } from 'react-router-dom';
import { ManualKpiCapture } from './components/admin/ManualKpiCapture';
import { OrgManager } from './components/admin/OrgManager';
import { UsersManager } from './components/admin/UsersManager';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute, RequirePermission } from './components/layout/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AdminHome, AdminLayout } from './pages/admin/AdminLayout';
import { GoalRuleSetDetailPage } from './pages/admin/GoalRuleSetDetailPage';
import { GoalRulesPage } from './pages/admin/GoalRulesPage';
import { IntegrationDetailPage } from './pages/admin/IntegrationDetailPage';
import { IntegrationsPage } from './pages/admin/IntegrationsPage';
import { RolesPage } from './pages/admin/RolesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DirectorPage } from './pages/DirectorPage';
import { LoginPage } from './pages/LoginPage';
import { NoAccessPage } from './pages/NoAccessPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { GoogleSurveyDetailPage } from './pages/origen/GoogleSurveyDetailPage';
import { GoogleSurveysPage } from './pages/origen/GoogleSurveysPage';
import { NexusOilPage } from './pages/origen/NexusOilPage';
import { ReportPage } from './pages/reports/ReportPage';
import { ReportsHomePage } from './pages/reports/ReportsHomePage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FilterProvider>
              <AppShell>
                <RequirePermission permission="panel.ver">
                  <DashboardPage />
                </RequirePermission>
              </AppShell>
            </FilterProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/direccion"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission="direccion.ver">
                <DirectorPage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="/origen" element={<Navigate to="/origen/google" replace />} />
      <Route
        path="/origen/google"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission={['origen.ver', 'origen.gestionar']}>
                <GoogleSurveysPage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/origen/nexus"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission={['origen.ver', 'origen.gestionar']}>
                <NexusOilPage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/origen/google/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission={['origen.ver', 'origen.gestionar']}>
                <GoogleSurveyDetailPage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AppShell>
              <AdminLayout />
            </AppShell>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route
          path="organizacion"
          element={
            <RequirePermission permission="organizacion.gestionar">
              <OrgManager />
            </RequirePermission>
          }
        />
        <Route
          path="usuarios"
          element={
            <RequirePermission permission="usuarios.gestionar">
              <UsersManager />
            </RequirePermission>
          }
        />
        <Route
          path="roles"
          element={
            <RequirePermission permission="roles.gestionar">
              <RolesPage />
            </RequirePermission>
          }
        />
        <Route path="reglas" element={<Navigate to="/admin/reglas/nueva" replace />} />
        <Route
          path="reglas/nueva"
          element={
            <RequirePermission permission="reglas.gestionar">
              <GoalRulesPage />
            </RequirePermission>
          }
        />
        <Route
          path="reglas/historial"
          element={
            <RequirePermission permission="reglas.gestionar">
              <GoalRulesPage />
            </RequirePermission>
          }
        />
        <Route
          path="reglas/historial/:ruleSetId"
          element={
            <RequirePermission permission="reglas.gestionar">
              <GoalRuleSetDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="captura"
          element={
            <RequirePermission permission="captura.gestionar">
              <ManualKpiCapture />
            </RequirePermission>
          }
        />
        <Route path="reportes" element={<Navigate to="/reportes" replace />} />
        <Route
          path="integraciones"
          element={
            <RequirePermission permission="integraciones.gestionar">
              <IntegrationsPage />
            </RequirePermission>
          }
        />
        <Route
          path="integraciones/:provider/:tab?"
          element={
            <RequirePermission permission="integraciones.gestionar">
              <IntegrationDetailPage />
            </RequirePermission>
          }
        />
      </Route>
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission="reportes.ver">
                <ReportsHomePage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <RequirePermission permission="reportes.ver">
                <ReportPage />
              </RequirePermission>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sin-acceso"
        element={
          <ProtectedRoute>
            <NoAccessPage />
          </ProtectedRoute>
        }
      />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
