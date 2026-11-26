import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Gift, Sparkles } from 'lucide-react';

/**
 * Generates a downloadable PNG voucher card in SOVELLE brand colors.
 */
export function downloadVoucherPng({ customerName, rewardTitle, couponCode, validUntil, conditions }) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');

  // Oxblood Burgundy background
  ctx.fillStyle = '#641D2B';
  ctx.fillRect(0, 0, 960, 560);

  // Outer Soft Gold border
  ctx.strokeStyle = '#D4AF7C';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 912, 512);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(36, 36, 888, 488);

  // Warm Ivory inner card
  ctx.fillStyle = '#F2E6D9';
  ctx.fillRect(56, 56, 848, 448);

  // Header
  ctx.fillStyle = '#641D2B';
  ctx.textAlign = 'center';
  ctx.font = '600 22px Georgia, serif';
  ctx.fillText('S O V E L L E   •   H A N D M A D E   B O U Q U E T S', 480, 114);

  ctx.fillStyle = '#B58C55';
  ctx.font = '600 15px sans-serif';
  ctx.fillText('THE SOVELLE SPIN  —  OFFICIAL PRIVILEGE VOUCHER', 480, 146);

  // Divider line
  ctx.strokeStyle = '#D4AF7C';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(220, 168);
  ctx.lineTo(740, 168);
  ctx.stroke();

  // Reward title
  ctx.fillStyle = '#641D2B';
  ctx.font = '700 46px Georgia, serif';
  ctx.fillText(rewardTitle, 480, 232);

  // Customer name
  ctx.fillStyle = '#4A131E';
  ctx.font = '500 21px sans-serif';
  ctx.fillText(`Awarded to ${customerName}`, 480, 274);

  // Coupon code box
  ctx.fillStyle = '#641D2B';
  ctx.fillRect(270, 304, 420, 74);
  ctx.strokeStyle = '#D4AF7C';
  ctx.lineWidth = 2;
  ctx.strokeRect(270, 304, 420, 74);

  ctx.fillStyle = '#F2E6D9';
  ctx.font = '700 32px monospace';
  ctx.fillText(couponCode, 480, 352);

  // Expiry & Conditions
  const expiryFormatted = new Date(validUntil).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = '#641D2B';
  ctx.font = '600 15px sans-serif';
  ctx.fillText(`Valid until ${expiryFormatted}  •  Single-use only`, 480, 418);

  ctx.fillStyle = '#6E3B46';
  ctx.font = '400 13px sans-serif';
  const condText = (conditions || '').slice(0, 92);
  ctx.fillText(condText, 480, 452);

  const link = document.createElement('a');
  link.download = `SOVELLE-Voucher-${couponCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function ResultModal({ spin, coupon, customerName, onConfirm, confirming }) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!spin?.isWin || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const palette = ['#D4AF7C', '#F2E6D9', '#E6C99E', '#B58C55'];
    const particles = Array.from({ length: 42 }).map(() => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 180,
      w: 5 + Math.random() * 6,
      h: 7 + Math.random() * 8,
      vy: 1.8 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 1.4,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.08,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.85,
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        if (p.y > canvas.height * 0.65) {
          p.alpha = Math.max(0, p.alpha - 0.02);
        }
        if (p.alpha > 0.02 && p.y < canvas.height + 20) {
          active = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (active) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [spin?.id, spin?.isWin]);

  if (!spin) return null;

  const handleCopy = async () => {
    if (!coupon?.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2A0910]/82 p-0 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {spin.isWin && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50"
          aria-hidden="true"
        />
      )}

      <div className="animate-fade-slide-up relative z-[51] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#D4AF7C]/70 bg-[#F2E6D9] px-6 py-7 text-[#641D2B] shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF7C] bg-[#641D2B] text-[#D4AF7C] shadow-md">
          {spin.grantsExtraSpin ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <Gift className="h-5 w-5" />
          )}
        </div>

        <p className="text-center text-[11px] font-semibold tracking-[0.26em] text-[#8E5B32] uppercase">
          {spin.grantsExtraSpin
            ? 'Golden Spin Unlocked'
            : spin.isWin
              ? 'Your SOVELLE Surprise'
              : 'Thank You For Playing'}
        </p>

        <h2 className="mt-1.5 text-center font-serif text-3xl font-semibold leading-tight text-[#641D2B]">
          {spin.headlineMessage}
        </h2>

        <p className="mt-2 text-center text-sm text-[#641D2B]/80">
          {customerName ? `For ${customerName} — ` : ''}
          {spin.description}
        </p>

        {/* Reward Showcase Box */}
        <div className="mt-5 rounded-2xl border border-[#D4AF7C] bg-[#FAF4ED] p-4 text-center shadow-inner">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#8E5B32] uppercase">
            Result
          </p>
          <p className="mt-1 font-serif text-2xl font-bold tracking-wide text-[#641D2B]">
            {spin.rewardTitle}
          </p>

          {coupon && (
            <div className="mt-4 space-y-2.5 border-t border-[#D4AF7C]/45 pt-4">
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#641D2B]/70 uppercase">
                Unique Coupon Code
              </p>
              <div className="mx-auto inline-flex items-center gap-3 rounded-xl border border-[#D4AF7C] bg-[#641D2B] px-5 py-2.5 text-[#F2E6D9] shadow">
                <span className="font-mono text-lg font-bold tracking-[0.18em]">
                  {coupon.code}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-3.5 py-2 text-xs font-semibold text-[#641D2B] transition hover:bg-[#E7D5C2]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Code
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadVoucherPng({
                      customerName,
                      rewardTitle: spin.rewardTitle,
                      couponCode: coupon.code,
                      validUntil: coupon.validUntil,
                      conditions: spin.redemptionConditions,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-3.5 py-2 text-xs font-semibold text-[#641D2B] transition hover:bg-[#E7D5C2]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save Voucher
                </button>
              </div>

              {formattedExpiry && (
                <p className="text-[11px] font-medium text-[#641D2B]/75">
                  Valid until <span className="font-semibold">{formattedExpiry}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-3.5 text-center text-[11.5px] leading-relaxed text-[#641D2B]/70">
          {spin.redemptionConditions}
        </p>

        <button
          type="button"
          onClick={() => onConfirm(spin.id)}
          disabled={confirming}
          className="mt-5 w-full rounded-xl bg-[#641D2B] px-5 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#F2E6D9] uppercase shadow-lg transition hover:bg-[#4E1420] disabled:opacity-60"
        >
          {confirming
            ? 'Confirming...'
            : spin.grantsExtraSpin
              ? 'Confirm Reward & Spin Again'
              : 'Confirm Reward'}
        </button>
      </div>
    </div>
  );
}
