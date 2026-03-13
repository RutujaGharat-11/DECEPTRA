'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navigation } from './navigation';
import { Scanner } from './pages/scanner';
import { History } from './pages/history';
import { Reports } from './pages/reports';
import { Settings } from './pages/settings';

type Page = 'scanner' | 'history' | 'reports' | 'settings';
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

  const renderPage = () => {
    switch (currentPage) {
      case 'scanner':
        return <Scanner />;
      case 'history':
        return <History />;
      case 'reports':
        return <Reports initialTab={initialReportsTab} />;
      case 'settings':
        return <Settings />;
      default:
        return <Scanner />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-start">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="NeuroShield AI"
              width={40}
              height={40}
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-foreground">NeuroShield AI</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20">
        <div className="mx-auto w-full max-w-[1320px]">
          {renderPage()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
