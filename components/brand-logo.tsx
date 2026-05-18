'use client';

import Image from 'next/image';

export function BrandLogo() {
  return (
    <div className="flex items-center gap-6">
      <Image
        src="/logo.png"
        alt="Deceptra"
        width={60}
        height={60}
        className="w-[60px] h-[60px] object-contain brightness-110 contrast-110 drop-shadow-[0_0_8px_rgba(0,212,255,1)] drop-shadow-[0_0_24px_rgba(0,212,255,0.6)] transform scale-125 sm:scale-150"
        priority
      />
      <h1
        className="text-white/90 uppercase"
        style={{
          fontFamily: 'Orbitron, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
          fontWeight: 500,
          fontSize: '34px',
          lineHeight: '60px',
          letterSpacing: '0.06em',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        Deceptra
      </h1>
    </div>
  );
}
