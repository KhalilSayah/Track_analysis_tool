import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SessionDashboard from './SessionDashboard';
import SessionForm from './SessionForm';

const SessionLogging = () => {
  return (
    <Routes>
      <Route path="/" element={<SessionDashboard />} />
      <Route path="/new" element={<SessionForm />} />
      <Route path="/edit/:id" element={<SessionForm />} />
    </Routes>
  );
};

export default SessionLogging;
