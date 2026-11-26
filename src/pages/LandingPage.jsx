import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Lock,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api/client';
import { SovelleLogo } from '../components/SovelleLogo';
import { SpinWheel } from '../components/SpinWheel';
import { RegistrationModal } from '../components/RegistrationModal';
import { ResultModal } from '../components/ResultModal';
import { VoucherCard } from '../components/VoucherCard';

export function LandingPage({ onOpenAdmin }) {
  const [segments, setSegments] = useState([]);
  const [sessionState, setSessionState] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('register');
  const [confirmationBanner, setConfirmationBanner] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetSpin, setTargetSpin] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [visibleResult, setVisibleResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const loadInitial = useCallback(async () => {
    try {
      const [configData, sessData, adminData] = await Promise.allSettled([
        api.getConfig(),
        api.getSession(),
        api.adminMe(),
      ]);

      if (configData.status === 'fulfilled') {
        setSegments(configData.value.segments || []);
      }

      if (sessData.status === 'fulfilled' && sessData.value.authenticated && sessData.value.state) {
        setSessionState(sessData.value.state);
        const spins = sessData.value.state.spins || [];
        const latest = spins[spins.length - 1];
        if (latest && !latest.confirmedAt) {
          setVisibleResult({
            spin: latest,
            coupon: latest.generatesCoupon ? sessData.value.state.coupon : null,
          });
        }
      }

      if (adminData.status === 'fulfilled' && adminData.value?.admin) {
        setAdminUser(adminData.value.admin);
      } else {
        setAdminUser(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load THE SOVELLE SPIN.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleRegister = async (payload) => {
    const res = await api.registerCustomer(payload);
    setSessionState(res.state);
    setConfirmationBanner(res.message);
    setShowRegister(false);
    setErrorMsg('');
  };

  const handleCustomerLogin = async (phone) => {
    const res = await api.customerLogin(phone);
    setSessionState(res.state);
    setConfirmationBanner(res.message);
    setShowRegister(false);
    setErrorMsg('');
  };

  const handleCustomerLogout = async () => {
    try {
      await api.customerLogout();
    } catch {
      // Ignore
    }
    setSessionState(null);
    setVisibleResult(null);
    setConfirmationBanner('Customer session cleared. Ready for next entry!');
  };

  const handleAdminLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      // Ignore
    }
    setAdminUser(null);
    setConfirmationBanner('Admin signed out successfully.');
  };

  const handleSpinClick = async () => {
    setErrorMsg('');
    if (!sessionState) {
      setModalInitialTab('register');
      setShowRegister(true);
      return;
    }

    if (sessionState.customer.remainingSpins <= 0 || isSpinning) {
      return;
    }

    setIsSpinning(true);
    try {
      const data = await api.executeSpin();
      setPendingResult({
        result: data.result,
        nextState: data.state,
      });
      setTargetSpin({
        segmentIndex: data.result.spin.segmentIndex,
        spinKey: data.result.spin.id,
      });
    } catch (err) {
      setIsSpinning(false);
      setErrorMsg(err.message || 'Unable to execute spin.');
    }
  };

  const handleWheelStop = useCallback(() => {
    setIsSpinning(false);
    if (pendingResult) {
      setSessionState(pendingResult.nextState);
      setVisibleResult({
        spin: pendingResult.result.spin,
        coupon: pendingResult.result.coupon,
      });
      setPendingResult(null);
    }
  }, [pendingResult]);

  const handleConfirmReward = async (spinId) => {
    setConfirming(true);
    try {
      const res = await api.confirmSpin(spinId);
      setSessionState(res.state);
      setVisibleResult(null);
      if (res.state.customer.remainingSpins > 0) {
        setConfirmationBanner(
          `Golden Spin Active! ${res.state.customer.name}, you have 1 bonus spin remaining.`
        );
      } else {
        setConfirmationBanner('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not confirm reward.');
    } finally {
      setConfirming(false);
    }
  };

  const customer = sessionState?.customer;
  const remainingSpins = customer?.remainingSpins ?? 0;
  const isCompleted = Boolean(customer && remainingSpins === 0 && !isSpinning && !visibleResult);
  const canSpinNow = Boolean(customer && remainingSpins > 0 && !isSpinning && !visibleResult);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#641D2B] text-[#F2E6D9]">
      {/* Subtle Editorial Frame & Radial Ambient Glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, rgba(212, 175, 124, 0.14) 0%, rgba(100, 29, 43, 0) 58%), radial-gradient(circle at 50% 100%, rgba(45, 9, 17, 0.65) 0%, rgba(100, 29, 43, 0) 60%)',
        }}
      />
      <div className="pointer-events-none fixed inset-3 sm:inset-5 rounded-3xl border border-[#D4AF7C]/20" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-between px-5 py-7 sm:px-8 sm:py-10">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Customer Login / Status */}
          <div className="flex items-center gap-2">
            {customer ? (
              <div className="flex items-center gap-2 rounded-full border border-[#D4AF7C]/40 bg-[#4A131E]/75 px-3 py-1.5 text-xs text-[#F2E6D9]">
                <User className="h-3.5 w-3.5 text-[#D4AF7C]" />
                <span className="font-semibold">{customer.name}</span>
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  title="Clear session for next stall customer"
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#641D2B] px-2 py-0.5 text-[10.5px] font-semibold text-[#D4AF7C] transition hover:bg-[#3B0E17] hover:text-white"
                >
                  <LogOut className="h-3 w-3" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setModalInitialTab('login');
                  setShowRegister(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF7C]/35 bg-[#4A131E]/60 px-3.5 py-1.5 text-xs font-medium text-[#D4AF7C] transition hover:border-[#D4AF7C] hover:bg-[#4A131E]"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Customer Login</span>
              </button>
            )}
          </div>

          {/* Center: SOVELLE Swan Logo */}
          <SovelleLogo light />

          {/* Right: Sound & Admin Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              aria-label={soundEnabled ? 'Mute wheel sound' : 'Enable wheel sound'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF7C]/35 bg-[#4A131E]/60 text-[#D4AF7C] transition hover:border-[#D4AF7C] hover:bg-[#4A131E]"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Admin Verification Button */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF7C]/40 bg-[#4A131E]/75 px-3.5 py-1.5 text-xs font-semibold text-[#D4AF7C] transition hover:border-[#D4AF7C] hover:bg-[#4A131E]"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </header>

        {/* Main Centerpiece */}
        <main className="my-6 flex flex-1 flex-col items-center justify-center text-center">
          <div className="max-w-xl">
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#D4AF7C]/40 bg-[#4A131E]/65 px-3.5 py-1 text-[10px] font-semibold tracking-[0.26em] text-[#D4AF7C] uppercase">
              <Sparkles className="h-3 w-3" />
              College Stall Exclusive
            </div>

            <h1 className="font-serif text-4xl font-semibold tracking-[0.06em] text-[#F2E6D9] sm:text-5xl md:text-[54px] leading-[1.08]">
              THE SOVELLE SPIN
            </h1>

            <p className="mt-2 font-serif text-xl italic text-[#D4AF7C] sm:text-2xl">
              A little spin. A little surprise.
            </p>

            <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-[#F2E6D9]/85 sm:text-[15px]">
              Purchase any 2 posters and get a chance to win something special!
            </p>
          </div>

          {/* Registration / Status Banner */}
          {confirmationBanner && (
            <div className="animate-fade-slide-up mt-5 flex max-w-md items-center gap-2.5 rounded-xl border border-[#D4AF7C]/70 bg-[#F2E6D9] px-4 py-3 text-left text-xs font-medium text-[#641D2B] shadow-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#641D2B]" />
              <span>{confirmationBanner}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 max-w-md rounded-xl border border-[#D4AF7C]/50 bg-[#3B0E17] px-4 py-2.5 text-xs text-[#F2E6D9]">
              {errorMsg}
            </div>
          )}

          {/* Wheel Showcase */}
          <div className="my-7 w-full">
            <SpinWheel
              segments={segments}
              targetSpin={targetSpin}
              isSpinning={isSpinning}
              canSpinDirect={canSpinNow}
              onDirectClick={handleSpinClick}
              onSpinComplete={handleWheelStop}
              soundEnabled={soundEnabled}
            />
          </div>

          {/* Primary Action / Confirmed Voucher */}
          {loading ? (
            <div className="h-12 w-56 animate-pulse rounded-full bg-[#F2E6D9]/15" />
          ) : isCompleted ? (
            <div className="w-full space-y-4">
              <VoucherCard sessionState={sessionState} onLogout={handleCustomerLogout} />
              <p className="text-xs text-[#F2E6D9]/65">
                Your entry for +91 {customer.phone} is recorded. Present your code on your next
                SOVELLE order.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleSpinClick}
                disabled={isSpinning}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-full border border-[#D4AF7C] bg-[#F2E6D9] px-9 py-4 text-xs font-bold tracking-[0.24em] text-[#641D2B] uppercase shadow-[0_14px_34px_rgba(24,5,10,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FAF4ED] hover:shadow-[0_18px_40px_rgba(212,175,124,0.22)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                <Sparkles className="h-4 w-4 text-[#B58C55] transition-transform group-hover:rotate-12" />
                {isSpinning
                  ? 'Spinning...'
                  : canSpinNow
                    ? customer.spinsUsed === 1
                      ? 'Spin Your Golden Bonus'
                      : 'Spin The Wheel'
                    : 'Start Your Spin'}
              </button>

              {!customer ? (
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[11.5px] tracking-wide text-[#F2E6D9]/70">
                    Quick registration required • 1 spin per customer phone number
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalInitialTab('login');
                      setShowRegister(true);
                    }}
                    className="text-[11px] text-[#D4AF7C] underline hover:text-[#FAF4ED]"
                  >
                    Already registered? Look up your entry
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[11.5px] tracking-wide text-[#D4AF7C]">
                    Signed in as {customer.name} (+91 {customer.phone}) • {remainingSpins} spin
                    {remainingSpins === 1 ? '' : 's'} remaining
                  </p>
                  <button
                    type="button"
                    onClick={handleCustomerLogout}
                    className="text-[11px] text-[#F2E6D9]/60 underline hover:text-[#F2E6D9]"
                  >
                    Not {customer.name}? Switch / Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[#D4AF7C]/20 pt-5 text-[11px] text-[#F2E6D9]/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} SOVELLE Handmade Bouquets • Discounts apply to future
            eligible orders.
          </p>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF7C]/25 px-3 py-1 text-[11px] text-[#D4AF7C]/85 transition hover:border-[#D4AF7C]/70 hover:text-[#F2E6D9]"
          >
            <Lock className="h-3 w-3" />
            Stall Admin
          </button>
        </footer>
      </div>

      {/* Registration & Customer Lookup Modal */}
      <RegistrationModal
        isOpen={showRegister}
        initialTab={modalInitialTab}
        onClose={() => setShowRegister(false)}
        onRegister={handleRegister}
        onCustomerLogin={handleCustomerLogin}
        onOpenAdmin={onOpenAdmin}
      />

      {/* Result Modal */}
      <ResultModal
        spin={visibleResult?.spin}
        coupon={visibleResult?.coupon}
        customerName={customer?.name}
        onConfirm={handleConfirmReward}
        confirming={confirming}
      />
    </div>
  );
}
