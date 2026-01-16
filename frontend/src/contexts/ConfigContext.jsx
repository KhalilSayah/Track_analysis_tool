import React, { useState, useEffect } from 'react';
import { Activity, Database, ClipboardList, Settings, Sparkles, AlertTriangle, Zap, Calendar, ArrowRightLeft, Home, Banknote } from 'lucide-react';
import { ConfigContext } from './ConfigContextCore';

export { useConfig } from './ConfigContextCore';

export const DEFAULT_MODULES = [
    { 
        id: 'home', 
        name: 'Home', 
        path: '/dashboard', 
        iconName: 'Home', 
        enabled: true, 
        locked: true,
        description: "Dashboard overview and recent activity."
    },
    { 
        id: 'ai-assistant', 
        name: 'AI Assistant', 
        path: '/dashboard/ai-assistant', 
        iconName: 'Sparkles', 
        enabled: true, 
        beta: true,
        description: "Get AI-powered insights and answers about your karting data."
    },
    { 
        id: 'calendar', 
        name: 'Calendar', 
        path: '/dashboard/calendar', 
        iconName: 'Calendar', 
        enabled: true,
        description: "Manage your race schedule and testing sessions."
    },
    { 
        id: 'budget', 
        name: 'Budget Monitoring', 
        path: '/dashboard/budget', 
        iconName: 'Banknote', 
        enabled: true,
        beta: true,
        description: "Conversational AI assistant for managing team budget."
    },
    { 
        id: 'library', 
        name: 'File Upload', 
        path: '/dashboard/library', 
        iconName: 'Database', 
        enabled: true,
        description: "Upload and manage your telemetry files and track data."
    },
    { 
        id: 'sessions', 
        name: 'Session Logging', 
        path: '/dashboard/sessions', 
        iconName: 'ClipboardList', 
        enabled: true,
        description: "Log your sessions, track conditions, and setup details."
    },
    { 
        id: 'track-analysis', 
        name: 'Track Analysis', 
        path: '/dashboard/track-analysis', 
        iconName: 'Activity', 
        enabled: true,
        description: "Compare telemetry data between two sessions to improve lap times."
    },
    { 
        id: 'lap-comparison', 
        name: 'Lap Comparison', 
        path: '/dashboard/lap-comparison', 
        iconName: 'ArrowRightLeft', 
        enabled: true,
        beta: true,
        description: "Compare two sessions using AI to identify performance differences."
    },
    { 
        id: 'binding-analysis', 
        name: 'Binding Analysis', 
        path: '/dashboard/binding-analysis', 
        iconName: 'Zap', 
        enabled: true,
        description: "Analyze binding events to optimize chassis setup."
    },
    { 
        id: 'setup-guide', 
        name: 'Setup Guide', 
        path: '/dashboard/setup-guide', 
        iconName: 'Settings', 
        enabled: true, 
        locked: true,
        description: "Step-by-step guide to setting up your kart."
    }, 
];

export const ConfigProvider = ({ children }) => {
    const [modules, setModules] = useState(() => {
        const saved = localStorage.getItem('app_modules');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Sync with DEFAULT_MODULES:
                // 1. Keep enabled state from saved if exists.
                // 2. Use structure/definitions from DEFAULT_MODULES.
                // 3. Drop modules not in DEFAULT_MODULES.
                
                return DEFAULT_MODULES.map(def => {
                    const savedMod = parsed.find(p => p.id === def.id);
                    return savedMod ? { ...def, enabled: savedMod.enabled } : def;
                });
            } catch (e) {
                console.error("Error parsing saved modules", e);
                return DEFAULT_MODULES;
            }
        }
        return DEFAULT_MODULES;
    });

    useEffect(() => {
        localStorage.setItem('app_modules', JSON.stringify(modules));
    }, [modules]);

    const toggleModule = (id) => {
        setModules(prev => prev.map(m => 
            m.id === id && !m.locked ? { ...m, enabled: !m.enabled } : m
        ));
    };

    const reorderModules = (startIndex, endIndex) => {
        const result = Array.from(modules);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setModules(result);
    };

    // Helper to get Icon component dynamically
    const getIcon = (iconName) => {
        switch (iconName) {
            case 'Home': return <Home size={20} />;
            case 'Sparkles': return <Sparkles size={20} />;
            case 'Database': return <Database size={20} />;
            case 'ClipboardList': return <ClipboardList size={20} />;
            case 'Activity': return <Activity size={20} />;
            case 'Settings': return <Settings size={20} />;
            case 'Zap': return <Zap size={20} />;
            case 'Calendar': return <Calendar size={20} />;
            case 'ArrowRightLeft': return <ArrowRightLeft size={20} />;
            case 'Banknote': return <Banknote size={20} />;
            default: return <Settings size={20} />;
        }
    };

    return (
        <ConfigContext.Provider value={{ modules, toggleModule, reorderModules, getIcon }}>
            {children}
        </ConfigContext.Provider>
    );
};
