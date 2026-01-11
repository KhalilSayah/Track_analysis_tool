import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-dot-pattern text-black dark:text-white">
      {/* Left Sidebar - Fixed height due to h-screen on parent and flex layout */}
      <Sidebar />

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
