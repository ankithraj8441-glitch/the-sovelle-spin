import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AdminGate } from './components/admin/AdminGate';

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LandingPage onOpenAdmin={() => setShowAdmin(true)} />
              {showAdmin && (
                <AdminGate onClose={() => setShowAdmin(false)} />
              )}
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
