import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .adminMe()
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async (username, password) => {
    const res = await api.adminLogin(username, password);
    setAdmin(res.admin);
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setAdmin(null);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#641D2B] text-sm tracking-widest text-[#D4AF7C] uppercase">
        Verifying Session...
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard admin={admin} onLogout={handleLogout} />;
}
