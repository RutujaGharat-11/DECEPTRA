'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from './navigation';
import { Scanner } from './pages/scanner';
import { History } from './pages/history';
import { ProfileDashboard } from './pages/profile';
import { Reports } from './pages/reports';
import { BrandLogo } from './brand-logo';

type Page = 'scanner' | 'history' | 'profile' | 'reports';
type ReportsTab = 'overview' | 'history' | 'anomalies';

interface DashboardLayoutProps {
  initialPage?: Page;
  initialReportsTab?: ReportsTab;
}

export function DashboardLayout({ initialPage = 'scanner', initialReportsTab = 'overview' }: DashboardLayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady) {
    return null;
  }

  // Scanner manages its own fixed header and full-viewport layout
  if (currentPage === 'scanner') {
    return (
      <div className="h-screen bg-[#020813] overflow-hidden">
        <Scanner />
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    );
  }

  // All non-scanner pages use a shared branded header + scrollable layout
  return (
    <div className="flex flex-col h-screen bg-[#020813] overflow-hidden">
      {/* Branded Top Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-[#020813]/95 backdrop-blur-xl border-b border-[#1e3a8a]/40 shadow-[0_1px_0_rgba(0,212,255,0.12),0_8px_32px_-8px_rgba(0,212,255,0.15)]">
        <BrandLogo />
      </header>

      {/* Scrollable Page Content */}
      <main className="flex-1 overflow-y-auto pb-28">
        {currentPage === 'history' && <History />}
        {currentPage === 'profile' && <ProfileDashboard />}
        {currentPage === 'reports' && <Reports initialTab={initialReportsTab} />}
      </main>

      {/* Bottom Navigation */}
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
