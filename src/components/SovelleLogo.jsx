import React from 'react';

export function SovelleLogo({ light = true, compact = false }) {
  return (
    <div className="inline-flex items-center justify-center select-none">
      <img
        src="/sovelle-logo.png"
        alt="SOVELLE — Handmade Bouquets"
        className={`rounded-full object-cover ${compact ? 'h-11 w-11' : 'h-20 w-20 sm:h-24 sm:w-24'
          } ${light
            ? 'ring-2 ring-[#D4AF7C]/60 drop-shadow-[0_4px_14px_rgba(212,175,124,0.30)]'
            : 'ring-2 ring-[#D4AF7C]/80 shadow-md'
          }`}
        draggable="false"
      />
    </div>
  );
}


