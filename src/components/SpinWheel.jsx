import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_SEGMENTS = [
  { key: 'GOLDEN_SPIN', segmentIndex: 0, title: 'GOLDEN SPIN ✨', shortLabel: 'GOLDEN SPIN ✨' },
  { key: 'PCT_10', segmentIndex: 1, title: '10% OFF', shortLabel: '10% OFF' },
  { key: 'PCT_20', segmentIndex: 2, title: '20% OFF', shortLabel: '20% OFF' },
  { key: 'FREE_ADDON', segmentIndex: 3, title: 'FREE CHOCOLATE 🍫', shortLabel: 'FREE CHOCOLATE 🍫' },
  {
    key: 'BETTER_LUCK',
    segmentIndex: 4,
    title: 'BETTER LUCK NEXT TIME',
    shortLabel: 'BETTER LUCK NEXT TIME',
  },
  { key: 'FLAT_50', segmentIndex: 5, title: 'FLAT ₹50 OFF', shortLabel: 'FLAT ₹50 OFF' },
];

const SEGMENT_PALETTE = {
  GOLDEN_SPIN: {
    fill: '#D4AF7C',
    text: '#4A131E',
    sub: '#641D2B',
    badge: 'BONUS SPIN',
  },
  PCT_10: {
    fill: '#F2E6D9',
    text: '#641D2B',
    sub: '#8E4352',
    badge: 'NEXT ORDER',
  },
  PCT_20: {
    fill: '#4E1420',
    text: '#F2E6D9',
    sub: '#D4AF7C',
    badge: 'NEXT ORDER',
  },
  FREE_ADDON: {
    fill: '#F2E6D9',
    text: '#641D2B',
    sub: '#8E4352',
    badge: 'CHOCOLATE',
  },
  BETTER_LUCK: {
    fill: '#561825',
    text: '#E9D8C7',
    sub: '#D4AF7C',
    badge: 'NEXT TIME',
  },
  FLAT_50: {
    fill: '#F2E6D9',
    text: '#641D2B',
    sub: '#8E4352',
    badge: 'BOUQUET',
  },
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createSlicePath(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function splitLabelLines(label) {
  if (label === 'BETTER LUCK NEXT TIME') return ['BETTER LUCK', 'NEXT TIME'];
  if (label === 'GOLDEN SPIN ✨') return ['GOLDEN', 'SPIN ✨'];
  if (label === 'FREE CHOCOLATE 🍫' || label === 'FREE ADD-ON 🎁') return ['FREE', 'CHOCOLATE 🍫'];
  if (label === 'FLAT ₹50 OFF') return ['FLAT ₹50', 'OFF'];
  return [label];
}

function playSoftTick(audioCtxRef) {
  try {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Ignore audio errors when autoplay/audio context is blocked
  }
}

export function SpinWheel({
  segments = DEFAULT_SEGMENTS,
  targetSpin,
  isSpinning,
  canSpinDirect,
  onDirectClick,
  onSpinComplete,
  soundEnabled = true,
}) {
  const orderedSegments = (segments.length === 6 ? segments : DEFAULT_SEGMENTS)
    .slice()
    .sort((a, b) => a.segmentIndex - b.segmentIndex);

  const [rotation, setRotation] = useState(0);
  const [pointerPulse, setPointerPulse] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  const rotationRef = useRef(0);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const onCompleteRef = useRef(onSpinComplete);
  onCompleteRef.current = onSpinComplete;

  useEffect(() => {
    if (!targetSpin) return;

    const { segmentIndex, spinKey } = targetSpin;
    const startRotation = rotationRef.current;
    setHighlightedIndex(null);

    // Segment i is centered at i * 60 deg. Add subtle organic jitter well within [-13, +13] deg.
    const jitter = (Math.random() - 0.5) * 24;
    const targetMod = (360 - segmentIndex * 60 + jitter + 360) % 360;
    const currentMod = ((startRotation % 360) + 360) % 360;
    const deltaMod = (targetMod - currentMod + 360) % 360;
    const extraRevolutions = 6 * 360;
    const endRotation = startRotation + extraRevolutions + deltaMod;

    const duration = 4800; // 4.8 seconds smooth deceleration
    const startTime = performance.now();
    let lastSliceBoundary = Math.floor((startRotation + 30) / 60);

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutQuart(progress);
      const current = startRotation + (endRotation - startRotation) * eased;

      rotationRef.current = current;
      setRotation(current);

      const currentBoundary = Math.floor((current + 30) / 60);
      if (currentBoundary !== lastSliceBoundary) {
        lastSliceBoundary = currentBoundary;
        setPointerPulse(true);
        setTimeout(() => setPointerPulse(false), 120);
        if (soundEnabled && progress < 0.96) {
          playSoftTick(audioCtxRef);
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        rotationRef.current = endRotation;
        setRotation(endRotation);
        setHighlightedIndex(segmentIndex);
        setTimeout(() => {
          onCompleteRef.current?.(spinKey);
        }, 420);
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetSpin?.spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const cx = 250;
  const cy = 250;
  const wheelRadius = 212;

  return (
    <div className="relative mx-auto flex w-full max-w-[360px] sm:max-w-[420px] items-center justify-center select-none">
      {/* Subtle radial ambient glow */}
      <div
        className="pointer-events-none absolute inset-4 rounded-full opacity-45 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(212,175,124,0.32) 0%, rgba(100,29,43,0) 70%)',
        }}
      />

      {/* Fixed Top Pointer */}
      <div
        className={`pointer-events-none absolute -top-2.5 left-1/2 z-20 origin-top transition-transform duration-100 ${
          pointerPulse ? '-rotate-12' : 'rotate-0'
        }`}
        style={{ transform: `translateX(-50%) ${pointerPulse ? 'rotate(-12deg)' : 'rotate(0deg)'}` }}
      >
        <svg width="42" height="52" viewBox="0 0 42 52" fill="none" className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]">
          <path
            d="M21 50L7 17C5.4 13.2 6.1 8.8 8.9 5.8C12 2.4 16.4 1 21 1C25.6 1 30 2.4 33.1 5.8C35.9 8.8 36.6 13.2 35 17L21 50Z"
            fill="#D4AF7C"
            stroke="#4A131E"
            strokeWidth="2"
          />
          <circle cx="21" cy="14" r="5.5" fill="#641D2B" stroke="#F2E6D9" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Main Wheel SVG */}
      <div className="relative w-full aspect-square">
        <svg
          viewBox="0 0 500 500"
          className="h-full w-full drop-shadow-[0_20px_45px_rgba(24,5,10,0.62)]"
          role="img"
          aria-label="THE SOVELLE SPIN reward wheel"
        >
          <defs>
            <linearGradient id="goldBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E6C99E" />
              <stop offset="45%" stopColor="#D4AF7C" />
              <stop offset="100%" stopColor="#A9804A" />
            </linearGradient>
            <radialGradient id="hubGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7B2536" />
              <stop offset="100%" stopColor="#4A131E" />
            </radialGradient>
          </defs>

          {/* Static Luxury Outer Bezel */}
          <circle cx={cx} cy={cy} r="240" fill="#3B0E17" stroke="url(#goldBezel)" strokeWidth="5" />
          <circle cx={cx} cy={cy} r="224" fill="none" stroke="#D4AF7C" strokeOpacity="0.45" strokeWidth="1.2" />

          {/* 12 Subtle Gold Stud Pearls on Outer Bezel */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const p = polarToCartesian(cx, cy, 232, idx * 30);
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={idx % 2 === 0 ? 3.4 : 2.3}
                fill={idx % 2 === 0 ? '#E6C99E' : '#D4AF7C'}
                opacity={idx % 2 === 0 ? 0.95 : 0.65}
              />
            );
          })}

          {/* Rotating Wheel Group */}
          <g transform={`rotate(${rotation} ${cx} ${cy})`}>
            {orderedSegments.map((seg, i) => {
              const startDeg = i * 60 - 30;
              const endDeg = i * 60 + 30;
              const midDeg = i * 60;
              const style = SEGMENT_PALETTE[seg.key] || SEGMENT_PALETTE.PCT_10;
              const lines = splitLabelLines(seg.shortLabel || seg.title);
              const isHighlighted = highlightedIndex === seg.segmentIndex;

              return (
                <g key={seg.key}>
                  <path
                    d={createSlicePath(cx, cy, wheelRadius, startDeg, endDeg)}
                    fill={style.fill}
                    stroke="#D4AF7C"
                    strokeWidth={isHighlighted ? '3' : '1.4'}
                    opacity={
                      highlightedIndex !== null && !isHighlighted ? 0.84 : 1
                    }
                  />

                  {/* Decorative inner arc detail */}
                  <path
                    d={createSlicePath(cx, cy, wheelRadius - 10, startDeg + 2, endDeg - 2)}
                    fill="none"
                    stroke={style.sub}
                    strokeOpacity="0.22"
                    strokeWidth="0.9"
                  />

                  {/* Segment Text */}
                  <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
                    <text
                      x={cx}
                      y={cy - 156}
                      textAnchor="middle"
                      fill={style.sub}
                      fontSize="9.5"
                      fontWeight="600"
                      letterSpacing="2.2"
                      className="uppercase"
                    >
                      {style.badge}
                    </text>

                    {lines.map((line, lineIdx) => (
                      <text
                        key={lineIdx}
                        x={cx}
                        y={lines.length === 1 ? cy - 122 : cy - 130 + lineIdx * 20}
                        textAnchor="middle"
                        fill={style.text}
                        fontSize={line.length > 10 ? '14.5' : '17.5'}
                        fontWeight="700"
                        letterSpacing="0.8"
                        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                </g>
              );
            })}

            {/* Center Spoke Cap Outline */}
            <circle
              cx={cx}
              cy={cy}
              r="50"
              fill="none"
              stroke="#D4AF7C"
              strokeWidth="2.5"
            />
          </g>

          {/* Center Medallion (Static Gold Rim Backing) */}
          <circle
            cx={cx}
            cy={cy}
            r="46"
            fill="url(#hubGrad)"
            stroke="url(#goldBezel)"
            strokeWidth="3.5"
          />
          <circle
            cx={cx}
            cy={cy}
            r="38"
            fill="none"
            stroke="#D4AF7C"
            strokeOpacity="0.55"
            strokeWidth="1"
          />
        </svg>

        {/* Center Circular SOVELLE Swan Logo Hub */}
        <button
          type="button"
          onClick={onDirectClick}
          disabled={isSpinning}
          aria-label={canSpinDirect ? 'Spin the wheel' : 'Start your spin'}
          className={`group absolute left-1/2 top-1/2 flex h-[80px] w-[80px] sm:h-[92px] sm:w-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C99E] ${
            isSpinning
              ? 'cursor-wait opacity-95'
              : 'cursor-pointer hover:scale-105 active:scale-95 drop-shadow-[0_4px_16px_rgba(212,175,124,0.35)]'
          }`}
        >
          <img
            src="/sovelle-logo.png"
            alt="SOVELLE Logo"
            className="h-full w-full rounded-full object-cover ring-2 ring-[#D4AF7C] shadow-lg transition-all duration-300 group-hover:ring-[#FAF4ED] group-hover:drop-shadow-[0_0_12px_rgba(212,175,124,0.5)]"
            draggable="false"
          />
        </button>
      </div>
    </div>
  );
}
