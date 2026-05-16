import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/host/DashboardPage';

// Simple state-based router
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-2xl text-gray-400">Page under construction</h2>
          </div>
        );
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
