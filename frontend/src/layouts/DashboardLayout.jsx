import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TeamSwitcher from '../components/TeamSwitcher';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-dot-pattern text-black dark:text-white relative">
      {/* Left Sidebar - Fixed height due to h-screen on parent and flex layout */}
      <Sidebar />

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        <TeamSwitcher />
        <div className="mt-16">
            <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
