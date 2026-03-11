'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, BadgeAlert, Ban, Info, Landmark, Link2Off, ShieldAlert, ShieldCheck, Siren, Wallet } from 'lucide-react';
import { apiUrl } from '@/lib/api';

type ReportData = {
  id: number;
  message_text: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_color: 'blue' | 'yellow' | 'red';
  confidence_score: number;
  signals: string[];
  explanation: string;
  urgency_level: number;
  authority_claim: number;
  emotional_pressure: number;
  financial_request: number;
  timestamp: string;
};

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch(apiUrl(`/api/history/${params.id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          router.replace('/login');
          return null;
        }
        if (!res.ok) {
          throw new Error('Failed to load report');
        }
        return (await res.json()) as ReportData;
      })
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const clamp = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

  const riskStyles = {
    LOW: {
      badge: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
      bar: 'bg-blue-500',
    },
    MEDIUM: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      bar: 'bg-amber-500',
    },
    HIGH: {
      badge: 'bg-red-500/20 text-red-300 border-red-400/40',
      bar: 'bg-red-500',
    },
  } as const;

  const signalStyles: Record<string, { wrapper: string; icon: string; Icon: typeof AlertCircle }> = {
    'Urgency Pressure': {
      wrapper: 'bg-amber-500/12 border-amber-400/40',
      icon: 'text-amber-300',
      Icon: Siren,
    },
    'Financial Request': {
      wrapper: 'bg-red-500/12 border-red-400/40',
      icon: 'text-red-300',
      Icon: Wallet,
    },
    'Authority Impersonation': {
      wrapper: 'bg-blue-500/12 border-blue-400/40',
      icon: 'text-blue-300',
      Icon: Landmark,
    },
    'Account Security Threats': {
      wrapper: 'bg-violet-500/12 border-violet-400/40',
      icon: 'text-violet-300',
      Icon: ShieldAlert,
    },
  };

  const defaultSignalStyle = {
    wrapper: 'bg-muted border-border',
    icon: 'text-muted-foreground',
    Icon: AlertCircle,
  };

  const renderHighlightedExplanation = (text: string) => {
    if (!text) {
      return <span className="text-muted-foreground">No explanation provided by analysis service.</span>;
    }

    return text
      .split(/(urgency tactics|authority impersonation|financial request)/gi)
      .map((part, index) => {
        const normalized = part.toLowerCase();
        if (normalized === 'urgency tactics') {
          return (
            <span key={`${part}-${index}`} className="text-warning font-semibold">
              {part}
            </span>
          );
        }
        if (normalized === 'authority impersonation') {
          return (
            <span key={`${part}-${index}`} className="text-primary font-semibold">
              {part}
            </span>
          );
        }
        if (normalized === 'financial request') {
          return (
            <span key={`${part}-${index}`} className="text-danger font-semibold">
              {part}
            </span>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      });
  };

  const Meter = ({ label, value, barClass }: { label: string; value: number; barClass: string }) => (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <span className="text-muted-foreground text-xs font-bold uppercase">{label}</span>
      <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
        <div className={`${barClass} h-2 rounded-full`} style={{ width: `${clamp(value)}%` }}></div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="max-w-2xl mx-auto pb-24 text-muted-foreground">Loading report...</div>;
  }

  if (!report) {
    return <div className="max-w-2xl mx-auto pb-24 text-muted-foreground">Report not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Analysis Results</h2>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Overall Risk Level</span>
          <span className={`px-3 py-1 rounded-md border text-sm font-bold uppercase ${riskStyles[report.risk_level].badge}`}>
            {report.risk_level} Risk
          </span>
        </div>
        <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
          <div className={`${riskStyles[report.risk_level].bar} h-2 rounded-full`} style={{ width: `${clamp(report.confidence_score)}%` }}></div>
        </div>
        <p className="text-muted-foreground text-xs">Confidence Score: {clamp(report.confidence_score)}% AI Verification</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {report.signals.map((signal) => {
          const style = signalStyles[signal] || defaultSignalStyle;
          const Icon = style.Icon;

          return (
            <div key={signal} className={`border px-4 py-2 rounded-full flex items-center gap-2 ${style.wrapper}`}>
              <Icon className={`w-4 h-4 ${style.icon}`} />
              <span className="text-foreground text-sm font-medium">{signal}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-foreground">AI Interpretation</h3>
        </div>
        <p className="text-foreground/90 text-[1.02rem] leading-8">{renderHighlightedExplanation(report.explanation)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Meter label="Urgency Level" value={report.urgency_level} barClass="bg-amber-500" />
        <Meter label="Authority Claim" value={report.authority_claim} barClass="bg-blue-500" />
        <Meter label="Emotional Pressure" value={report.emotional_pressure} barClass="bg-violet-500" />
        <Meter label="Financial Request" value={report.financial_request} barClass="bg-red-500" />
      </div>

      <div className="bg-red-950/30 border border-red-500/25 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <BadgeAlert className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-foreground">Safety Actions</h3>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Do not send money</p>
              <p className="text-muted-foreground text-sm">or provide bank details under any circumstances.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Verify sender</p>
              <p className="text-muted-foreground text-sm">through an official app or website directly.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link2Off className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Avoid links</p>
              <p className="text-muted-foreground text-sm">or attachments contained in the message.</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/settings')}
        className="w-full border border-primary text-primary hover:bg-primary/10 font-semibold py-3 rounded-lg transition"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
