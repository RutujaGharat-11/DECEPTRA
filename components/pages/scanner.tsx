'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Eye,
  Link2Off,
  Landmark,
  Siren,
  Wallet,
  ShieldAlert,
  Info,
  BadgeAlert,
  ShieldCheck,
  Ban,
} from 'lucide-react';

type AnalysisResult = {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_color?: 'blue' | 'yellow' | 'red';
  confidence_score: number;
  signals: string[];
  explanation: string;
  urgency_level?: number;
  authority_claim?: number;
  emotional_pressure?: number;
  financial_request?: number;
};

export function Scanner() {
  const [message, setMessage] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!message.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnalysis({
          risk_level: 'MEDIUM',
          confidence_score: 0,
          signals: [],
          explanation: data?.error || data?.details || 'Analysis is temporarily unavailable.',
        });
        setAnalyzed(true);
        return;
      }

      setAnalysis(data as AnalysisResult);
      setAnalyzed(true);
    } catch {
      setAnalysis({
        risk_level: 'MEDIUM',
        confidence_score: 0,
        signals: [],
        explanation: 'Unable to reach analysis service. Please ensure the Flask backend is running.',
      });
      setAnalyzed(true);
    }
  };

  const riskLevel = analysis?.risk_level || 'MEDIUM';
  const confidenceScore = Math.max(0, Math.min(100, analysis?.confidence_score ?? 0));
  const detectedSignals = analysis?.signals ?? [];

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
    'Authority Impersonation': {
      wrapper: 'bg-blue-500/12 border-blue-400/40',
      icon: 'text-blue-300',
      Icon: Landmark,
    },
    'Financial Request': {
      wrapper: 'bg-red-500/12 border-red-400/40',
      icon: 'text-red-300',
      Icon: Wallet,
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

  const urgencyValue = clamp(analysis?.urgency_level);
  const authorityValue = clamp(analysis?.authority_claim);
  const emotionalValue = clamp(analysis?.emotional_pressure);
  const financialValue = clamp(analysis?.financial_request);

  const explanation = analysis?.explanation ?? '';

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

  if (!analyzed) {
    return (
      <div className="max-w-2xl mx-auto pb-24">
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Analyze Suspicious Message</h2>
          </div>

          {/* Text Area */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste message text here... e.g., 'URGENT: Your account has been compromised. Verify your identity or your funds will be frozen within 2 hours.'"
            className="w-full min-h-32 bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            className="w-full bg-primary hover:bg-blue-600 text-foreground font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            Analyze Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* Results Title */}
      <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Analysis Results</h2>

      {/* Overall Risk Level */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Overall Risk Level</span>
          <span
            className={`px-3 py-1 rounded-md border font-bold text-sm ${riskStyles[riskLevel].badge}`}
          >
            {riskLevel} RISK
          </span>
        </div>
        <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
          <div className={`${riskStyles[riskLevel].bar} h-2 rounded-full`} style={{ width: `${confidenceScore}%` }}></div>
        </div>
        <p className="text-muted-foreground text-xs">
          Confidence Score: {confidenceScore}% AI Verification
        </p>
      </div>

      {/* Detected Signals */}
      <div className="flex flex-wrap gap-2">
        {detectedSignals.map((signal) => {
          const style = signalStyles[signal] || defaultSignalStyle;
          const Icon = style.Icon;

          return (
            <div
              key={signal}
              className={`border px-4 py-2 rounded-full flex items-center gap-2 ${style.wrapper}`}
            >
              <Icon className={`w-4 h-4 ${style.icon}`} />
              <span className="text-foreground text-sm font-medium">{signal}</span>
            </div>
          );
        })}
      </div>

      {/* AI Interpretation */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-foreground">AI Interpretation</h3>
        </div>
        <p className="text-foreground/90 text-[1.02rem] leading-8">
          {renderHighlightedExplanation(explanation)}
        </p>
      </div>

      {/* Manipulation Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <span className="text-muted-foreground text-xs font-bold uppercase">Urgency Level</span>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${urgencyValue}%` }}></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <span className="text-muted-foreground text-xs font-bold uppercase">Authority Claim</span>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${authorityValue}%` }}></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <span className="text-muted-foreground text-xs font-bold uppercase">Emotional Pressure</span>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${emotionalValue}%` }}></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <span className="text-muted-foreground text-xs font-bold uppercase">Financial Request</span>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${financialValue}%` }}></div>
          </div>
        </div>
      </div>

      {/* Safety Actions */}
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

      {/* Analyze Another Button */}
      <button
        onClick={() => {
          setMessage('');
          setAnalysis(null);
          setAnalyzed(false);
        }}
        className="w-full border border-primary text-primary hover:bg-primary/10 font-semibold py-3 rounded-lg transition"
      >
        Analyze Another Message
      </button>
    </div>
  );
}
