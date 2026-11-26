import React, { useState } from 'react';
import { Check, Copy, Download, LogOut, Sparkles } from 'lucide-react';
import { downloadVoucherPng } from './ResultModal';

export function VoucherCard({ sessionState, onLogout }) {
  const [copied, setCopied] = useState(false);

  if (!sessionState || !sessionState.customer) return null;
  const { customer, spins, coupon } = sessionState;
  const finalSpin = spins[spins.length - 1];
  if (!finalSpin) return null;

  const handleCopy = async () => {
    if (!coupon?.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const formattedExpiry = coupon?.validUntil
    ? new Date(coupon.validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="animate-fade-slide-up mx-auto w-full max-w-md rounded-2xl border border-[#D4AF7C]/70 bg-[#F2E6D9] p-6 text-[#641D2B] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#D4AF7C]/45 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#8E5B32] uppercase">
            Confirmed Stall Entry
          </p>
          <p className="font-serif text-xl font-semibold text-[#641D2B]">{customer.name}</p>
        </div>
        <span className="rounded-full border border-[#D4AF7C] bg-[#641D2B] px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#F2E6D9] uppercase">
          {spins.length} {spins.length === 1 ? 'Spin' : 'Spins'} Used
        </span>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#641D2B]/70 uppercase">
          Final Result
        </p>
        <h3 className="mt-1 font-serif text-3xl font-bold text-[#641D2B]">
          {finalSpin.rewardTitle}
        </h3>
        <p className="mt-1 text-sm text-[#641D2B]/80">{finalSpin.headlineMessage}</p>
      </div>

      {spins.length === 2 && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#8E5B32]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Spin 1: {spins[0].rewardTitle} → Spin 2: {spins[1].rewardTitle}</span>
        </div>
      )}

      {coupon ? (
        <div className="mt-5 rounded-xl border border-[#D4AF7C] bg-[#FAF4ED] p-4 text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8E5B32] uppercase">
            Your Exclusive Coupon
          </p>
          <div className="mt-2 inline-block rounded-lg border border-[#D4AF7C] bg-[#641D2B] px-5 py-2 font-mono text-lg font-bold tracking-[0.18em] text-[#F2E6D9]">
            {coupon.code}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-3.5 py-2 text-xs font-semibold text-[#641D2B] transition hover:bg-[#E7D5C2]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadVoucherPng({
                  customerName: customer.name,
                  rewardTitle: finalSpin.rewardTitle,
                  couponCode: coupon.code,
                  validUntil: coupon.validUntil,
                  conditions: finalSpin.redemptionConditions,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-3.5 py-2 text-xs font-semibold text-[#641D2B] transition hover:bg-[#E7D5C2]"
            >
              <Download className="h-3.5 w-3.5" />
              Save Image
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#641D2B]/75">
            <span>
              Status:{' '}
              <strong className={coupon.isRedeemed ? 'text-emerald-800' : 'text-[#641D2B]'}>
                {coupon.isRedeemed ? 'Redeemed' : 'Active & Unredeemed'}
              </strong>
            </span>
            {formattedExpiry && <span>• Valid until {formattedExpiry}</span>}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#D4AF7C]/50 bg-[#FAF4ED] p-4 text-center text-xs text-[#641D2B]/75">
          {finalSpin.redemptionConditions}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-[#641D2B]/65">
        {finalSpin.redemptionConditions}
      </p>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#641D2B]/30 bg-[#641D2B]/10 py-3 text-xs font-semibold tracking-wider text-[#641D2B] uppercase transition hover:bg-[#641D2B] hover:text-[#F2E6D9]"
        >
          <LogOut className="h-4 w-4" />
          Finish & Clear for Next Customer (Log Out)
        </button>
      )}
    </div>
  );
}
