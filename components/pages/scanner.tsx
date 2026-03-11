'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Eye,
  House,
  Link2Off,
  Landmark,
  Loader2,
  Mail,
  MessageCircle,
  Smartphone,
  Siren,
  Sparkles,
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

type HistoryItem = {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
};

const SCAN_STEPS = [
  'Scanning message...',
  'Detecting manipulation patterns...',
  'Analyzing risk level...',
] as const;

const EXAMPLE_SCANS = [
  {
    label: 'Phishing email',
    text: 'Urgent: Your email account will be suspended in 30 minutes. Confirm your login immediately at secure-verification-center.com.',
  },
  {
    label: 'Fake job offer',
    text: 'Congratulations! You were selected for a remote role. Pay a small onboarding fee today to secure your placement.',
  },
  {
    label: 'Bank account alert',
    text: 'Security alert: unusual activity detected on your bank account. Verify your identity now using the link provided.',
  },
  {
    label: 'Package delivery scam',
    text: 'Your package is on hold due to unpaid customs fee. Complete payment now to avoid return to sender.',
  },
] as const;

export function Scanner() {
  const [message, setMessage] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [systemInsights, setSystemInsights] = useState({
    analyzedToday: 0,
    highRiskDetections: 0,
    mediumRiskDetections: 0,
  });

  useEffect(() => {
    if (!isAnalyzing) {
      setScanStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setScanStepIndex((previous) => Math.min(previous + 1, SCAN_STEPS.length - 1));
    }, 950);

    return () => window.clearInterval(interval);
  }, [isAnalyzing]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return;
    }

    fetch(apiUrl('/api/history'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          return [] as HistoryItem[];
        }
        return (await response.json()) as HistoryItem[];
      })
      .then((items) => {
        const history = Array.isArray(items) ? items : [];
        const todayKey = new Date().toISOString().slice(0, 10);

        const analyzedToday = history.filter((item) => {
          const parsed = new Date(item.timestamp);
          if (Number.isNaN(parsed.getTime())) {
            return false;
          }
          return parsed.toISOString().slice(0, 10) === todayKey;
        }).length;

        const highRiskDetections = history.filter((item) => item.risk_level === 'HIGH').length;
        const mediumRiskDetections = history.filter((item) => item.risk_level === 'MEDIUM').length;

        setSystemInsights({
          analyzedToday,
          highRiskDetections,
          mediumRiskDetections,
        });
      })
      .catch(() => {
        setSystemInsights({
          analyzedToday: 0,
          highRiskDetections: 0,
          mediumRiskDetections: 0,
        });
      });
  }, []);

  const handleAnalyze = async () => {
    if (!message.trim() || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setScanStepIndex(0);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(apiUrl('/analyze'), {
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
    } finally {
      setIsAnalyzing(false);
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

  const getScamType = () => {
    const normalizedSignals = detectedSignals.map((signal) => signal.toLowerCase());
    const normalizedExplanation = explanation.toLowerCase();

    if (normalizedSignals.some((signal) => signal.includes('financial'))) return 'Financial Scam Pattern';
    if (normalizedSignals.some((signal) => signal.includes('authority'))) return 'Authority Impersonation';
    if (normalizedSignals.some((signal) => signal.includes('account'))) return 'Account Security Scam';
    if (normalizedSignals.some((signal) => signal.includes('urgency'))) return 'Urgency-Based Manipulation';
    if (normalizedExplanation.includes('phishing')) return 'Likely Phishing Attempt';

    return 'Social Engineering Pattern';
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

  if (!analyzed) {
    return (
      <div className="w-full max-w-6xl mx-auto pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start">
          <div className="space-y-4 lg:col-span-3">
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
              className="w-full min-h-32 lg:min-h-44 bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!message.trim() || isAnalyzing}
              className="w-full bg-primary hover:bg-blue-600 text-foreground font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {SCAN_STEPS[scanStepIndex]}
                </>
              ) : (
                'Analyze Message'
              )}
            </button>

            {/* AI Scanning Feedback */}
            {isAnalyzing ? (
              <div className="bg-card/80 border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{SCAN_STEPS[scanStepIndex]}</p>
                <div className="flex items-center gap-1.5">
                  {SCAN_STEPS.map((step, index) => (
                    <span
                      key={step}
                      className={`h-1.5 w-1.5 rounded-full ${index <= scanStepIndex ? 'bg-primary' : 'bg-slate-600'}`}
                    ></span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Example Messages */}
            <div className="bg-card/90 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Try Example Scans</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_SCANS.map((example) => (
                  <button
                    key={example.label}
                    onClick={() => setMessage(example.text)}
                    className="text-left px-3 py-2 rounded-lg border border-border bg-background/40 hover:bg-primary/10 hover:border-primary/40 transition"
                  >
                    <p className="text-sm text-foreground font-medium">{example.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {/* Threat Awareness Section */}
            <div className="bg-card/90 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-semibold text-foreground">Common Scam Indicators</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Urgent payment requests',
                  'Messages impersonating banks or authorities',
                  'Suspicious login links',
                  'Requests for personal information',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supported Message Types */}
            <div className="bg-card/90 border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Supported Message Types</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Email', Icon: Mail },
                  { label: 'SMS', Icon: Smartphone },
                  { label: 'WhatsApp', Icon: MessageCircle },
                  { label: 'Job Offers', Icon: Briefcase },
                  { label: 'Rental Listings', Icon: House },
                ].map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-background/40 text-xs text-muted-foreground"
                  >
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Insights Card */}
            <div className="bg-card/90 border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">System Insights</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                <div className="rounded-lg border border-border px-3 py-2 bg-background/40">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Messages analyzed today</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{systemInsights.analyzedToday}</p>
                </div>
                <div className="rounded-lg border border-red-400/30 px-3 py-2 bg-red-500/10">
                  <p className="text-[11px] uppercase tracking-wide text-red-200">High risk detections</p>
                  <p className="text-lg font-semibold text-red-300 mt-1">{systemInsights.highRiskDetections}</p>
                </div>
                <div className="rounded-lg border border-amber-400/30 px-3 py-2 bg-amber-500/10">
                  <p className="text-[11px] uppercase tracking-wide text-amber-200">Medium risk detections</p>
                  <p className="text-lg font-semibold text-amber-300 mt-1">{systemInsights.mediumRiskDetections}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 space-y-5 lg:space-y-6">
      {/* Results Title */}
      <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Analysis Results</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Row 1: Overall Risk Level */}
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

        {/* Row 1: Scam Type */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <span className="text-muted-foreground text-sm">Likely Scam Type</span>
          <p className="text-foreground text-xl font-semibold">{getScamType()}</p>
          <p className="text-muted-foreground text-sm leading-6">
            Classified from manipulation signals and language patterns in the analyzed message.
          </p>
        </div>
      </div>

      {/* Row 2: Signals + AI Interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-foreground">Manipulation Signals</h3>
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
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-foreground">AI Interpretation</h3>
          </div>
          <p className="text-foreground/90 text-[1.02rem] leading-8">
            {renderHighlightedExplanation(explanation)}
          </p>
        </div>
      </div>

      {/* Row 3: Indicator Bars */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
        <h3 className="font-bold text-foreground">Indicator Bars</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-background/30 border border-border rounded-xl p-3 space-y-2">
            <span className="text-muted-foreground text-xs font-bold uppercase">Urgency Level</span>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${urgencyValue}%` }}></div>
            </div>
          </div>
          <div className="bg-background/30 border border-border rounded-xl p-3 space-y-2">
            <span className="text-muted-foreground text-xs font-bold uppercase">Authority Claim</span>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${authorityValue}%` }}></div>
            </div>
          </div>
          <div className="bg-background/30 border border-border rounded-xl p-3 space-y-2">
            <span className="text-muted-foreground text-xs font-bold uppercase">Emotional Pressure</span>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${emotionalValue}%` }}></div>
            </div>
          </div>
          <div className="bg-background/30 border border-border rounded-xl p-3 space-y-2">
            <span className="text-muted-foreground text-xs font-bold uppercase">Financial Request</span>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${financialValue}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Safety Actions */}
      <div className="bg-red-950/30 border border-red-500/25 rounded-xl p-4 sm:p-5 space-y-4">
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
