import React, { useState } from 'react';
import { Calendar, CheckCircle2, Search, SlidersHorizontal, Ticket } from 'lucide-react';

export function RewardManagement({
  rewards,
  coupons,
  onToggleReward,
  onUpdateRewardConfig,
  onRedeemCoupon,
  onUpdateCouponValidity,
  redeemingId,
}) {
  const [quickCode, setQuickCode] = useState('');
  const [quickMsg, setQuickMsg] = useState(null);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatus, setCouponStatus] = useState('ALL');
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [validityDrafts, setValidityDrafts] = useState({});

  const totalSpinsAcrossRewards = rewards.reduce((sum, r) => sum + (r.totalAwarded || 0), 0);

  const handleQuickRedeem = async (e) => {
    e.preventDefault();
    setQuickMsg(null);
    const trimmed = quickCode.trim().toUpperCase();
    if (!trimmed) return;
    try {
      const res = await onRedeemCoupon(trimmed);
      setQuickMsg({ type: 'ok', text: res.message || `Redeemed ${trimmed}` });
      setQuickCode('');
    } catch (err) {
      setQuickMsg({ type: 'err', text: err.message || 'Unable to redeem coupon.' });
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const q = couponSearch.trim().toLowerCase();
    if (q) {
      const hit =
        c.code.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (couponStatus === 'REDEEMED' && !c.isRedeemed) return false;
    if (couponStatus === 'UNREDEEMED' && c.isRedeemed) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Quick Stall Coupon Redemption */}
      <div className="rounded-2xl border border-[#D4AF7C]/60 bg-[#F2E6D9] p-5 text-[#641D2B] shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.22em] text-[#8E5B32] uppercase">
              <Ticket className="h-3.5 w-3.5" />
              Fast Stall Checkout
            </p>
            <h3 className="mt-0.5 font-serif text-2xl font-semibold">
              Redeem Coupon by Code
            </h3>
            <p className="text-xs text-[#641D2B]/70">
              Enter a customer’s coupon code to verify and mark it redeemed once.
            </p>
          </div>

          <form onSubmit={handleQuickRedeem} className="flex w-full max-w-md gap-2">
            <input
              type="text"
              placeholder="e.g. SOV-7K9M-2XP"
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-xl border border-[#D4AF7C] bg-[#FAF4ED] px-4 py-2.5 font-mono text-xs font-semibold tracking-wider text-[#641D2B] uppercase outline-none focus:border-[#641D2B]"
            />
            <button
              type="submit"
              disabled={!quickCode.trim()}
              className="rounded-xl bg-[#641D2B] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#F2E6D9] uppercase transition hover:bg-[#4E1420] disabled:opacity-50"
            >
              Redeem
            </button>
          </form>
        </div>

        {quickMsg && (
          <div
            className={`mt-3 rounded-xl px-3.5 py-2 text-xs font-medium ${
              quickMsg.type === 'ok'
                ? 'border border-emerald-800/30 bg-emerald-900/10 text-emerald-900'
                : 'border border-red-800/30 bg-red-900/10 text-[#7B1120]'
            }`}
          >
            {quickMsg.text}
          </div>
        )}
      </div>

      {/* Reward Controls & Distribution Statistics */}
      <div className="rounded-2xl border border-[#D4AF7C]/55 bg-[#F2E6D9] p-5 text-[#641D2B] shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.22em] text-[#8E5B32] uppercase">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Wheel Configuration & Distribution
            </p>
            <h3 className="mt-0.5 font-serif text-2xl font-semibold">
              Reward Categories & Validity
            </h3>
          </div>
          <span className="text-xs font-medium text-[#641D2B]/70">
            {totalSpinsAcrossRewards} total spins recorded
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {rewards.map((reward) => {
            const pct =
              totalSpinsAcrossRewards > 0
                ? Math.round((reward.totalAwarded / totalSpinsAcrossRewards) * 100)
                : 0;
            const draftDays = validityDrafts[reward.id] ?? String(reward.validityDays);

            return (
              <div
                key={reward.id}
                className={`rounded-xl border p-4 transition ${
                  reward.isEnabled
                    ? 'border-[#D4AF7C]/75 bg-[#FAF4ED]'
                    : 'border-[#D4AF7C]/35 bg-[#EBDCC9]/45 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#641D2B]">{reward.title}</h4>
                    <p className="mt-0.5 text-[11.5px] text-[#641D2B]/70">
                      Awarded <strong>{reward.totalAwarded}</strong> times ({pct}%)
                      {reward.generatesCoupon && ` • ${reward.totalRedeemed} redeemed`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleReward(reward.id, !reward.isEnabled)}
                    className={`rounded-full px-3 py-1 text-[10.5px] font-semibold tracking-wider uppercase transition ${
                      reward.isEnabled
                        ? 'bg-[#641D2B] text-[#F2E6D9]'
                        : 'border border-[#641D2B]/35 bg-transparent text-[#641D2B]'
                    }`}
                  >
                    {reward.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Distribution Bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#641D2B]/12">
                  <div
                    className="h-full rounded-full bg-[#641D2B] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {reward.generatesCoupon && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#D4AF7C]/35 pt-3 text-[11px]">
                    <span className="text-[#641D2B]/75">Default validity (days):</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={draftDays}
                      onChange={(e) =>
                        setValidityDrafts((prev) => ({ ...prev, [reward.id]: e.target.value }))
                      }
                      className="w-16 rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-2 py-1 text-center font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRewardConfig(reward.id, {
                          validityDays: Math.max(1, Number(draftDays) || 30),
                        })
                      }
                      className="rounded-lg border border-[#D4AF7C] bg-[#F2E6D9] px-2.5 py-1 font-semibold hover:bg-[#E7D5C2]"
                    >
                      Save Days
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All Generated Coupon Codes */}
      <div className="rounded-2xl border border-[#D4AF7C]/55 bg-[#F2E6D9] text-[#641D2B] shadow-lg">
        <div className="flex flex-col gap-3 border-b border-[#D4AF7C]/45 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-2xl font-semibold">Generated Coupon Codes</h3>
            <p className="text-xs text-[#641D2B]/70">
              {coupons.length} coupon codes issued across all eligible spins
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#641D2B]/45" />
              <input
                type="search"
                placeholder="Search code or customer..."
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                className="rounded-xl border border-[#D4AF7C] bg-[#FAF4ED] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#641D2B]"
              />
            </div>
            <select
              value={couponStatus}
              onChange={(e) => setCouponStatus(e.target.value)}
              className="rounded-xl border border-[#D4AF7C] bg-[#FAF4ED] px-3 py-2 text-xs font-medium outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNREDEEMED">Unredeemed</option>
              <option value="REDEEMED">Redeemed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#D4AF7C]/40 bg-[#EBDCC9]/55 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
                <th className="px-4 py-3">Coupon Code</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF7C]/30">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#641D2B]/65">
                    No generated coupon codes found.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isEditing = editingCouponId === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF4ED]">
                      <td className="px-4 py-3 font-mono font-bold tracking-wider">{c.code}</td>
                      <td className="px-4 py-3 font-semibold">{c.rewardTitle}</td>
                      <td className="px-4 py-3">{c.customerName}</td>
                      <td className="px-4 py-3 font-mono">+91 {c.customerPhone}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={editingDate}
                              onChange={(e) => setEditingDate(e.target.value)}
                              className="rounded border border-[#D4AF7C] bg-white px-2 py-1 text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await onUpdateCouponValidity(c.id, editingDate);
                                setEditingCouponId(null);
                              }}
                              className="rounded bg-[#641D2B] px-2 py-1 text-[10px] font-semibold text-[#F2E6D9]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCouponId(null)}
                              className="text-[10px] underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span>
                              {new Date(c.validUntil).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <button
                              type="button"
                              title="Edit validity date"
                              onClick={() => {
                                setEditingCouponId(c.id);
                                setEditingDate(c.validUntil.slice(0, 10));
                              }}
                              className="rounded p-1 text-[#641D2B]/60 hover:bg-[#E7D5C2] hover:text-[#641D2B]"
                            >
                              <Calendar className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.isRedeemed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-900">
                            <CheckCircle2 className="h-3 w-3" />
                            Redeemed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-[#D4AF7C] bg-[#FAF4ED] px-2.5 py-1 text-[10.5px] font-semibold">
                            Unredeemed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!c.isRedeemed && (
                          <button
                            type="button"
                            onClick={() => onRedeemCoupon(c.id)}
                            disabled={redeemingId === c.id}
                            className="rounded-lg bg-[#641D2B] px-3 py-1.5 text-[10.5px] font-semibold text-[#F2E6D9] transition hover:bg-[#4E1420] disabled:opacity-50"
                          >
                            {redeemingId === c.id ? '...' : 'Mark Redeemed'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
