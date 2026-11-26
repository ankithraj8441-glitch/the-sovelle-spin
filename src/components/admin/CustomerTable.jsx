import React, { useState } from 'react';
import { CheckCircle2, Download, Eye, Search } from 'lucide-react';
import { CustomerDetailModal } from './CustomerDetailModal';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerTable({
  customers,
  filters,
  onFiltersChange,
  onRedeem,
  redeemingId,
  loading,
}) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const exportUrl = `/api/admin/export.csv?${new URLSearchParams(filters).toString()}`;

  return (
    <div className="rounded-2xl border border-[#D4AF7C]/55 bg-[#F2E6D9] text-[#641D2B] shadow-xl">
      {/* Filter & Export Toolbar */}
      <div className="flex flex-col gap-3 border-b border-[#D4AF7C]/45 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#641D2B]/45" />
            <input
              type="search"
              placeholder="Search name, phone, or coupon code..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="w-full rounded-xl border border-[#D4AF7C]/75 bg-[#FAF4ED] py-2.5 pl-10 pr-3 text-xs text-[#641D2B] placeholder-[#641D2B]/45 outline-none focus:border-[#641D2B]"
            />
          </div>

          <select
            aria-label="Filter by reward category"
            value={filters.rewardKey}
            onChange={(e) => onFiltersChange({ ...filters, rewardKey: e.target.value })}
            className="rounded-xl border border-[#D4AF7C]/75 bg-[#FAF4ED] px-3 py-2.5 text-xs font-medium text-[#641D2B] outline-none focus:border-[#641D2B]"
          >
            <option value="ALL">All Rewards</option>
            <option value="GOLDEN_SPIN">Golden Spin ✨</option>
            <option value="PCT_10">10% OFF</option>
            <option value="PCT_20">20% OFF</option>
            <option value="FREE_ADDON">Free Chocolate 🍫</option>
            <option value="FLAT_50">Flat ₹50 OFF</option>
            <option value="BETTER_LUCK">Better Luck Next Time</option>
          </select>

          <select
            aria-label="Filter by redemption status"
            value={filters.redemptionStatus}
            onChange={(e) => onFiltersChange({ ...filters, redemptionStatus: e.target.value })}
            className="rounded-xl border border-[#D4AF7C]/75 bg-[#FAF4ED] px-3 py-2.5 text-xs font-medium text-[#641D2B] outline-none focus:border-[#641D2B]"
          >
            <option value="ALL">All Coupon Statuses</option>
            <option value="UNREDEEMED">Unredeemed</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="NA">No Coupon</option>
          </select>
        </div>

        <a
          href={exportUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#641D2B] px-4 py-2.5 text-xs font-semibold tracking-wider text-[#F2E6D9] uppercase transition hover:bg-[#4E1420]"
        >
          <Download className="h-3.5 w-3.5 text-[#D4AF7C]" />
          Export CSV
        </a>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D4AF7C]/45 bg-[#EBDCC9]/55 text-[10.5px] font-semibold tracking-[0.14em] text-[#641D2B]/80 uppercase">
              <th className="px-4 py-3">Customer Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3 text-center">Spins</th>
              <th className="px-4 py-3">First Spin</th>
              <th className="px-4 py-3">Second Spin</th>
              <th className="px-4 py-3">Final Reward</th>
              <th className="px-4 py-3">Coupon Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4AF7C]/30">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[#641D2B]/65">
                  Loading customer activity...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[#641D2B]/65">
                  No customer activity matches your current filters.
                </td>
              </tr>
            ) : (
              customers.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedCustomer(row)}
                  className="cursor-pointer transition hover:bg-[#FAF4ED]"
                >
                  <td className="px-4 py-3.5 font-semibold text-[#641D2B]">{row.name}</td>
                  <td className="px-4 py-3.5 font-mono text-[11.5px]">+91 {row.phone}</td>
                  <td className="px-4 py-3.5 text-[#641D2B]/75">
                    {formatDateTime(row.registeredAt)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold">{row.spinsUsed}</td>
                  <td className="px-4 py-3.5">{row.firstSpinResult || '—'}</td>
                  <td className="px-4 py-3.5 text-[#8E5B32]">{row.secondSpinResult || '—'}</td>
                  <td className="px-4 py-3.5 font-semibold">{row.finalReward}</td>
                  <td className="px-4 py-3.5 font-mono font-semibold tracking-wider">
                    {row.couponCode || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {row.redemptionState === 'REDEEMED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-900">
                        <CheckCircle2 className="h-3 w-3" />
                        Redeemed
                      </span>
                    ) : row.redemptionState === 'UNREDEEMED' ? (
                      <span className="inline-flex items-center rounded-full border border-[#D4AF7C] bg-[#FAF4ED] px-2.5 py-1 text-[10.5px] font-semibold text-[#641D2B]">
                        Unredeemed
                      </span>
                    ) : (
                      <span className="text-[#641D2B]/45">N/A</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(row)}
                        title="View customer activity"
                        className="rounded-lg border border-[#D4AF7C]/70 p-1.5 text-[#641D2B] transition hover:bg-[#E7D5C2]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {row.couponId && !row.isRedeemed && (
                        <button
                          type="button"
                          onClick={() => onRedeem(row.couponId)}
                          disabled={redeemingId === row.couponId}
                          className="rounded-lg bg-[#641D2B] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#F2E6D9] transition hover:bg-[#4E1420] disabled:opacity-50"
                        >
                          {redeemingId === row.couponId ? '...' : 'Redeem'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <CustomerDetailModal
          customer={
            customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer
          }
          onClose={() => setSelectedCustomer(null)}
          onRedeem={onRedeem}
          redeemingId={redeemingId}
        />
      )}
    </div>
  );
}
