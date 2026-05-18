'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Terminal,
  Zap,
  Lock,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Link2Off,
  UserCheck,
  FileText
} from 'lucide-react';
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
  modality?: 'text' | 'image' | 'document' | 'audio';
  risk_findings?: string[];
  detected_source?: string;
  extracted_text?: string;
  detected_links?: { url: string; risk: string }[] | string[];
  qr_data?: string[];
  safety_actions?: string[];
};

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

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

  const riskStyles = {
    LOW: {
      label: 'LOW RISK',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/5',
      bar: 'bg-emerald-500',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    MEDIUM: {
      label: 'SUSPICIOUS',
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/5',
      bar: 'bg-amber-500',
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      icon: <AlertCircle className="w-5 h-5" />
    },
    HIGH: {
      label: 'HIGH RISK',
      color: 'text-red-500',
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
      bar: 'bg-red-500',
      shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
      icon: <ShieldAlert className="w-5 h-5" />
    },
  } as const;

  const renderHighlightedExplanation = (text: string) => {
    if (!text) return null;
    const keywords = [
      { word: 'Urgency Pressure', color: 'text-amber-400 font-bold' },
      { word: 'Credential Harvesting', color: 'text-purple-400 font-bold' },
      { word: 'Emotional Manipulation', color: 'text-pink-400 font-bold' },
      { word: 'Phishing Links', color: 'text-blue-400 font-bold' },
      { word: 'urgency', color: 'text-sky-400 font-semibold' },
      { word: 'authority', color: 'text-amber-400 font-semibold' },
      { word: 'emotional', color: 'text-purple-400 font-semibold' },
      { word: 'financial', color: 'text-red-400 font-semibold' },
      { word: 'scam', color: 'text-red-400 font-bold' },
      { word: 'fraud', color: 'text-red-400 font-bold' },
    ];
    return text.split(/(\s+)/).map((part, i) => {
      const match = keywords.find(k => part.toLowerCase().includes(k.word.toLowerCase()));
      if (match) return <span key={i} className={`${match.color}`}>{part}</span>;
      return part;
    });
  };

  // Helper to extract dynamic, visual highlights from the payload message text.
  const getDynamicHighlights = (text: string, signals: string[]) => {
    const highlights: { snippet: string; explanation: string }[] = [];
    if (!text) return highlights;

    const lowerText = text.toLowerCase();
    
    // Check for Urgency patterns
    if (lowerText.includes('urg') || lowerText.includes('immediat') || lowerText.includes('hurry') || lowerText.includes('fast') || lowerText.includes('quick') || lowerText.includes('now') || lowerText.includes('restrict')) {
      const match = text.match(/([^.!?\n]*?(?:urg|immediat|hurry|fast|quick|now|restrict)[^.!?\n]*?[.!?\n]?)/i);
      if (match) {
        highlights.push({
          snippet: match[0].trim(),
          explanation: "High urgency cue demanding immediate response."
        });
      }
    }
    
    // Check for Financial patterns
    if (lowerText.includes('bank') || lowerText.includes('card') || lowerText.includes('pay') || lowerText.includes('money') || lowerText.includes('cash') || lowerText.includes('transfer') || lowerText.includes('fund') || lowerText.includes('fee')) {
      const match = text.match(/([^.!?\n]*?(?:bank|card|pay|money|cash|transfer|fund|fee)[^.!?\n]*?[.!?\n]?)/i);
      if (match) {
        highlights.push({
          snippet: match[0].trim(),
          explanation: "Explicit request or reference to financial transaction."
        });
      }
    }
    
    // Check for Authority/Verification patterns
    if (lowerText.includes('verif') || lowerText.includes('offic') || lowerText.includes('admin') || lowerText.includes('support') || lowerText.includes('alert') || lowerText.includes('warn')) {
      const match = text.match(/([^.!?\n]*?(?:verif|offic|admin|support|alert|warn)[^.!?\n]*?[.!?\n]?)/i);
      if (match && highlights.length < 3) {
        highlights.push({
          snippet: match[0].trim(),
          explanation: "Authority claim attempting to impersonate system administration."
        });
      }
    }

    // Fallback if none found
    if (highlights.length === 0) {
      highlights.push({
        snippet: text.length > 85 ? text.slice(0, 85) + '...' : text,
        explanation: "Suspicious metadata signature matching known social engineering schemas."
      });
    }

    return highlights;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030816] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-[#00D4FF] animate-pulse" />
          <span className="text-[#00D4FF]/50 font-mono text-xs uppercase tracking-widest">Retrieving Neural Archives...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#030816] flex items-center justify-center">
        <div className="text-red-400/50 font-mono text-xs uppercase tracking-widest">Archive record not found.</div>
      </div>
    );
  }

  const currentRisk = riskStyles[report.risk_level] || riskStyles.LOW;
  const dateStr = new Date(report.timestamp).toLocaleString();

  const sectors = [
    { label: 'Urgency', value: report.urgency_level ?? 0, color: '#00D4FF', start: 0 },
    { label: 'Authority', value: report.authority_claim ?? 0, color: '#FBBF24', start: 90 },
    { label: 'Emotional', value: report.emotional_pressure ?? 0, color: '#A855F7', start: 180 },
    { label: 'Financial', value: report.financial_request ?? 0, color: '#EF4444', start: 270 },
  ];

  // Dynamic recommendations mapping
  const getRecommendationDetails = (action: string, idx: number) => {
    const actLower = action.toLowerCase();
    if (actLower.includes('link') || actLower.includes('click') || actLower.includes('url')) {
      return {
        title: "Link Isolation Protocol",
        desc: action,
        icon: <Link2Off className="w-5 h-5 text-amber-400" />,
        border: "hover:border-amber-500/30"
      };
    }
    if (actLower.includes('money') || actLower.includes('payment') || actLower.includes('send') || actLower.includes('financial')) {
      return {
        title: "Asset Lockdown",
        desc: action,
        icon: <Ban className="w-5 h-5 text-red-400" />,
        border: "hover:border-red-500/30"
      };
    }
    if (actLower.includes('verify') || actLower.includes('sender') || actLower.includes('independent')) {
      return {
        title: "Identity Verification",
        desc: action,
        icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
        border: "hover:border-emerald-500/30"
      };
    }
    
    // Fallback/generics based on index
    const fallbacks = [
      { title: "Defensive Isolation", icon: <Lock className="w-5 h-5 text-sky-400" />, border: "hover:border-sky-500/30" },
      { title: "Source Verification", icon: <UserCheck className="w-5 h-5 text-emerald-400" />, border: "hover:border-emerald-500/30" },
      { title: "Neural Safeguard", icon: <ShieldCheck className="w-5 h-5 text-purple-400" />, border: "hover:border-purple-500/30" }
    ];
    const item = fallbacks[idx % fallbacks.length];
    return {
      title: item.title,
      desc: action,
      icon: item.icon,
      border: item.border
    };
  };

  const dynamicHighlights = getDynamicHighlights(report.message_text, report.signals);

  if (isTranscriptExpanded) {
    return (
      <div className="min-h-screen bg-[#030816] text-white/90 font-sans p-6 md:p-12 pb-32">
        {/* Top Header Navigation */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
          <button
            onClick={() => setIsTranscriptExpanded(false)}
            className="flex items-center gap-2 text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.2em] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Archive Return
          </button>
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] font-mono">
            Session_#{report.id} • {dateStr}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.2em]">
                <Terminal className="w-3.5 h-3.5 text-[#00D4FF]" /> Decoded Payload Stream
              </div>
              <button
                onClick={() => setIsTranscriptExpanded(false)}
                className="text-[9px] font-bold text-emerald-400 font-mono tracking-widest uppercase hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Close Decrypted View
              </button>
            </div>
            <div className="bg-[#060B18]/90 border border-emerald-500/30 rounded-xl p-8 min-h-[60vh] flex flex-col justify-between shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.03]" />
              <div className="flex-1">
                <div className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-widest mb-4 flex items-center justify-between border-b border-emerald-500/10 pb-3">
                  <span>SOURCE_FEED_ID: #{report.id}</span>
                  <span>DECRYPTED_RAW_STREAM</span>
                </div>
                
                <div className="bg-black/40 border border-white/5 p-6 rounded-lg font-mono text-sm leading-relaxed text-emerald-400/90 whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-emerald-500/20 max-h-[65vh] overflow-y-auto">
                  {report.message_text || "No payload content detected."}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center border-t border-emerald-500/10 pt-4">
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.25em]">NeuroShield Cryptographic Interface v3.1</span>
                <button
                  onClick={() => setIsTranscriptExpanded(false)}
                  className="px-6 py-2.5 border border-emerald-500/30 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/60 text-emerald-400 text-xs font-mono uppercase tracking-wider transition-all"
                >
                  Close Decrypted Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030816] text-white/90 font-sans p-6 md:p-12 pb-32">
      {/* Top Header Navigation */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-12">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] hover:text-[#00D4FF] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Archive Return
        </button>
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] font-mono">
          Session_#{report.id} • {dateStr}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">

        {/* LEFT COLUMN: Payload -> Executive Summary -> Why This Is Risky -> Recommended Actions */}
        <div className="flex flex-col gap-6">

          {/* 1. Payload Source */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.2em]">
              <Terminal className="w-3.5 h-3.5 text-[#00D4FF]" /> Payload Source
            </div>
            <div 
              onClick={() => setIsTranscriptExpanded(true)}
              className="bg-[#060B18]/80 border border-[#00D4FF]/20 rounded-xl p-5 h-[160px] flex flex-col justify-between shadow-inner relative overflow-hidden cursor-pointer hover:border-[#00D4FF]/50 hover:shadow-[0_0_15px_rgba(0,212,255,0.05)] transition-all group"
            >
              <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.03]" />
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-bold text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {report.modality === 'image' ? 'IMAGE_OCR_STREAM_DECODED' : report.modality === 'document' ? 'DOC_PARSER_ACTIVE' : 'VALID_DATA_FEED_EXTRACTED'}
                </div>
                <div className="text-[8px] font-bold text-[#00D4FF]/60 uppercase tracking-widest font-mono bg-[#00D4FF]/10 px-2 py-0.5 rounded border border-[#00D4FF]/20 group-hover:text-[#00D4FF] group-hover:border-[#00D4FF]/40 transition-colors">
                  Expand Feed
                </div>
              </div>
              
              <div className="flex-1 my-2.5 flex items-center">
                <p className="text-[12.5px] text-white/70 leading-relaxed font-mono line-clamp-3 w-full">
                  {report.message_text || "No payload content detected."}
                </p>
              </div>

              <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono group-hover:text-[#00D4FF]/80 transition-colors">
                [CLICK TO DECRYPT FULL PAYLOAD STREAM]
              </div>
            </div>
          </div>

          {/* 2. Executive Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              <Activity className="w-3.5 h-3.5 text-white/40" /> Executive Summary
            </div>
            <div className="bg-[#060B18]/60 border border-white/5 rounded-xl p-6 flex flex-col backdrop-blur-sm shadow-[0_0_15px_rgba(0,212,255,0.01)]">
              <p className="text-sm text-white/80 leading-[1.8] font-medium">
                {renderHighlightedExplanation(report.explanation) || 'No narrative interpretation recorded.'}
              </p>
            </div>
          </div>

          {/* 3. Why This Is Risky */}
          {(report.risk_level === 'MEDIUM' || report.risk_level === 'HIGH') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Why This Is Risky
              </div>
              <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.05)] backdrop-blur-sm">
                <div className="space-y-3">
                  {(() => {
                    const reasons: string[] = [];
                    if ((report.urgency_level || 0) > 30) reasons.push("The communication utilizes highly urgent phrasing to pressure immediate action.");
                    if ((report.authority_claim || 0) > 30) reasons.push("The communication attempts to claim authority or impersonate a legitimate entity.");
                    if ((report.emotional_pressure || 0) > 30) reasons.push("The message applies emotional pressure or psychological manipulation.");
                    if ((report.financial_request || 0) > 30) reasons.push("The content contains a request for financial information, credentials, or transfers.");
                    
                    const allFindings = [...(report.signals || []), ...(report.risk_findings || [])].join(' ').toLowerCase();
                    if (allFindings.includes('scam') || allFindings.includes('fraud') || allFindings.includes('phishing')) reasons.push("The patterns present in message structure closely match known social engineering scripts.");
                    
                    if (reasons.length === 0) reasons.push("Suspicious anomalies identified in conversational structure and meta-patterns.");
                    
                    return Array.from(new Set(reasons)).map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[11.5px] text-white/90 leading-relaxed font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        <span>{reason}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 4. Recommended Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Recommended Actions
            </div>
            <div className="flex flex-col gap-3">
              {[
                {
                  title: "IDENTITY VERIFICATION",
                  desc: "Verify the sender through independent, official channels before proceeding.",
                  icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
                  border: "hover:border-emerald-500/30"
                },
                {
                  title: "TRANSACTION LOCKDOWN",
                  desc: "Avoid conducting any financial transactions, payments, or money transfers requested by this source.",
                  icon: <Ban className="w-5 h-5 text-red-400" />,
                  border: "hover:border-red-500/30"
                },
                {
                  title: "NEURAL SAFEGUARD",
                  desc: "Do not share sensitive data, passwords, OTPs, or personal identity details with this contact.",
                  icon: <Lock className="w-5 h-5 text-purple-400" />,
                  border: "hover:border-purple-500/30"
                },
                {
                  title: "COMMUNICATION TERMINATION",
                  desc: "Cease further interaction until legitimacy is independently verified.",
                  icon: <Link2Off className="w-5 h-5 text-amber-400" />,
                  border: "hover:border-amber-500/30"
                }
              ].map((card, idx) => (
                <div 
                  key={idx} 
                  className={`bg-[#060B18]/70 border border-white/5 rounded-xl p-4.5 flex items-start gap-4 transition-all duration-300 ${card.border} hover:bg-[#060B18]/90 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.01)] cursor-pointer group`}
                >
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex-shrink-0">
                    {card.icon}
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-white uppercase tracking-wider group-hover:text-[#00D4FF] transition-colors">{card.title}</span>
                      <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest font-bold">
                        ACTION_RECO_{idx + 1}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/60 font-medium leading-relaxed">{card.desc}</span>
                  </div>
                  <div className="flex-shrink-0 self-center pl-2">
                    <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:translate-x-0.5 group-hover:text-[#00D4FF] transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Risk Status -> Threat Highlights -> Threat Vectors */}
        <div className="flex flex-col gap-6 h-full">

          {/* System Status / Risk Score Badge */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              <ShieldAlert className="w-3.5 h-3.5 text-white/40" /> Risk Assessment
            </div>
            <div className={`bg-[#060B18]/80 border ${currentRisk.border} ${currentRisk.shadow} rounded-xl p-5 h-[160px] flex flex-col justify-between shadow-lg relative overflow-hidden backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${currentRisk.bg} ${currentRisk.color}`}>
                    {currentRisk.icon}
                  </div>
                  <span className={`text-lg font-black italic tracking-widest ${currentRisk.color}`}>
                    {currentRisk.label}
                  </span>
                </div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded border border-white/5 font-mono">
                  DECODED
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Confidence Score</span>
                  <span className="text-[11px] font-bold text-white/80">{report.confidence_score}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${currentRisk.bar} rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(239,68,68,0.5)]`}
                    style={{ width: `${report.confidence_score}%` }}
                  />
                </div>
                <div className="text-right text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 font-mono">
                  VERIFIED NEURAL ENGINE OUTPUT
                </div>
              </div>
            </div>
          </div>

          {/* 5. Threat Highlights */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.2em]">
              <Zap className="w-3.5 h-3.5 text-[#00D4FF]" /> Threat Highlights
            </div>
            <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.03)] backdrop-blur-sm">
              <div className="space-y-3">
                {dynamicHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-[#060B18]/80 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                      <span className="text-[11.5px] font-mono text-white/90 italic break-words">"{highlight.snippet}"</span>
                    </div>
                    <div className="pl-3.5 text-[9.5px] text-[#00D4FF]/75 font-semibold font-mono flex items-center gap-1.5 uppercase tracking-wider">
                      <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                      {highlight.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Threat Vectors Chart */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              <Activity className="w-3.5 h-3.5 text-white/40" /> Threat Vectors
            </div>
            <div className="bg-[#060B18]/60 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center flex-1 backdrop-blur-sm">
              <div className="relative w-56 h-56 flex items-center justify-center mt-6">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.1" />
                  {sectors.map((s, i) => {
                    const radius = 38;
                    const circumference = 2 * Math.PI * radius;
                    const arcLength = (90 / 360) * circumference;
                    const visibleArc = (s.value / 100) * (arcLength - 4);
                    const startOffset = (s.start / 360) * circumference;
                    return (
                      <g key={i}>
                        <circle
                          cx="50" cy="50" r={radius} fill="none" stroke="#1e3a8a" strokeWidth="5.5" strokeOpacity="0.05"
                          strokeDasharray={`${arcLength - 4} ${circumference - (arcLength - 4)}`}
                          strokeDashoffset={-startOffset}
                        />
                        <circle
                          cx="50" cy="50" r={radius} fill="none" stroke={s.color} strokeWidth="5.5"
                          strokeDasharray={`${visibleArc} ${circumference - visibleArc}`}
                          strokeDashoffset={-startOffset} strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                          style={{ filter: `drop-shadow(0 0 3px ${s.color}66)` }}
                        />
                        <circle
                          cx={50 + radius * Math.cos(s.start * Math.PI / 180)}
                          cy={50 + radius * Math.sin(s.start * Math.PI / 180)}
                          r="2" fill={s.color}
                          className={s.value === 0 ? "opacity-30" : "opacity-100"}
                          style={{ filter: s.value > 0 ? `drop-shadow(0 0 3px ${s.color}88)` : 'none' }}
                        />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[7.5px] text-white/30 uppercase tracking-[0.4em] mb-0.5">Threat</span>
                  <span className="text-xs font-black text-white tracking-[0.2em] uppercase">Vectors</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-10 w-full px-2">
                {sectors.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-3 bg-black/10 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 4px ${s.color}44` }} />
                      <span className="text-[8.5px] uppercase tracking-widest text-white/40 font-bold">{s.label}</span>
                    </div>
                    <span className="text-xl font-black text-white/95 ml-3.5 font-mono">{Math.round(s.value)}<span className="text-[10px] text-white/30 ml-0.5">%</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER NAVIGATION */}
      <div className="max-w-7xl mx-auto mt-20 flex justify-center border-t border-white/5 pt-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center justify-center gap-3 px-12 py-3.5 border border-[#00D4FF]/30 rounded-xl bg-[#00D4FF]/5 hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/50 transition-all group shadow-[0_0_15px_rgba(0,212,255,0.02)]"
        >
          <Zap className="w-4 h-4 text-[#00D4FF]" />
          <span className="text-xs font-black text-[#00D4FF] uppercase tracking-[0.2em]">
            Archive Overview
          </span>
        </button>
      </div>

    </div>
  );
}
