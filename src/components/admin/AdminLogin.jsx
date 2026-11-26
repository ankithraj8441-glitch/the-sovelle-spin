import React, { useState } from 'react';
import { X, Shield, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { SovelleLogo } from '../SovelleLogo';

export function AdminLogin({ onLogin, onClose }) {
  const [username, setUsername] = useState('sovelle-admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter the administrator password.');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Incorrect password. Access denied.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2A0910]/82 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
    >
      <div className="animate-fade-slide-up relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#D4AF7C]/60 bg-[#F2E6D9] p-7 text-[#641D2B] shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Return to customer wheel"
          className="absolute right-4 top-4 rounded-full p-2 text-[#641D2B]/55 hover:bg-[#641D2B]/10 hover:text-[#641D2B] transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <SovelleLogo light={false} compact />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D4AF7C] bg-[#FAF4ED] px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#8E5B32] uppercase">
            <Shield className="h-3 w-3" />
            Password Protected
          </div>
          <h1
            id="admin-login-title"
            className="mt-2 font-serif text-3xl font-semibold text-[#641D2B]"
          >
            Administrator Verification
          </h1>
          <p className="mt-1 text-xs text-[#641D2B]/75 leading-relaxed">
            Enter your administrator password to unlock stall customer activity and controls.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-pass"
              className="mb-1.5 block text-xs font-semibold tracking-[0.14em] uppercase text-[#641D2B]"
            >
              Admin Password *
            </label>
            <div className="relative">
              <input
                id="admin-pass"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to unlock"
                className="w-full rounded-xl border border-[#D4AF7C]/80 bg-[#FAF4ED] py-3 pl-4 pr-11 text-sm text-[#641D2B] outline-none transition focus:border-[#641D2B] focus:ring-2 focus:ring-[#641D2B]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#641D2B]/50 hover:text-[#641D2B] transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Username (defaults to sovelle-admin) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-[11px] text-[#8E5B32] underline hover:text-[#641D2B]"
            >
              {showAdvanced ? 'Hide username' : 'Change username (default: sovelle-admin)'}
            </button>
            {showAdvanced && (
              <div className="mt-2 animate-fade-slide-up">
                <input
                  id="admin-user"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sovelle-admin"
                  className="w-full rounded-xl border border-[#D4AF7C]/60 bg-[#FAF4ED] px-3.5 py-2 text-xs text-[#641D2B] outline-none focus:border-[#641D2B]"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="animate-fade-slide-up rounded-xl border border-red-800/40 bg-red-900/15 px-3.5 py-2.5 text-xs font-semibold text-[#7B1120]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#641D2B] px-5 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#F2E6D9] uppercase shadow-lg transition hover:bg-[#4E1420] disabled:opacity-60"
          >
            <Lock className="h-3.5 w-3.5 text-[#D4AF7C]" />
            {submitting ? 'Verifying Password…' : 'Unlock Admin Panel'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#641D2B]/70 hover:text-[#641D2B] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Customer Wheel
          </button>
        </div>
      </div>
    </div>
  );
}
