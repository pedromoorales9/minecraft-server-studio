import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../modules/dashboard/DashboardPage';
import { WizardPage } from '../modules/server-creation/WizardPage';
import { ServerDetailPage } from '../modules/servers/ServerDetailPage';
import { ConsolePage } from '../modules/console/ConsolePage';
import { PluginsPage } from '../modules/plugins/PluginsPage';
import { ModsPage } from '../modules/mods/ModsPage';
import { MonitoringPage } from '../modules/monitoring/MonitoringPage';
import { BackupsPage } from '../modules/backups/BackupsPage';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { ErrorBoundary } from './ErrorBoundary';
import { Splash } from '../components/brand/Splash';

export function App() {
  return (
    <AppShell>
      <Splash />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/servers/new" element={<WizardPage />} />
        <Route path="/servers/:id" element={<ServerDetailPage />} />
        <Route path="/servers/:id/console" element={<ConsolePage />} />
        <Route path="/servers/:id/plugins" element={<PluginsPage />} />
        <Route path="/servers/:id/mods" element={<ModsPage />} />
        <Route path="/servers/:id/monitoring" element={<MonitoringPage />} />
        <Route path="/servers/:id/backups" element={<BackupsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}
