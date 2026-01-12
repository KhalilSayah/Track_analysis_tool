import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, User, X } from 'lucide-react';
import { auth } from '../firebase';
import { Button, Chip } from "@heroui/react";
import { useConfig } from '../contexts/ConfigContext';
import ConfirmationModal from './ConfirmationModal';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const { modules, getIcon } = useConfig();
  
  // Filter only enabled modules for display
  const navItems = modules.filter(m => m.enabled);

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleNavClick = () => {
    if (setIsMobileOpen) {
        setIsMobileOpen(false);
    }
  };

  // Determine width based on state and device
  const sidebarWidth = isMobileOpen ? 'w-64' : (isCollapsed ? 'w-20' : 'w-64');
  
  return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setIsMobileOpen(false)}
            />
        )}

        <div className={`
            fixed md:static inset-y-0 left-0 z-40
            bg-white dark:bg-zinc-900 text-black dark:text-white 
            flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 
            transition-all duration-300 shadow-xl md:shadow-sm
            ${sidebarWidth}
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
            {(!isCollapsed || isMobileOpen) && (
                <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate('/dashboard')}
                >
                     <img src="/dove.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                     <div>
                        <h2 className="text-sm font-bold whitespace-nowrap leading-tight">Karting Tools</h2>
                        <p className="text-[10px] text-zinc-500 font-medium">by 'BIRDS'</p>
                     </div>
                </div>
            )}
            
            {/* Desktop Collapse Button */}
            <Button 
              isIconOnly
              variant="light"
              onPress={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary min-w-8 w-8 h-8"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </Button>

            {/* Mobile Close Button */}
            <Button 
              isIconOnly
              variant="light"
              onPress={() => setIsMobileOpen(false)}
              className="md:hidden text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary min-w-8 w-8 h-8"
            >
              <X size={20} />
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all overflow-hidden ${
                    isActive 
                      ? 'bg-[#e8fe41] text-black font-bold shadow-lg shadow-[#e8fe41]/50' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-[#e8fe41]/10 hover:text-black dark:hover:text-white'
                  }`
                }
                title={isCollapsed && !isMobileOpen ? item.name : ''}
              >
                <div className={`flex-shrink-0 ${item.id === 'setup-guide' && !isCollapsed ? '' : ''}`}>
                   {getIcon(item.iconName)}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex items-center gap-2 w-full">
                    <span className="whitespace-nowrap">{item.name}</span>
                    {item.beta && (
                      <Chip size="sm" className="h-5 px-1 bg-[#e8fe41] text-black text-[10px] font-bold">BETA</Chip>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
            <NavLink
                to="/dashboard/profile"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all overflow-hidden ${
                    isActive 
                      ? 'bg-[#e8fe41] text-black font-bold shadow-lg shadow-[#e8fe41]/50' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-[#e8fe41]/10 hover:text-black dark:hover:text-white'
                  }`
                }
                title={isCollapsed && !isMobileOpen ? "Profile Settings" : ""}
            >
                <div className="flex-shrink-0">
                   <User size={20} />
                </div>
                {(!isCollapsed || isMobileOpen) && <span className="whitespace-nowrap">Profile</span>}
            </NavLink>

            <Button 
              variant="light"
              onPress={() => setIsLogoutModalOpen(true)}
              className={`flex items-center justify-start gap-3 px-4 py-3 w-full text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors overflow-hidden ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}`}
              title={isCollapsed && !isMobileOpen ? "Log Out" : ""}
            >
              <div className="flex-shrink-0"><LogOut size={20} /></div>
              {(!isCollapsed || isMobileOpen) && <span className="whitespace-nowrap">Log Out</span>}
            </Button>
          </div>
        </div>

        <ConfirmationModal 
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleLogout}
            title="Log Out"
            description="Are you sure you want to log out of your account?"
            confirmText="Log Out"
            type="warning"
        />
    </>
  );
};

export default Sidebar;
