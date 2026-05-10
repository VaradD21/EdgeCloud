import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import HostLayout from './layouts/HostLayout';
import SetupPage from './pages/host/SetupPage';
import DashboardPage from './pages/host/DashboardPage';
import ResourcePage from './pages/host/ResourcePage';
import WorkloadsPage from './pages/host/WorkloadsPage';

import BuyerLayout from './layouts/BuyerLayout';
import MarketplacePage from './pages/buyer/MarketplacePage';
import DeployPage from './pages/buyer/DeployPage';
import DeploymentsPage from './pages/buyer/DeploymentsPage';
import DeploymentDetailPage from './pages/buyer/DeploymentDetailPage';

function App() {
  const { isAuthenticated, activeRole, token } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  // Determine which layout to show based on activeRole
  return (
    <Router>
      {activeRole === 'host' ? (
        <HostLayout>
          <Routes>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/resources" element={<ResourcePage />} />
            <Route path="/workloads" element={<WorkloadsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </HostLayout>
      ) : (
        <BuyerLayout>
          <Routes>
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/deploy/:listingId" element={<DeployPage />} />
            <Route path="/deployments" element={<DeploymentsPage />} />
            <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
            <Route path="*" element={<Navigate to="/marketplace" />} />
          </Routes>
        </BuyerLayout>
      )}
    </Router>
  );
}

export default App;
