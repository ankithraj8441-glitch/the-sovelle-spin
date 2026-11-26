import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LogOut, RefreshCw, Sliders, Users } from 'lucide-react';
import { api } from '../../api/client';
import { SovelleLogo } from '../SovelleLogo';
import { OverviewStats } from './OverviewStats';
import { CustomerTable } from './CustomerTable';
import { RewardManagement } from './RewardManagement';

export function AdminDashboard({ admin, onLogout, onClose }) {
  const [tab, setTab] = useState('activity');
  const [overview, setOverview] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    rewardKey: 'ALL',
    redemptionStatus: 'ALL',
  });
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, cust, coup, rew] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminCustomers(filters),
        api.getAdminCoupons(),
        api.getAdminRewards(),
      ]);
      setOverview(ov);
      setCustomers(cust.customers || []);
      setCoupons(coup.coupons || []);
      setRewards(rew.rewards || []);
    } catch (err) {
      setBanner({ type: 'err', text: err.message || 'Failed to load dashboard data.' });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRedeem = async (identifier) => {
    setRedeemingId(identifier);
    setBanner(null);
    try {
      const res = await api.redeemCoupon(identifier);
      setBanner({ type: 'ok', text: res.message });
      await loadAll();
      return res;
    } catch (err) {
      setBanner({ type: 'err', text: err.message });
      throw err;
    } finally {
      setRedeemingId(null);
    }
  };

  const handleToggleReward = async (id, isEnabled) => {
    try {
      await api.updateReward(id, { isEnabled });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleUpdateRewardConfig = async (id, payload) => {
    try {
      await api.updateReward(id, payload);
      setBanner({ type: 'ok', text: 'Reward validity updated.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleUpdateCouponValidity = async (id, validUntil) => {
    try {
      await api.updateCouponValidity(id, validUntil);
      setBanner({ type: 'ok', text: 'Coupon expiry date updated.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#641D2B] text-[#F2E6D9]">
      {/* Top Admin Header */}
      <header className="border-b border-[#D4AF7C]/30 bg-[#4A131E]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <SovelleLogo light compact />
            <div className="hidden h-6 w-px bg-[#D4AF7C]/30 sm:block" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#D4AF7C] uppercase">
                Admin Dashboard
              </p>
              <p className="text-xs text-[#F2E6D9]/80">Signed in as {admin.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF7C]/40 px-3 py-2 text-xs font-medium text-[#F2E6D9] transition hover:border-[#D4AF7C] hover:bg-[#641D2B]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose || onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF7C]/40 px-3 py-2 text-xs font-medium text-[#F2E6D9] transition hover:border-[#D4AF7C] hover:bg-[#641D2B]"
            >
              <span className="hidden sm:inline">Customer View</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF7C] px-3.5 py-2 text-xs font-bold text-[#4A131E] transition hover:bg-[#E6C99E]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7 sm:px-8">
        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-medium ${
              banner.type === 'ok'
                ? 'border-[#D4AF7C] bg-[#F2E6D9] text-[#641D2B]'
                : 'border-red-400/50 bg-[#3B0E17] text-[#F2E6D9]'
            }`}
          >
            {banner.text}
          </div>
        )}

        <OverviewStats overview={overview} />

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#D4AF7C]/25 pb-3">
          <button
            type="button"
            onClick={() => setTab('activity')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition ${
              tab === 'activity'
                ? 'bg-[#F2E6D9] text-[#641D2B] shadow'
                : 'border border-[#D4AF7C]/35 text-[#F2E6D9]/85 hover:bg-[#4A131E]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Customer Activity ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('rewards')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition ${
              tab === 'rewards'
                ? 'bg-[#F2E6D9] text-[#641D2B] shadow'
                : 'border border-[#D4AF7C]/35 text-[#F2E6D9]/85 hover:bg-[#4A131E]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Reward & Coupon Management ({coupons.length})
          </button>
        </div>

        {tab === 'activity' ? (
          <CustomerTable
            customers={customers}
            filters={filters}
            onFiltersChange={setFilters}
            onRedeem={handleRedeem}
            redeemingId={redeemingId}
            loading={loading}
          />
        ) : (
          <RewardManagement
            rewards={rewards}
            coupons={coupons}
            onToggleReward={handleToggleReward}
            onUpdateRewardConfig={handleUpdateRewardConfig}
            onRedeemCoupon={handleRedeem}
            onUpdateCouponValidity={handleUpdateCouponValidity}
            redeemingId={redeemingId}
          />
        )}
      </main>
    </div>
  );
}
