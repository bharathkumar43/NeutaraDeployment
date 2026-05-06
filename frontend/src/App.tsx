import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/common/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeploymentListPage } from './pages/DeploymentListPage';
import { NewDeploymentPage } from './pages/NewDeploymentPage';
import { DeploymentDetailPage } from './pages/DeploymentDetailPage';
import { QAApprovalPage } from './pages/QAApprovalPage';
import { InfraDeploymentPage } from './pages/InfraDeploymentPage';
import { AcknowledgmentPage } from './pages/AcknowledgmentPage';
import { HistoryPage } from './pages/HistoryPage';
import { UserManagementPage } from './pages/UserManagementPage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/deployments" element={<DeploymentListPage />} />
        <Route path="/deployments/new" element={
          <ProtectedRoute roles={['dev', 'admin']}><NewDeploymentPage /></ProtectedRoute>
        } />
        <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
        <Route path="/deployments/:id/edit" element={
          <ProtectedRoute roles={['dev', 'admin']}><NewDeploymentPage /></ProtectedRoute>
        } />

        <Route path="/qa" element={
          <ProtectedRoute roles={['qa', 'admin']}><QAApprovalPage /></ProtectedRoute>
        } />

        <Route path="/infra" element={
          <ProtectedRoute roles={['infra', 'admin']}><InfraDeploymentPage /></ProtectedRoute>
        } />

        <Route path="/acknowledgments" element={
          <ProtectedRoute roles={['dev', 'admin']}><AcknowledgmentPage /></ProtectedRoute>
        } />

        <Route path="/history" element={<HistoryPage />} />

        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}><UserManagementPage /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
