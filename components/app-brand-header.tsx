'use client';

import Image from 'next/image';

export function AppBrandHeader() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3">
      <Image
        src="/logo.png"
        alt="Deceptra logo"
        width={72}
        height={72}
        className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
        priority
      />
      <h1
        className="text-foreground/95 uppercase"
        style={{
          fontFamily: 'Orbitron, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
          fontWeight: 500,
          fontSize: '30px',
          lineHeight: '36px',
          letterSpacing: '0.06em',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        Deceptra
      </h1>
    </div>
  );
}
