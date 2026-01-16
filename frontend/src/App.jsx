import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import DashboardLayout from './layouts/DashboardLayout';
import TrackAnalysis from './modules/TrackAnalysis/TrackAnalysis';
import SessionLibrary from './modules/SessionLibrary/SessionLibrary';
import SessionLogging from './modules/SessionLogging/SessionLogging';
import AIAssistant from './modules/AIAssistant/AIAssistant';
import SetupGuide from './modules/SetupGuide/SetupGuide';
import BindingAnalysis from './modules/BindingAnalysis/BindingAnalysis';
import LapComparison from './modules/LapComparison/LapComparison';
import ProfileSettings from './modules/Profile/ProfileSettings';
import Home from './modules/Home/Home';
import Calendar from './modules/Calendar/Calendar';
import Budget from './modules/Budget/Budget';
import TeamManagement from './modules/Team/TeamManagement';

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  // For development, if auth is tricky without real firebase config, 
  // you might want to bypass this. But for "sustainable architecture", keep it.
  // If user hasn't set up firebase, currentUser will be null.
  // We'll redirect to login.
  return currentUser ? children : <Navigate to="/login" />;
};

const ModuleRoute = ({ moduleId, children }) => {
  const { currentUser } = useAuth();
  const { currentTeam } = useTeam();
  const { modules } = useConfig();

  const mod = modules.find(m => m.id === moduleId);
  if (!mod || !mod.enabled) {
    return <Navigate to="/dashboard" />;
  }

  if (mod.locked) {
    return children;
  }

  if (!currentUser || !currentTeam) {
    return children;
  }

  const isOwner = currentTeam.createdBy === currentUser.uid;
  const isAdmin = isOwner || (Array.isArray(currentTeam.admins) && currentTeam.admins.includes(currentUser.uid));

  if (isAdmin) {
    return children;
  }

  const permissions = currentTeam.permissions || {};
  const userPerms = permissions[currentUser.uid] || {};
  if (Object.prototype.hasOwnProperty.call(userPerms, moduleId) && userPerms[moduleId] === false) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  // Apply theme on app load
  useEffect(() => {
    // Force dark theme for everyone
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <ConfigProvider>
      <AuthProvider>
        <TeamProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }>
               <Route
                 path="track-analysis"
                 element={
                   <ModuleRoute moduleId="track-analysis">
                     <TrackAnalysis />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="library"
                 element={
                   <ModuleRoute moduleId="library">
                     <SessionLibrary />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="sessions/*"
                 element={
                   <ModuleRoute moduleId="sessions">
                     <SessionLogging />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="ai-assistant"
                 element={
                   <ModuleRoute moduleId="ai-assistant">
                     <AIAssistant />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="setup-guide"
                 element={
                   <ModuleRoute moduleId="setup-guide">
                     <SetupGuide />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="binding-analysis"
                 element={
                   <ModuleRoute moduleId="binding-analysis">
                     <BindingAnalysis />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="lap-comparison"
                 element={
                   <ModuleRoute moduleId="lap-comparison">
                     <LapComparison />
                   </ModuleRoute>
                 }
               />
               <Route path="profile" element={<ProfileSettings />} />
               <Route
                 path="calendar"
                 element={
                   <ModuleRoute moduleId="calendar">
                     <Calendar />
                   </ModuleRoute>
                 }
               />
               <Route
                 path="budget"
                 element={
                   <ModuleRoute moduleId="budget">
                     <Budget />
                   </ModuleRoute>
                 }
               />
               <Route path="teams/:teamId/manage" element={<TeamManagement />} />
               <Route index element={<Home />} />
               {/* Add more modules here as blocks */}
            </Route>
          </Routes>
          </Router>
        </TeamProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
