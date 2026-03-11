'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

type ReportsTab = 'overview' | 'history' | 'anomalies';

type OverviewData = {
  total_scanned: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  avg_confidence: number;
  distribution: { high: number; medium: number; low: number };
  weekly: Array<{ day: string; count: number }>;
};

type HistoryItem = {
  id: number;
  message_text: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
  source_type?: string;
};

type AnomalyItem = {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
};

interface ReportsProps {
  initialTab?: ReportsTab;
}

export function Reports({ initialTab = 'overview' }: ReportsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReportsTab>(initialTab);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchJson = async (url: string) => {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.replace('/login');
        return null;
      }
      if (!res.ok) {
        throw new Error('Failed to load reports data');
      }
      return await res.json();
    };

    setLoading(true);

    if (activeTab === 'overview') {
      Promise.all([
        fetchJson('http://127.0.0.1:5000/api/reports/overview'),
        fetchJson('http://127.0.0.1:5000/api/reports/history'),
      ])
        .then(([overviewData, historyData]) => {
          if (overviewData) setOverview(overviewData as OverviewData);
          if (historyData) setHistory(Array.isArray(historyData) ? (historyData as HistoryItem[]) : []);
        })
        .catch(() => {
          setOverview({
            total_scanned: 0,
            high_risk_count: 0,
            medium_risk_count: 0,
            low_risk_count: 0,
            avg_confidence: 0,
            distribution: { high: 0, medium: 0, low: 0 },
            weekly: [],
          });
          setHistory([]);
        })
        .finally(() => setLoading(false));
      return;
    }

    const endpointByTab: Record<Exclude<ReportsTab, 'overview'>, string> = {
      history: 'http://127.0.0.1:5000/api/reports/history',
      anomalies: 'http://127.0.0.1:5000/api/reports/anomalies',
    };

    fetchJson(endpointByTab[activeTab as Exclude<ReportsTab, 'overview'>])
      .then((data) => {
        if (!data) return;
        if (activeTab === 'history') setHistory(Array.isArray(data) ? (data as HistoryItem[]) : []);
        if (activeTab === 'anomalies') setAnomalies(Array.isArray(data) ? (data as AnomalyItem[]) : []);
      })
      .catch(() => {
        if (activeTab === 'history') setHistory([]);
        if (activeTab === 'anomalies') setAnomalies([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, router]);

  const riskCategories = useMemo(
    () => [
      {
        name: 'High Risk',
        percentage: overview?.distribution.high ?? 0,
        color: 'bg-[#ef4444]',
        text: 'text-[#ef4444]',
        track: 'bg-[#ef4444]/15',
      },
      {
        name: 'Medium Risk',
        percentage: overview?.distribution.medium ?? 0,
        color: 'bg-[#f59e0b]',
        text: 'text-[#f59e0b]',
        track: 'bg-[#f59e0b]/15',
      },
      {
        name: 'Low Risk',
        percentage: overview?.distribution.low ?? 0,
        color: 'bg-[#10b981]',
        text: 'text-[#10b981]',
        track: 'bg-[#10b981]/15',
      },
    ],
    [overview]
  );

  const getRiskUi = (riskLevel: string) => {
    const styles = {
      high: {
        badge: 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/35',
        icon: <AlertTriangle className="w-4 h-4 text-[#ef4444]" />,
      },
      medium: {
        badge: 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/35',
        icon: <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />,
      },
      low: {
        badge: 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/35',
        icon: <CheckCircle2 className="w-4 h-4 text-[#10b981]" />,
      },
    };
    return styles[riskLevel as keyof typeof styles] || styles.medium;
  };

  const toTimeAgo = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    if (Number.isNaN(t)) return timestamp;
    const seconds = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const preview = (text: string) => (text.length > 110 ? `${text.slice(0, 110)}...` : text);

  const getDetectionType = (item: HistoryItem) => {
    const text = (item.message_text || '').toLowerCase();
    if (text.includes('http://') || text.includes('https://') || text.includes('link')) return 'Malicious link';
    if (text.includes('pay') || text.includes('transfer') || text.includes('fee')) return 'Phishing detected';
    if (item.risk_level === 'LOW') return 'Likely safe';
    return 'Suspicious behavior';
  };

  const weeklyRiskBars = useMemo(() => {
    const now = new Date();
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekdayBuckets = weekdayLabels.map((label) => ({
      key: label,
      label,
      high: 0,
      medium: 0,
      low: 0,
    }));

    const last7DayKeys = new Set(
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(now.getDate() - index);
        return date.toISOString().slice(0, 10);
      })
    );

    const toWeekdayIndex = (date: Date) => {
      const sundayFirst = date.getDay();
      return sundayFirst === 0 ? 6 : sundayFirst - 1;
    };

    for (const item of history) {
      const date = new Date(item.timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toISOString().slice(0, 10);
      if (!last7DayKeys.has(key)) continue;
      const dayIndex = toWeekdayIndex(date);

      if (item.risk_level === 'HIGH') weekdayBuckets[dayIndex].high += 1;
      if (item.risk_level === 'MEDIUM') weekdayBuckets[dayIndex].medium += 1;
      if (item.risk_level === 'LOW') weekdayBuckets[dayIndex].low += 1;
    }

    const maxBarScore = Math.max(
      1,
      ...weekdayBuckets.flatMap((item) => [item.high, item.medium, item.low])
    );

    return {
      maxBarScore,
      points: weekdayBuckets.map((item) => ({
        ...item,
        highHeight: Math.round((item.high / maxBarScore) * 100),
        mediumHeight: Math.round((item.medium / maxBarScore) * 100),
        lowHeight: Math.round((item.low / maxBarScore) * 100),
      })),
    };
  }, [history]);

  const handleClearHistory = async () => {
    if (clearing || !history.length) {
      return;
    }

    const confirmed = window.confirm('Clear all detection history? This action cannot be undone.');
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
      const res = await fetch('http://127.0.0.1:5000/api/history', {
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
    } catch {
      window.alert('Unable to clear history right now. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const tabHref: Record<ReportsTab, string> = {
    overview: '/reports/overview',
    history: '/reports/history',
    anomalies: '/reports/anomalies',
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-4">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border">
        <Link href={tabHref.overview} className={activeTab === 'overview' ? 'text-foreground font-medium pb-3 border-b-2 border-primary' : 'text-muted-foreground pb-3 hover:text-foreground transition'}>Overview</Link>
        <Link href={tabHref.history} className={activeTab === 'history' ? 'text-foreground font-medium pb-3 border-b-2 border-primary' : 'text-muted-foreground pb-3 hover:text-foreground transition'}>Detection History</Link>
        <Link href={tabHref.anomalies} className={activeTab === 'anomalies' ? 'text-foreground font-medium pb-3 border-b-2 border-primary' : 'text-muted-foreground pb-3 hover:text-foreground transition'}>Anomalies</Link>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Total Analyzed Card */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-muted-foreground text-xs font-bold uppercase">Total Analyzed</span>
                <p className="text-3xl font-bold text-foreground mt-1">{overview?.total_scanned ?? 0}</p>
                <p className="text-success text-sm mt-2">Avg confidence {overview?.avg_confidence ?? 0}%</p>
              </div>
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Risk Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-[#ef4444]/35 rounded-lg p-4 space-y-2">
              <span className="text-muted-foreground text-xs font-bold uppercase">High Risk</span>
              <p className="text-2xl font-bold text-[#ef4444]">{overview?.high_risk_count ?? 0}</p>
              <div className="w-full bg-[#ef4444]/15 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#ef4444] h-1.5 rounded-full transition-all duration-700" style={{ width: `${overview?.distribution.high ?? 0}%` }}></div>
              </div>
            </div>
            <div className="bg-card border border-[#f59e0b]/35 rounded-lg p-4 space-y-2">
              <span className="text-muted-foreground text-xs font-bold uppercase">Med Risk</span>
              <p className="text-2xl font-bold text-[#f59e0b]">{overview?.medium_risk_count ?? 0}</p>
              <div className="w-full bg-[#f59e0b]/15 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#f59e0b] h-1.5 rounded-full transition-all duration-700" style={{ width: `${overview?.distribution.medium ?? 0}%` }}></div>
              </div>
            </div>
            <div className="bg-card border border-[#10b981]/35 rounded-lg p-4 space-y-2">
              <span className="text-muted-foreground text-xs font-bold uppercase">Low Risk</span>
              <p className="text-2xl font-bold text-[#10b981]">{overview?.low_risk_count ?? 0}</p>
              <div className="w-full bg-[#10b981]/15 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#10b981] h-1.5 rounded-full transition-all duration-700" style={{ width: `${overview?.distribution.low ?? 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Risk Categorization */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-foreground">Risk Categorization</h3>
            <div className="space-y-4">
              {riskCategories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`${cat.text}`}>{cat.name}</span>
                    <span className={`font-semibold ${cat.text}`}>{cat.percentage}%</span>
                  </div>
                  <div className={`w-full ${cat.track} rounded-full h-2 overflow-hidden`}>
                    <div className={`${cat.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Detections */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Weekly Detections</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-[#ef4444]"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>High</span>
                <span className="inline-flex items-center gap-1 text-[#f59e0b]"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>Medium</span>
                <span className="inline-flex items-center gap-1 text-[#10b981]"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span>Low</span>
              </div>
            </div>
            <div className="h-40 flex items-end justify-around gap-2 sm:gap-3 bg-muted/20 rounded-lg p-3">
              <div className="w-full flex items-end gap-2 h-full">
                <div className="h-full flex flex-col justify-between text-[10px] text-muted-foreground pr-1">
                  <span>{weeklyRiskBars.maxBarScore}</span>
                  <span>{Math.floor(weeklyRiskBars.maxBarScore / 2)}</span>
                  <span>0</span>
                </div>

                <div className="flex-1 grid grid-cols-7 gap-2 h-full items-end">
                  {weeklyRiskBars.points.map((item) => (
                    <div key={item.key} className="flex flex-col items-center justify-end gap-2 h-full">
                      <div className="h-full w-full flex items-end justify-center gap-1">
                        <div
                          className="w-2 sm:w-2.5 bg-[#ef4444] rounded-sm transition-all duration-700"
                          style={{ height: `${item.highHeight}%` }}
                          title={`High: ${item.high}`}
                        ></div>
                        <div
                          className="w-2 sm:w-2.5 bg-[#f59e0b] rounded-sm transition-all duration-700"
                          style={{ height: `${item.mediumHeight}%` }}
                          title={`Medium: ${item.medium}`}
                        ></div>
                        <div
                          className="w-2 sm:w-2.5 bg-[#10b981] rounded-sm transition-all duration-700"
                          style={{ height: `${item.lowHeight}%` }}
                          title={`Low: ${item.low}`}
                        ></div>
                      </div>
                      <span className="text-muted-foreground text-[11px] truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === 'history' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <button
              onClick={handleClearHistory}
              disabled={loading || clearing || history.length === 0}
              className="px-3 py-2 rounded-lg border border-danger/40 text-danger text-sm font-medium hover:bg-danger/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing...' : 'Clear History'}
            </button>
          </div>

          {loading ? (
            <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground">Loading detection history...</div>
          ) : history.length ? (
            history.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${getRiskUi(item.risk_level.toLowerCase()).badge}`}>
                    {getRiskUi(item.risk_level.toLowerCase()).icon}
                    {item.risk_level} Risk
                  </span>
                  <span className="text-muted-foreground text-xs">{toTimeAgo(item.timestamp)}</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{preview(item.message_text)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-[#f59e0b]" />
                    {getDetectionType(item)}
                  </span>
                  <Link href={`/report/${item.id}`} className="text-primary hover:text-blue-600 text-sm font-semibold transition inline-flex items-center gap-1">
                    View Report <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground">No detection history yet.</div>
          )}
        </div>
      ) : null}

      {activeTab === 'anomalies' ? (
        <div className="space-y-3">
          <h3 className="font-bold text-foreground text-lg">Critical Anomalies</h3>
          {loading ? (
            <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground">Loading anomalies...</div>
          ) : anomalies.length ? (
            anomalies.map((anomaly, idx) => {
              const color = anomaly.severity === 'high' ? 'text-danger' : anomaly.severity === 'medium' ? 'text-warning' : 'text-primary';
              return (
                <div key={idx} className="bg-card border border-border rounded-lg p-4 flex gap-3">
                  <AlertCircle className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{anomaly.title}</p>
                    <p className="text-muted-foreground text-sm">{anomaly.description}</p>
                  </div>
                  <span className="text-muted-foreground text-xs flex-shrink-0 whitespace-nowrap">{anomaly.time}</span>
                </div>
              );
            })
          ) : (
            <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground">No anomalies detected yet.</div>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'overview' && !overview ? (
        <div className="bg-card border border-border rounded-lg p-4 text-muted-foreground">No report data available.</div>
      ) : null}
    </div>
  );
}
