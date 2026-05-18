'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Activity,
  Fingerprint,
  User,
  Link2,
  Trash2,
  Globe,
  QrCode,
  ShieldAlert,
  Search as SearchIcon
} from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface HistoryItem {
  id: number;
  message_text?: string;
  text?: string;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  risk?: 'Low' | 'Medium' | 'High';
  risk_color?: 'blue' | 'yellow' | 'red';
  confidence_score?: number;
  confidence?: number;
  signals?: string[];
  indicators?: string[];
  explanation?: string;
  urgency_level?: number;
  authority_claim?: number;
  emotional_pressure?: number;
  financial_request?: number;
  timestamp: string;

  // New fields
  document_category?: string;
  message_type?: string;
  platform?: string;
  sender?: string;
  is_suspicious_sender?: boolean;
  extracted_text?: string;
  risk_flags?: string[];
  suspicious_domains?: { domain: string; impersonating: string }[];
  detected_qr_data?: string[];
  why_detected?: string[];
}

function ConfidenceCircle({ score, color }: { score: number; color: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 5px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-lg font-black text-white">{Math.round(score)}%</span>
        <span className="text-[6px] uppercase tracking-widest text-white/40 leading-none">AI Confidence</span>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  const tagColors: Record<string, string> = {
    'Urgency': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    'Phishing Link': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    'Credential Harvesting': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    'Social Engineering': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    'Financial Request': 'bg-red-500/10 border-red-500/30 text-red-400',
    'Low Urgency': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const matchedClass = Object.entries(tagColors).find(([key]) => label.toLowerCase().includes(key.toLowerCase()))?.[1]
    || 'bg-white/5 border-white/10 text-white/50';

  return (
    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${matchedClass}`}>
      {label}
    </span>
  );
}

export function History() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch(apiUrl('/api/history'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          router.replace('/login');
          return [] as HistoryItem[];
        }
        return (await res.json()) as HistoryItem[];
      })
      .then((items) => setHistory(Array.isArray(items) ? items : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [router]);

  const timeAgo = (timestamp: string) => {
    const then = new Date(timestamp).getTime();
    if (Number.isNaN(then)) return timestamp;
    const diff = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const preview = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.length <= 95) return cleaned;
    return `${cleaned.slice(0, 95)}...`;
  };

  const getDetectionType = (item: HistoryItem) => {
    const signals = (item.indicators || item.signals || []).map((signal) => signal.toLowerCase());
    const riskFlags = (item.risk_flags || []).map(f => f.toLowerCase());
    const explanation = (item.explanation || '').toLowerCase();

    if (signals.some((s) => s.includes('qr')) || (item.detected_qr_data && item.detected_qr_data.length > 0)) return { label: 'QR Threat Detected', icon: QrCode };
    if (signals.some((s) => s.includes('domain')) || (item.suspicious_domains && item.suspicious_domains.length > 0)) return { label: 'Domain Impersonation', icon: Globe };
    if (signals.some((s) => s.includes('phishing'))) return { label: 'Phishing detected', icon: Link2 };
    if (signals.some((s) => s.includes('financial')) || riskFlags.includes('financial risk')) return { label: 'Financial Scam', icon: Activity };
    if (signals.some((s) => s.includes('authority'))) return { label: 'Unknown sender', icon: User };
    if (signals.some((s) => s.includes('link')) || explanation.includes('link')) return { label: 'Malicious link', icon: Link2 };
    return { label: 'Suspicious behavior', icon: Fingerprint };
  };

  const filteredHistory = useMemo(() => history.filter((item) => {
    const textToSearch = item.text || item.message_text || '';
    const itemRisk = (item.risk || item.risk_level || 'medium').toLowerCase();
    const matchesSearch = textToSearch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRisk === 'all' || itemRisk === filterRisk;
    return matchesSearch && matchesFilter;
  }), [history, searchTerm, filterRisk]);

  const riskStyles = {
    high: {
      badge: 'bg-red-500/10 text-red-500 border-red-500/30',
      label: 'HIGH RISK',
      icon: <AlertTriangle className="w-3 h-3" />,
      color: '#ef4444',
      border: 'border-red-500/40',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
    },
    medium: {
      badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      label: 'MEDIUM RISK',
      icon: <AlertCircle className="w-3 h-3" />,
      color: '#f59e0b',
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]'
    },
    low: {
      badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      label: 'LOW RISK',
      icon: <CheckCircle2 className="w-3 h-3" />,
      color: '#10b981',
      border: 'border-emerald-500/40',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
    },
  };

  const handleClearHistory = async () => {
    if (!history.length || clearing) return;
    if (!window.confirm('Clear all analysis history? This action cannot be undone.')) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setClearing(true);
    try {
      const res = await fetch(apiUrl('/api/history'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        router.replace('/login');
        return;
      }
      setHistory([]);
      setSearchTerm('');
    } catch {
      window.alert('Unable to clear history.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 pb-32 space-y-8 animate-in fade-in duration-500">

      {/* Header Area */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Scan History</h1>
        <button
          onClick={handleClearHistory}
          disabled={loading || clearing || history.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? 'Clearing...' : 'Clear History'}
        </button>
      </div>

      {/* Toolbar Area */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#00D4FF] transition-colors" />
          <input
            type="text"
            placeholder="Search message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#030B1C]/80 border border-[#1e3a8a]/30 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF] transition-all shadow-inner"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All', 'High Risk', 'Medium Risk', 'Low Risk'].map((label, idx) => {
            const key = ['all', 'high', 'medium', 'low'][idx];
            const isActive = filterRisk === key;
            return (
              <button
                key={idx}
                onClick={() => setFilterRisk(key)}
                className={`px-6 py-2 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-widest border transition-all ${isActive
                    ? 'bg-[#00D4FF] text-[#020813] border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                    : 'bg-[#030B1C] border-[#1e3a8a]/30 text-white/40 hover:text-white hover:border-[#1e3a8a]'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
        {loading ? 'Decrypting scans...' : `Showing ${filteredHistory.length} identified payloads`}
      </p>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!loading && filteredHistory.length > 0 ? (
          filteredHistory.map((item) => {
            const risk = (item.risk || item.risk_level || 'medium').toLowerCase() as keyof typeof riskStyles;
            const style = riskStyles[risk] || riskStyles.medium;
            const det = getDetectionType(item);
            const DetIcon = det.icon;
            const score = item.confidence ?? item.confidence_score ?? 0;
            const tags = Array.from(new Set([...(item.signals || []), ...(item.indicators || [])])).slice(0, 3);

            return (
              <div
                key={item.id}
                className={`relative bg-[#06142e]/60 border-l-[3px] ${style.border} ${style.glow} rounded-xl p-5 hover:bg-[#06142e]/80 transition-all duration-300 group overflow-hidden`}
              >
                <div className="grid grid-cols-[1fr_100px] gap-4">
                  {/* Left Content */}
                  <div className="flex flex-col gap-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black tracking-[0.15em] border ${style.badge}`}>
                      {style.icon}
                      <span>{style.label}</span>
                    </div>

                    <p className="text-white/90 text-sm font-medium leading-relaxed min-h-[40px]">
                      {preview(item.text || item.extracted_text || item.message_text || '')}
                    </p>

                    <div className="flex items-center gap-2 text-white/40">
                      <DetIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">{det.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.platform && item.platform !== 'unknown' && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF]">
                          {item.platform}
                        </span>
                      )}
                      {item.is_suspicious_sender && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                          Suspicious Sender
                        </span>
                      )}
                      {item.document_category && item.document_category !== 'unknown' && (
                        <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-400">
                          {item.document_category.replace('_', ' ')}
                        </span>
                      )}
                      {tags.map((tag, i) => <Tag key={i} label={tag} />)}
                      {((item.signals?.length || 0) + (item.indicators?.length || 0)) > 3 && (
                        <span className="text-[8px] font-bold text-white/30 px-2 py-0.5">+{(item.signals?.length || 0) + (item.indicators?.length || 0) - 3}</span>
                      )}
                    </div>

                    <div className="text-[9px] font-mono text-white/20 mt-1">
                      REPORT ID: #{item.id}
                    </div>
                  </div>

                  {/* Right Content */}
                  <div className="flex flex-col items-center justify-between py-1">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest self-end">
                      {timeAgo(item.timestamp)}
                    </span>

                    <ConfidenceCircle score={score} color={style.color} />

                    <Link
                      href={`/report/${item.id}`}
                      className="group/link flex items-center gap-2 text-[#00D4FF] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all self-end"
                    >
                      View Report
                      <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#030B1C]/50 border border-[#1e3a8a]/20 rounded-2xl p-16 text-center col-span-full">
            <div className="inline-flex p-4 rounded-full bg-[#1e3a8a]/10 mb-4">
              <Activity className="w-8 h-8 text-[#00D4FF] opacity-20" />
            </div>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">{loading ? 'Synchronizing with Neural Net...' : 'Archive Empty'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
