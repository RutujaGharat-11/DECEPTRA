'use client';

import Image from 'next/image';

export function AppBrandHeader() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
      <Image
        src="/logo.png"
        alt="NeuroShield AI logo"
        width={88}
        height={88}
        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
        priority
      />
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">NeuroShield AI</h1>
    </div>
  );
}
