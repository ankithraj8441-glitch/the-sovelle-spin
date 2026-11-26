import React, { useState } from 'react';
import { api } from '../../api/client';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';

/**
 * Gate that strictly requires entering the correct password before granting
 * access to the Admin Dashboard.
 */
export function AdminGate({ onClose, onAdminChange }) {
  const [admin, setAdmin] = useState(null);

  const handleLogin = async (username, password) => {
    const res = await api.adminLogin(username, password);
    setAdmin(res.admin);
    onAdminChange?.(res.admin);
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      // Ignore
    }
    setAdmin(null);
    onAdminChange?.(null);
    onClose();
  };

  const handleClose = () => {
    // When closing the dashboard, clear local admin state so next open requires password again
    setAdmin(null);
    onClose();
  };

  // Only open Admin Dashboard if correct password was successfully verified
  if (admin) {
    return (
      <AdminDashboard
        admin={admin}
        onClose={handleClose}
        onLogout={handleLogout}
      />
    );
  }

  // Always show password verification prompt first
  return <AdminLogin onLogin={handleLogin} onClose={onClose} />;
}
