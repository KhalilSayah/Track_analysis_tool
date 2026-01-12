import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from "@heroui/react";
import Sidebar from '../components/Sidebar';
import TeamSwitcher from '../components/TeamSwitcher';

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-dot-pattern text-black dark:text-white relative">
      {/* Sidebar - Responsive */}
      <Sidebar 
        isMobileOpen={isMobileMenuOpen} 
        setIsMobileOpen={setIsMobileMenuOpen} 
      />

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-30 absolute top-0 left-0 right-0">
            <Button 
                isIconOnly 
                variant="light" 
                onPress={() => setIsMobileMenuOpen(true)}
            >
                <Menu size={24} />
            </Button>
            <span className="ml-4 font-bold text-lg">Karting Tools</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth">
            <div className="max-w-[1600px] mx-auto">
                <TeamSwitcher />
                <div className="mt-8 md:mt-16">
                    <Outlet />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
