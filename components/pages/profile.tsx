'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  ShieldCheck,
  Activity,
  Radar,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';

type HistoryItem = {
  id: number;
  message_text?: string;
  risk_level?: string;
  risk?: string;
  confidence?: number;
  timestamp: string;
};

export function ProfileDashboard() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  
  // Real Information State
  const [totalScans, setTotalScans] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [lowRisk, setLowRisk] = useState(0);
  const [lastScanTime, setLastScanTime] = useState('Never');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const cachedUser = localStorage.getItem('auth_user');

    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser) as { full_name?: string; email?: string };
        setProfileName(parsed.full_name || 'User');
        setProfileEmail(parsed.email || '');
      } catch {
        setProfileName('User');
      }
    }

    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch User Info
    fetch(apiUrl('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unauthorized');
        const data = (await res.json()) as { full_name: string; email: string };
        setProfileName(data.full_name);
        setProfileEmail(data.email);
        localStorage.setItem('auth_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.replace('/login');
      });

    // Fetch History for Stats
    fetch(apiUrl('/api/history'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then((history: HistoryItem[]) => {
        setTotalScans(history.length);
        const high = history.filter(h => (h.risk || h.risk_level)?.toUpperCase() === 'HIGH').length;
        const low = history.filter(h => (h.risk || h.risk_level)?.toUpperCase() === 'LOW').length;
        setHighRisk(high);
        setLowRisk(low);
        
        if (history.length > 0) {
          const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLastScanTime(new Date(sorted[0].timestamp).toLocaleString());
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, [router]);

  const initials = (profileName || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join('');

  const handleSignOut = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Best-effort signout.
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.replace('/login');
  };

  return (
    <div className="relative mx-auto max-w-[1400px] pb-24 mt-8 px-6 lg:px-8 animate-in fade-in duration-500">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr] items-start">
        {/* LEFT COLUMN: Profile Card & Logout */}
        <div className="flex flex-col gap-6 w-full">
          <section className="relative rounded-[24px] border border-[#1e3a8a]/50 bg-[#06142e]/70 backdrop-blur-xl p-8 flex flex-col items-center text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-[#1e3a8a]/50 bg-[#030B1C] mb-6">
              <span className="text-3xl font-black tracking-[0.2em] text-[#00D4FF]">{initials || 'U'}</span>
            </div>
            
            <div className="space-y-1 w-full">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00D4FF]/70">Identity</p>
              <h1 className="text-2xl font-semibold text-white mb-1 truncate">{profileName || 'User'}</h1>
              <p className="text-xs text-white/40 truncate">{profileEmail || 'user@example.com'}</p>
            </div>

            <div className="w-full h-px bg-[#1e3a8a]/30 my-6" />

            <div className="w-full flex items-center justify-between text-sm">
              <span className="text-white/40 font-medium">Status</span>
              <span className="text-[#00FF66] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF66]"></span>
                Online
              </span>
            </div>
          </section>

          {/* Minimal Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:border-red-500/40 backdrop-blur-xl"
          >
            <LogOut className="h-4 w-4" />
            Disconnect Session
          </button>
        </div>

        {/* RIGHT COLUMN: Real Data Panels */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Usage Summary Panel */}
          <section className="rounded-[24px] border border-[#1e3a8a]/50 bg-[#06142e]/60 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-[#1e3a8a]/30 pb-4 mb-6">
              <div className="rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 p-2 text-[#00D4FF]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Telemetry</p>
                <h2 className="text-lg font-bold text-white">Usage Summary</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#1e3a8a]/30 bg-[#030B1C]/80 p-4 flex flex-col justify-between min-h-[120px]">
                <Radar className="w-5 h-5 text-blue-400 mb-3 opacity-70" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Total Scans</p>
                  <p className="text-2xl font-black text-white">{isLoaded ? totalScans : '--'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-[#030B1C]/80 p-4 flex flex-col justify-between min-h-[120px]">
                <AlertTriangle className="w-5 h-5 text-red-400 mb-3 opacity-70" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Threats Blocked</p>
                  <p className="text-2xl font-black text-red-400">{isLoaded ? highRisk : '--'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-[#030B1C]/80 p-4 flex flex-col justify-between min-h-[120px]">
                <ShieldCheck className="w-5 h-5 text-blue-400 mb-3 opacity-70" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Low Risk</p>
                  <p className="text-2xl font-black text-blue-400">{isLoaded ? lowRisk : '--'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#1e3a8a]/30 bg-[#030B1C]/80 p-4 flex flex-col justify-between min-h-[120px]">
                <Clock className="w-5 h-5 text-[#00D4FF] mb-3 opacity-70" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Last Analysis</p>
                  <p className="text-[11px] font-bold text-white truncate" title={lastScanTime}>{isLoaded ? lastScanTime : '--'}</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
