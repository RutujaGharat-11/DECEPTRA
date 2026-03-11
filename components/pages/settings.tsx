'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, ChevronDown, LogOut } from 'lucide-react';

export function Settings() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [educationalTips, setEducationalTips] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [autoArchive, setAutoArchive] = useState('30days');
  const [settingsReady, setSettingsReady] = useState(false);

  const archiveToDays = (value: string) => {
    if (value === '7days') return 7;
    if (value === '30days') return 30;
    if (value === '90days') return 90;
    return 0;
  };

  const daysToArchive = (value: number) => {
    if (value === 7) return '7days';
    if (value === 30) return '30days';
    if (value === 90) return '90days';
    return 'never';
  };

  const persistSettings = async (partial: {
    critical_alerts?: boolean;
    weekly_summary?: boolean;
    risk_threshold?: number;
    educational_tips?: boolean;
    auto_archive_days?: number;
  }) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const payload = {
      critical_alerts: criticalAlerts,
      weekly_summary: weeklySummary,
      risk_threshold: riskThreshold,
      educational_tips: educationalTips,
      auto_archive_days: archiveToDays(autoArchive),
      ...partial,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.replace('/login');
      }
    } catch {
      // Best-effort save; UI state remains local if request fails.
    }
  };

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

    fetch('http://127.0.0.1:5000/api/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error('Unauthorized');
        }
        if (!res.ok) {
          throw new Error('Failed to load settings');
        }
        return (await res.json()) as {
          critical_alerts: boolean;
          weekly_summary: boolean;
          risk_threshold: number;
          educational_tips: boolean;
          auto_archive_days: number;
        };
      })
      .then((settings) => {
        setCriticalAlerts(Boolean(settings.critical_alerts));
        setWeeklySummary(Boolean(settings.weekly_summary));
        setRiskThreshold(Number(settings.risk_threshold ?? 75));
        setEducationalTips(Boolean(settings.educational_tips));
        setAutoArchive(daysToArchive(Number(settings.auto_archive_days ?? 30)));
      })
      .catch(() => {
        // Keep defaults if loading fails.
      })
      .finally(() => setSettingsReady(true));

    fetch('http://127.0.0.1:5000/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
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
  }, [router]);

  const initials = (profileName || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleSignOut = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch('http://127.0.0.1:5000/auth/logout', {
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

  const updateCriticalAlerts = (value: boolean) => {
    setCriticalAlerts(value);
    if (settingsReady) {
      void persistSettings({ critical_alerts: value });
    }
  };

  const updateWeeklySummary = (value: boolean) => {
    setWeeklySummary(value);
    if (settingsReady) {
      void persistSettings({ weekly_summary: value });
    }
  };

  const updateEducationalTips = (value: boolean) => {
    setEducationalTips(value);
    if (settingsReady) {
      void persistSettings({ educational_tips: value });
    }
  };

  const updateAutoArchive = (value: string) => {
    setAutoArchive(value);
    if (settingsReady) {
      void persistSettings({ auto_archive_days: archiveToDays(value) });
    }
  };

  const commitRiskThreshold = () => {
    if (settingsReady) {
      void persistSettings({ risk_threshold: riskThreshold });
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-foreground transition ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* Account Section */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Account Information</h2>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-foreground font-bold text-xl">{initials || 'U'}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">{profileName || 'User'}</p>
            <p className="text-muted-foreground text-sm">{profileEmail || 'user@example.com'}</p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Notification Preferences</h2>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Critical Alerts</p>
              <p className="text-muted-foreground text-sm">Immediate push for high-risk detection</p>
            </div>
            <Toggle checked={criticalAlerts} onChange={updateCriticalAlerts} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Weekly Risk Summary</p>
              <p className="text-muted-foreground text-sm">Email digest of scanner activity</p>
            </div>
            <Toggle checked={weeklySummary} onChange={updateWeeklySummary} />
          </div>
        </div>
      </div>

      {/* Risk Threshold */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Default Risk Threshold</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground font-semibold">{riskThreshold}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(Number(e.target.value))}
            onMouseUp={commitRiskThreshold}
            onTouchEnd={commitRiskThreshold}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>Balanced</span>
            <span>Max Secure</span>
          </div>
          <p className="text-muted-foreground text-xs bg-primary/10 border border-primary/20 rounded p-3 flex gap-2">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Higher thresholds reduce false positives but might miss subtle threats.</span>
          </p>
        </div>
      </div>

      {/* Scanner Experience */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Scanner Experience</h2>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Educational Tips</p>
              <p className="text-muted-foreground text-sm">Explainers during deep scan process</p>
            </div>
            <Toggle checked={educationalTips} onChange={updateEducationalTips} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Auto-Archive Scans</p>
            </div>
            <div className="relative">
              <select
                value={autoArchive}
                onChange={(e) => updateAutoArchive(e.target.value)}
                className="appearance-none bg-card border border-border rounded px-3 py-2 pr-8 text-foreground text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="7days">After 7 days</option>
                <option value="30days">After 30 days</option>
                <option value="90days">After 90 days</option>
                <option value="never">Never</option>
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full border border-danger/30 text-danger hover:bg-danger/10 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* Version Footer */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-muted-foreground text-xs">NEUROSHIELD AI V2.4.0</p>
      </div>
    </div>
  );
}
