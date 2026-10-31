'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Navigation } from './navigation';
import { Scanner } from './pages/scanner';
import { History } from './pages/history';
import { ProfileDashboard } from './pages/profile';
import { BrandLogo } from './brand-logo';
import { apiUrl } from '@/lib/api';

type Page = 'scanner' | 'history' | 'profile';

interface DashboardLayoutProps {
  initialPage?: Page;
}

export function DashboardLayout({ initialPage = 'scanner' }: DashboardLayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  const router = useRouter();

  const { isLoaded: clerkLoaded, isSignedIn, user } = useUser();
  const syncAttemptedRef = useRef(false);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      router.replace('/login');
      return;
    }

    if (!user || syncAttemptedRef.current) return;
    syncAttemptedRef.current = true;

    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
    const email = user.primaryEmailAddress?.emailAddress || '';

    // Cache user profile immediately from Clerk session
    if (!localStorage.getItem('auth_user')) {
      localStorage.setItem('auth_user', JSON.stringify({ full_name: fullName, email }));
    }

    const syncBackend = async () => {
      const existingToken = localStorage.getItem('auth_token');
      if (existingToken) return;

      const password = user.id;

      try {
        let response = await fetch(apiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (response.status === 401) {
          const regResponse = await fetch(apiUrl('/auth/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: fullName,
              email,
              password,
              confirm_password: password,
            }),
          });

          if (regResponse.ok) {
            response = await fetch(apiUrl('/auth/login'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
          }
        }

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
          if (data.user) {
            localStorage.setItem('auth_user', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        // Backend synchronization error should not block Clerk authentication
        console.warn('Backend sync error (continuing with Clerk session):', err);
      }
    };

    void syncBackend();
  }, [clerkLoaded, isSignedIn, user, router]);

  if (!clerkLoaded || !isSignedIn) {
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
      </main>

      {/* Bottom Navigation */}
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
