'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface HistoryItem {
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
    if (Number.isNaN(then)) {
      return timestamp;
    }
    const diff = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const preview = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.length <= 110) return cleaned;
    return `${cleaned.slice(0, 110)}...`;
  };

  const getDetectionType = (item: HistoryItem) => {
    const signals = (item.signals || []).map((signal) => signal.toLowerCase());
    const explanation = (item.explanation || '').toLowerCase();

    if (signals.some((signal) => signal.includes('phishing'))) return 'Phishing detected';
    if (signals.some((signal) => signal.includes('financial'))) return 'Financial scam pattern';
    if (signals.some((signal) => signal.includes('authority'))) return 'Unknown sender';
    if (signals.some((signal) => signal.includes('link')) || explanation.includes('link')) return 'Malicious link';
    if (item.risk_level === 'LOW') return 'Likely safe';
    return 'Suspicious behavior';
  };

  const filteredHistory = useMemo(() => history.filter((item) => {
    const matchesSearch = item.message_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRisk === 'all' || item.risk_level.toLowerCase() === filterRisk;
    return matchesSearch && matchesFilter;
  }), [history, searchTerm, filterRisk]);

  const getRiskUi = (riskLevel: string) => {
    const styles = {
      high: {
        badge: 'bg-danger/15 text-danger border-danger/40',
        label: 'HIGH RISK',
        icon: <AlertTriangle className="w-4 h-4 text-danger" />,
        accent: 'bg-[#ef4444]',
      },
      medium: {
        badge: 'bg-warning/15 text-warning border-warning/40',
        label: 'MEDIUM RISK',
        icon: <AlertCircle className="w-4 h-4 text-warning" />,
        accent: 'bg-[#f59e0b]',
      },
      low: {
        badge: 'bg-success/15 text-success border-success/40',
        label: 'LOW RISK',
        icon: <CheckCircle2 className="w-4 h-4 text-success" />,
        accent: 'bg-[#10b981]',
      },
    };

    return styles[riskLevel as keyof typeof styles] || styles.high;
  };

  const handleClearHistory = async () => {
    if (!history.length || clearing) {
      return;
    }

    const confirmed = window.confirm('Clear all analysis history? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    setClearing(true);
    try {
      const res = await fetch(apiUrl('/api/history'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.replace('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to clear history');
      }

      setHistory([]);
      setSearchTerm('');
      setFilterRisk('all');
    } catch {
      window.alert('Unable to clear history right now. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Scan History</h2>
        <button
          onClick={handleClearHistory}
          disabled={loading || clearing || history.length === 0}
          className="px-3 py-2 rounded-lg border border-danger/40 text-danger text-sm font-medium hover:bg-danger/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? 'Clearing...' : 'Clear History'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_auto] gap-3 items-center">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search message content"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card/90 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', 'High Risk', 'Medium Risk', 'Low Risk'].map((label, idx) => (
            <button
              key={idx}
              onClick={() => setFilterRisk(['all', 'high', 'medium', 'low'][idx])}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium border transition ${
                filterRisk === ['all', 'high', 'medium', 'low'][idx]
                  ? 'bg-primary text-foreground border-primary/70'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-muted-foreground text-sm">
        {loading ? 'Loading scans...' : `Showing ${filteredHistory.length} results`}
      </p>

      {/* History List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
        {!loading && filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <div key={item.id} className="relative bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 hover:border-primary/30 transition overflow-hidden h-full">
              <div className={`absolute left-0 top-0 h-full w-1.5 ${getRiskUi(item.risk_level.toLowerCase()).accent}`}></div>
              <div className="flex items-start justify-between gap-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getRiskUi(item.risk_level.toLowerCase()).badge}`}>
                  {getRiskUi(item.risk_level.toLowerCase()).icon}
                  <span>{getRiskUi(item.risk_level.toLowerCase()).label}</span>
                </div>
                <span className="text-muted-foreground text-xs whitespace-nowrap">{timeAgo(item.timestamp)}</span>
              </div>

              <p className="text-foreground text-sm leading-relaxed">{preview(item.message_text)}</p>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {getDetectionType(item)}
                </span>
                <Link href={`/report/${item.id}`} className="text-primary hover:text-blue-600 text-sm font-semibold flex items-center gap-1 transition whitespace-nowrap">
                  View Report <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="pt-1 text-[11px] text-muted-foreground/90 border-t border-border/60 mt-auto">
                Report ID: #{item.id}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card border border-border rounded-xl p-12 text-center lg:col-span-2 xl:col-span-3">
            <p className="text-muted-foreground">{loading ? 'Loading scans...' : 'No scans found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
