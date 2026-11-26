import React from 'react';
import { CheckCircle2, Clock, Phone, Sparkles, Ticket, X } from 'lucide-react';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerDetailModal({ customer, onClose, onRedeem, redeemingId }) {
  if (!customer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2A0910]/80 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-fade-slide-up relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#D4AF7C]/65 bg-[#F2E6D9] p-6 text-[#641D2B] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close customer details"
          className="absolute right-4 top-4 rounded-full p-2 text-[#641D2B]/60 hover:bg-[#641D2B]/10 hover:text-[#641D2B]"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-[10px] font-semibold tracking-[0.24em] text-[#8E5B32] uppercase">
          Customer Activity Record
        </p>
        <h3 className="mt-1 font-serif text-3xl font-semibold text-[#641D2B]">
          {customer.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#641D2B]/80">
          <Phone className="h-3.5 w-3.5 text-[#8E5B32]" />
          +91 {customer.phone}
        </p>

        <div className="mt-5 space-y-3 rounded-xl border border-[#D4AF7C]/55 bg-[#FAF4ED] p-4 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-[#641D2B]/70">Registered At</span>
            <span className="font-semibold">{fmtDate(customer.registeredAt)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#641D2B]/70">Spins Completed</span>
            <span className="font-semibold">
              {customer.spinsUsed} / {customer.maxSpinsAllowed}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#641D2B]/70">First Spin Result</span>
            <span className="font-semibold">
              {customer.firstSpinResult || '—'}{' '}
              {customer.firstSpinAt && (
                <span className="font-normal text-[#641D2B]/60">
                  ({fmtDate(customer.firstSpinAt)})
                </span>
              )}
            </span>
          </div>
          {customer.secondSpinResult && (
            <div className="flex justify-between gap-2">
              <span className="text-[#641D2B]/70">Second Spin (Golden Bonus)</span>
              <span className="font-semibold text-[#8E5B32]">
                {customer.secondSpinResult} ({fmtDate(customer.secondSpinAt)})
              </span>
            </div>
          )}
          <div className="flex justify-between gap-2 border-t border-[#D4AF7C]/40 pt-2.5">
            <span className="text-[#641D2B]/70">Final Reward</span>
            <span className="font-serif text-base font-bold text-[#641D2B]">
              {customer.finalReward}
            </span>
          </div>
        </div>

        {customer.couponCode ? (
          <div className="mt-4 rounded-xl border border-[#D4AF7C] bg-[#641D2B] p-4 text-[#F2E6D9]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#D4AF7C] uppercase">
                  <Ticket className="h-3.5 w-3.5" />
                  Issued Coupon
                </p>
                <p className="mt-1 font-mono text-xl font-bold tracking-[0.16em]">
                  {customer.couponCode}
                </p>
                <p className="mt-1 text-[11px] text-[#F2E6D9]/75">
                  Valid until {fmtDate(customer.couponValidUntil)}
                </p>
              </div>

              {customer.isRedeemed ? (
                <div className="rounded-lg border border-emerald-300/40 bg-emerald-950/50 px-3.5 py-2 text-right text-xs text-emerald-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Redeemed
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-85">
                    {fmtDate(customer.redeemedAt)}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRedeem(customer.couponId)}
                  disabled={redeemingId === customer.couponId}
                  className="rounded-lg bg-[#D4AF7C] px-4 py-2.5 text-xs font-bold tracking-wider text-[#4A131E] uppercase transition hover:bg-[#E6C99E] disabled:opacity-60"
                >
                  {redeemingId === customer.couponId ? 'Redeeming...' : 'Mark Redeemed'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#D4AF7C]/45 bg-[#FAF4ED] px-4 py-3 text-xs text-[#641D2B]/75">
            {customer.spinsUsed === 0 ? (
              <>
                <Clock className="h-4 w-4 text-[#8E5B32]" />
                Customer has registered and has not spun yet.
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#8E5B32]" />
                No coupon code issued for this result.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
