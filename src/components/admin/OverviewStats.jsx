import React from 'react';
import { Award, Gift, Percent, RotateCw, Sparkles, Tag, Users, UserCheck, XCircle } from 'lucide-react';

export function OverviewStats({ overview }) {
  if (!overview) return null;

  const {
    totalRegisteredCustomers,
    totalUniqueCustomers,
    totalSpins,
    totalRewardsWon,
    redeemedCoupons,
    unredeemedCoupons,
    breakdown,
  } = overview;

  const primaryCards = [
    {
      label: 'Registered Customers',
      value: totalRegisteredCustomers,
      sub: 'Total stall entries',
      icon: Users,
    },
    {
      label: 'Unique Customers',
      value: totalUniqueCustomers,
      sub: 'Verified unique mobiles',
      icon: UserCheck,
    },
    {
      label: 'Total Spins',
      value: totalSpins,
      sub: 'Includes golden bonus spins',
      icon: RotateCw,
    },
    {
      label: 'Total Rewards Won',
      value: totalRewardsWon,
      sub: `${redeemedCoupons} redeemed • ${unredeemedCoupons} pending`,
      icon: Award,
    },
  ];

  const categoryCards = [
    { label: 'Golden Spins ✨', value: breakdown.goldenSpins, icon: Sparkles },
    { label: '10% Discounts', value: breakdown.pct10, icon: Percent },
    { label: '20% Discounts', value: breakdown.pct20, icon: Percent },
    { label: 'Free Chocolate 🍫', value: breakdown.freeAddons, icon: Gift },
    { label: 'Flat ₹50 Discounts', value: breakdown.flat50, icon: Tag },
    { label: 'Better Luck Next Time', value: breakdown.betterLuck, icon: XCircle },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#D4AF7C]/55 bg-[#F2E6D9] p-4 sm:p-5 text-[#641D2B] shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-[#8E5B32] uppercase">
                  {card.label}
                </span>
                <Icon className="h-4 w-4 text-[#B58C55]" />
              </div>
              <p className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-[#641D2B]">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-[#641D2B]/70">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categoryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-[#D4AF7C]/40 bg-[#4A131E]/85 px-4 py-3.5 text-[#F2E6D9]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-medium tracking-wider text-[#D4AF7C] uppercase">
                  {item.label}
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#D4AF7C]/80" />
              </div>
              <p className="mt-1.5 font-serif text-2xl font-bold">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
