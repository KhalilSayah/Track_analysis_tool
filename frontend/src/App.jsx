import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { TeamProvider } from './contexts/TeamContext';
import Login from './pages/Login';
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

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  // For development, if auth is tricky without real firebase config, 
  // you might want to bypass this. But for "sustainable architecture", keep it.
  // If user hasn't set up firebase, currentUser will be null.
  // We'll redirect to login.
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  // Apply theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ConfigProvider>
      <AuthProvider>
        <TeamProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }>
               <Route path="track-analysis" element={<TrackAnalysis />} />
               <Route path="library" element={<SessionLibrary />} />
               <Route path="sessions/*" element={<SessionLogging />} />
               <Route path="ai-assistant" element={<AIAssistant />} />
               <Route path="setup-guide" element={<SetupGuide />} />
               <Route path="binding-analysis" element={<BindingAnalysis />} />
               <Route path="lap-comparison" element={<LapComparison />} />
               <Route path="profile" element={<ProfileSettings />} />
               <Route path="calendar" element={<Calendar />} />
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
