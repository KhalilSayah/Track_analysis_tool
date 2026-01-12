import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, User } from 'lucide-react';
import { auth } from '../firebase';
import { Button, Chip } from "@heroui/react";
import { useConfig } from '../contexts/ConfigContext';
import ConfirmationModal from './ConfirmationModal';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const { modules, getIcon } = useConfig();
  
  // Filter only enabled modules for display
  const navItems = modules.filter(m => m.enabled);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <>
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 text-black dark:text-white flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 shadow-sm`}>
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
            {!isCollapsed && (
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
            <Button 
              isIconOnly
              variant="light"
              onPress={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary min-w-8 w-8 h-8"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all overflow-hidden ${
                    isActive 
                      ? 'bg-[#e8fe41] text-black font-bold shadow-lg shadow-[#e8fe41]/50' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-[#e8fe41]/10 hover:text-black dark:hover:text-white'
                  }`
                }
                title={isCollapsed ? item.name : ''}
              >
                <div className={`flex-shrink-0 ${item.id === 'setup-guide' && !isCollapsed ? '' : ''}`}>
                   {getIcon(item.iconName)}
                </div>
                {!isCollapsed && (
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all overflow-hidden ${
                    isActive 
                      ? 'bg-[#e8fe41] text-black font-bold shadow-lg shadow-[#e8fe41]/50' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-[#e8fe41]/10 hover:text-black dark:hover:text-white'
                  }`
                }
                title={isCollapsed ? "Profile Settings" : ""}
            >
                <div className="flex-shrink-0">
                   <User size={20} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap">Profile</span>}
            </NavLink>

            <Button 
              variant="light"
              onPress={toggleTheme}
              className={`flex items-center justify-start gap-3 px-4 py-3 w-full text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors overflow-hidden ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? (theme === 'dark' ? "Light Mode" : "Dark Mode") : ""}
            >
              <div className="flex-shrink-0">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              {!isCollapsed && <span className="whitespace-nowrap">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </Button>

            <Button 
              variant="light"
              onPress={() => setIsLogoutModalOpen(true)}
              className={`flex items-center justify-start gap-3 px-4 py-3 w-full text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors overflow-hidden ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? "Log Out" : ""}
            >
              <div className="flex-shrink-0"><LogOut size={20} /></div>
              {!isCollapsed && <span className="whitespace-nowrap">Log Out</span>}
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
