import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles, Phone, User, LogIn, Lock } from 'lucide-react';
import { SovelleLogo } from './SovelleLogo';

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

export function RegistrationModal({
  isOpen,
  onClose,
  onRegister,
  onCustomerLogin,
  onOpenAdmin,
  initialTab = 'register',
}) {
  const [tab, setTab] = useState(initialTab); // 'register' | 'login'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [posterConfirmed, setPosterConfirmed] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const cleanPhone = (val) => val.replace(/\D/g, '').slice(0, 10);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!INDIAN_PHONE_RE.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!posterConfirmed) {
      setError('Please confirm your purchase of 2 or more posters at the SOVELLE stall.');
      return;
    }

    setSubmitting(true);
    try {
      await onRegister({
        name: trimmedName,
        phone,
        posterPurchaseConfirmed: posterConfirmed,
      });
    } catch (err) {
      setError(err.message || 'Unable to register. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!INDIAN_PHONE_RE.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setSubmitting(true);
    try {
      await onCustomerLogin(phone);
    } catch (err) {
      setError(err.message || 'Unable to log in. Please check your phone number.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2A0910]/80 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-modal-title"
    >
      <div className="animate-fade-slide-up relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#D4AF7C]/55 bg-[#F2E6D9] px-6 py-7 text-[#641D2B] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-[#641D2B]/65 transition hover:bg-[#641D2B]/10 hover:text-[#641D2B]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 text-center">
          <SovelleLogo light={false} compact />
          <p className="mt-3 text-[11px] font-semibold tracking-[0.26em] text-[#8E5B32] uppercase">
            Stall Customer Portal
          </p>
          <h2
            id="reg-modal-title"
            className="mt-1 font-serif text-3xl font-semibold tracking-wide text-[#641D2B]"
          >
            {tab === 'register' ? 'Unlock Your Spin' : 'Customer Sign In'}
          </h2>
        </div>

        {/* Tab Selector */}
        <div className="mb-5 flex rounded-xl border border-[#D4AF7C]/60 bg-[#FAF4ED] p-1">
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wider transition uppercase ${
              tab === 'register'
                ? 'bg-[#641D2B] text-[#F2E6D9] shadow-sm'
                : 'text-[#641D2B]/75 hover:text-[#641D2B]'
            }`}
          >
            New Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wider transition uppercase ${
              tab === 'login'
                ? 'bg-[#641D2B] text-[#F2E6D9] shadow-sm'
                : 'text-[#641D2B]/75 hover:text-[#641D2B]'
            }`}
          >
            Returning Customer
          </button>
        </div>

        {tab === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="customer-name"
                className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[#641D2B] uppercase"
              >
                Customer Name *
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#641D2B]/45" />
                <input
                  id="customer-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Ananya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#D4AF7C]/80 bg-[#FAF4ED] py-3 pl-10 pr-4 text-sm text-[#641D2B] placeholder-[#641D2B]/40 outline-none transition focus:border-[#641D2B] focus:ring-2 focus:ring-[#641D2B]/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customer-phone"
                className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[#641D2B] uppercase"
              >
                Mobile Number (India) *
              </label>
              <div className="flex overflow-hidden rounded-xl border border-[#D4AF7C]/80 bg-[#FAF4ED] transition focus-within:border-[#641D2B] focus-within:ring-2 focus-within:ring-[#641D2B]/15">
                <span className="flex items-center gap-1 border-r border-[#D4AF7C]/50 bg-[#EBDCC9]/55 px-3 text-sm font-semibold text-[#641D2B]">
                  <Phone className="h-3.5 w-3.5 text-[#641D2B]/70" />
                  +91
                </span>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(cleanPhone(e.target.value))}
                  className="w-full bg-transparent px-3.5 py-3 text-sm tracking-wider text-[#641D2B] placeholder-[#641D2B]/40 outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#641D2B]/65">
                10-digit Indian mobile number. One entry per phone number.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#D4AF7C]/55 bg-[#FAF4ED]/80 p-3 text-xs text-[#641D2B]/85">
              <input
                type="checkbox"
                checked={posterConfirmed}
                onChange={(e) => setPosterConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#641D2B]"
              />
              <span>
                I confirm I have purchased <strong>any 2 posters</strong> at the SOVELLE stall today.
              </span>
            </label>

            <div className="flex items-start gap-2.5 rounded-xl border border-[#641D2B]/15 bg-[#641D2B]/[0.05] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#641D2B]/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#641D2B]" />
              <span>
                Your mobile number is collected solely for recording stall activity and managing
                your eligible SOVELLE rewards.
              </span>
            </div>

            {error && (
              <div className="rounded-xl border border-red-800/30 bg-red-900/10 px-3.5 py-2.5 text-xs font-medium text-[#7B1120]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#641D2B] px-5 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#F2E6D9] uppercase shadow-lg transition hover:bg-[#4E1420] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4 text-[#D4AF7C]" />
              {submitting ? 'Confirming Entry...' : 'Confirm & Unlock Spin'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <p className="text-xs text-[#641D2B]/75 leading-relaxed">
              Already registered today? Enter your mobile number to view your spin status or retrieve your coupon code.
            </p>

            <div>
              <label
                htmlFor="login-phone"
                className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[#641D2B] uppercase"
              >
                Registered Mobile Number *
              </label>
              <div className="flex overflow-hidden rounded-xl border border-[#D4AF7C]/80 bg-[#FAF4ED] transition focus-within:border-[#641D2B] focus-within:ring-2 focus-within:ring-[#641D2B]/15">
                <span className="flex items-center gap-1 border-r border-[#D4AF7C]/50 bg-[#EBDCC9]/55 px-3 text-sm font-semibold text-[#641D2B]">
                  <Phone className="h-3.5 w-3.5 text-[#641D2B]/70" />
                  +91
                </span>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(cleanPhone(e.target.value))}
                  className="w-full bg-transparent px-3.5 py-3 text-sm tracking-wider text-[#641D2B] placeholder-[#641D2B]/40 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-800/30 bg-red-900/10 px-3.5 py-2.5 text-xs font-medium text-[#7B1120]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#641D2B] px-5 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#F2E6D9] uppercase shadow-lg transition hover:bg-[#4E1420] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4 text-[#D4AF7C]" />
              {submitting ? 'Looking Up...' : 'Log In & View Entry'}
            </button>
          </form>
        )}

        {/* Footer Admin Link */}
        {onOpenAdmin && (
          <div className="mt-5 border-t border-[#D4AF7C]/40 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8E5B32] transition hover:text-[#641D2B] uppercase tracking-wider"
            >
              <Lock className="h-3 w-3" />
              Stall Staff / Admin Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
