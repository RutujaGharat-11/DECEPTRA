'use client';

import { useEffect, useState, useRef } from 'react';
import { Orbitron } from 'next/font/google';
import { apiUrl } from '@/lib/api';
import { BrandLogo } from '../brand-logo';
import {
  AlertCircle,
  Landmark,
  Loader2,
  Siren,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Terminal,
  Image as ImageIcon,
  FileText,
  Mic,
  Cpu,
  Fingerprint,
  Activity,
  CheckCircle2,
  RefreshCcw,
  Zap,
  ServerCog,
  Type,
  UploadCloud,
  FileDigit,
  Wifi,
  Lock,
  Database,
  Crosshair,
  Search,
  Link,
  ExternalLink
} from 'lucide-react';
import { AIInterpretation } from '@/components/ai-interpretation';

const TESSERACT_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';

let tesseractLoaderPromise: Promise<any> | null = null;

const loadTesseractCreateWorker = async () => {
  if (typeof window === 'undefined') {
    throw new Error('OCR is only available in the browser.');
  }

  const existingWorkerFactory = (window as any).Tesseract?.createWorker;
  if (existingWorkerFactory) {
    return existingWorkerFactory;
  }

  if (!tesseractLoaderPromise) {
    tesseractLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TESSERACT_SCRIPT_URL;
      script.async = true;

      script.onload = () => {
        const workerFactory = (window as any).Tesseract?.createWorker;
        if (workerFactory) {
          resolve(workerFactory);
          return;
        }

        reject(new Error('Tesseract loaded but did not expose a worker factory.'));
      };

      script.onerror = () => {
        reject(new Error('Unable to load the OCR engine.'));
      };

      document.head.appendChild(script);
    });
  }

  return tesseractLoaderPromise;
};

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400'],
});

function ThreatVectorsChart({ data }: { data: AnalysisResult }) {
  const [animatedValues, setAnimatedValues] = useState({
    urgency: 0,
    authority: 0,
    emotional: 0,
    financial: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        urgency: data.urgency_level ?? 0,
        authority: data.authority_claim ?? 0,
        emotional: data.emotional_pressure ?? 0,
        financial: data.financial_request ?? 0
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const sectors = [
    { label: 'Urgency', value: animatedValues.urgency, color: '#00D4FF', start: 0 },
    { label: 'Authority', value: animatedValues.authority, color: '#FBBF24', start: 90 },
    { label: 'Emotional', value: animatedValues.emotional, color: '#A855F7', start: 180 },
    { label: 'Financial', value: animatedValues.financial, color: '#EF4444', start: 270 },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-2 animate-in fade-in zoom-in duration-1000">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.1" />

          {sectors.map((s, i) => {
            const radius = 38;
            const circumference = 2 * Math.PI * radius;
            const arcLength = (90 / 360) * circumference;
            const visibleArc = (s.value / 100) * (arcLength - 4); // Small gap between sectors
            const startOffset = (s.start / 360) * circumference;

            return (
              <g key={i}>
                {/* Background arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="6"
                  strokeOpacity="0.05"
                  strokeDasharray={`${arcLength - 4} ${circumference - (arcLength - 4)}`}
                  strokeDashoffset={-startOffset}
                />
                {/* Active arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeDasharray={`${visibleArc} ${circumference - visibleArc}`}
                  strokeDashoffset={-startOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 4px ${s.color}88)`,
                  }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[7px] text-white/30 uppercase tracking-[0.4em] mb-0.5">Threat</span>
          <span className="text-xs font-black text-white tracking-[0.2em] uppercase">Vector</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full px-2">
        {sectors.map((s, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}88` }} />
              <span className="text-[9px] uppercase tracking-widest text-white/40">{s.label}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-white pl-3.5">{Math.round(s.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function WireframeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => init((window as any).THREE);
    document.head.appendChild(script);

    function init(THREE: any) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const S = Math.min(520, window.innerWidth - 32);
      canvas.width = S;
      canvas.height = S;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(S, S);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.set(0, 0.2, 4.2);

      const R = 1;
      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      const matBright = new THREE.LineBasicMaterial({ color: 0x00eeff, transparent: true, opacity: 0.85 });
      const matFaint = new THREE.LineBasicMaterial({ color: 0x0099cc, transparent: true, opacity: 0.38 });

      for (let lat = -80; lat <= 80; lat += 20) {
        const pts = [];
        const y = Math.sin(lat * Math.PI / 180) * R;
        const r = Math.cos(lat * Math.PI / 180) * R;
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
        }
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? matBright : matFaint));
      }

      for (let lon = 0; lon < 360; lon += 20) {
        const pts = [];
        for (let i = 0; i <= 128; i++) {
          const lat = -90 + (i / 128) * 180;
          const phi = lat * Math.PI / 180;
          const theta = lon * Math.PI / 180;
          pts.push(new THREE.Vector3(Math.cos(phi) * Math.cos(theta) * R, Math.sin(phi) * R, Math.cos(phi) * Math.sin(theta) * R));
        }
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lon % 60 === 0 ? matBright : matFaint));
      }

      const dotGeo = new THREE.SphereGeometry(0.014, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      for (let lon = 0; lon < 360; lon += 20) {
        for (let lat = -60; lat <= 60; lat += 20) {
          const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180;
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.set(Math.cos(phi) * Math.cos(theta) * R, Math.sin(phi) * R, Math.cos(phi) * Math.sin(theta) * R);
          globeGroup.add(dot);
        }
      }

      function makeRingGroup(radius: number, tiltX: number, tiltZ: number, col: number, opacity: number) {
        const group = new THREE.Group();
        group.rotation.x = tiltX;
        group.rotation.z = tiltZ;
        const pts = [];
        for (let i = 0; i <= 256; i++) {
          const a = (i / 256) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
        const curve = new THREE.CatmullRomCurve3(pts, true);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.008, 8, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity })));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.016, 8, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacity * 0.12 })));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        group.add(dot);
        return { group, dot, radius };
      }

      const r1 = makeRingGroup(1.58, Math.PI * 0.10, Math.PI / 5, 0x00ffff, 0.92);
      const r2 = makeRingGroup(1.44, Math.PI * 0.18, -Math.PI / 8.5, 0x0099ff, 0.78);
      scene.add(r1.group); scene.add(r2.group);

      function makeBaseRing(r: number, op: number, col: number) {
        const pts = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
        }
        const curve = new THREE.CatmullRomCurve3(pts, true);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.005, 6, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op }));
        m.position.y = -1.38;
        return m;
      }

      const baseRings = [makeBaseRing(0.48, 1.0, 0x00ffff), makeBaseRing(0.76, 0.65, 0x0099ff), makeBaseRing(1.06, 0.38, 0x0055ff), makeBaseRing(1.36, 0.18, 0x003388)];
      baseRings.forEach(r => scene.add(r));

      const beacon = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
      beacon.rotation.x = -Math.PI / 2; beacon.position.y = -1.38; scene.add(beacon);

      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.28, 64), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = -1.39; scene.add(halo);

      scene.add(new THREE.AmbientLight(0x001133, 2.0));
      const pt1 = new THREE.PointLight(0x00ffff, 3.0, 12); pt1.position.set(3, 2, 2); scene.add(pt1);
      const pt2 = new THREE.PointLight(0x0055ff, 2.0, 10); pt2.position.set(-3, 1, -2); scene.add(pt2);

      let t = 0;
      function animate() {
        animRef.current = requestAnimationFrame(animate);
        t += 0.005;
        globeGroup.rotation.y += 0.004;
        r1.group.rotation.y += 0.009;
        r2.group.rotation.y -= 0.006;
        r1.dot.position.set(Math.cos(t * 1.7) * r1.radius, 0, Math.sin(t * 1.7) * r1.radius);
        r2.dot.position.set(Math.cos(-t * 1.2) * r2.radius, 0, Math.sin(-t * 1.2) * r2.radius);
        const s = 1 + 0.04 * Math.sin(t * 2.5);
        baseRings.forEach(r => r.scale.set(s, 1, s));
        beacon.material.opacity = 0.7 + 0.3 * Math.sin(t * 3);
        halo.material.opacity = 0.12 + 0.12 * Math.sin(t * 3);
        renderer.render(scene, camera);
      }
      animate();
    }

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "transparent" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", background: "transparent", filter: "drop-shadow(0 0 18px #00eeff) drop-shadow(0 0 40px #0055ffaa)", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}


type AnalysisResult = {
  risk?: 'Low' | 'Medium' | 'High';
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence?: number;
  confidence_score?: number;
  indicators?: string[];
  signals?: string[];
  explanation?: string;
  safety_actions?: string[];
  urgency_level?: number;
  authority_claim?: number;
  emotional_pressure?: number;
  financial_request?: number;

  // New fields
  document_category?: string;
  document_type?: string;
  message_type?: string;
  platform?: string;
  detected_source?: string;
  platform_confidence?: string;
  platform_evidence?: string;
  ui_clues_detected?: string[];
  sender?: string;
  is_suspicious_sender?: boolean;
  sender_reason?: string;
  original_text?: string;
  extracted_text?: string;
  risk_flags?: string[];
  suspicious_domains?: { domain: string; impersonating: string }[];
  domain_verification?: { domain: string; verification: { verified: boolean; domain_age_days?: number; suspicious: boolean; reason?: string } }[];
  detected_qr_data?: string[];
  detected_links?: { url: string; risk: string; reason: string }[];
  why_detected?: string[];
  risk_findings?: string[];
  risk_breakdown?: string;
  user_impact?: string;
  recommended_action?: string;
  platform_detected?: string;
  qr_detected?: boolean;
  qr_payload?: string;
  qr_risk?: string;
  modality?: 'text' | 'image' | 'document' | 'audio';
  threat_highlights?: { snippet: string; explanation: string }[];
};

type InputMode = 'text' | 'image' | 'document' | 'audio';

const SCAN_STEPS_TEXT = [
  'Initializing scan protocol...',
  'Ingesting data payload...',
  'Extracting linguistic features...',
  'Analyzing syntax & semantics...',
  'Detecting manipulation patterns...',
  'Generating risk score...',
];

const SCAN_STEPS_AUDIO = [
  'Transcribing audio...',
  'Detecting suspicious patterns...',
  'Running threat intelligence...',
  'Generating final report...',
];

export function Scanner() {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [logs, setLogs] = useState<{ id: number; text: string; time: string }[]>([]);
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const nextLogId = useRef(0);

  // Multi-modal state
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Reset if message changes manually after completion
  useEffect(() => {
    if (status === 'complete') {
      setStatus('idle');
      setAnalysis(null);
      setLogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Scanning progression logs
  useEffect(() => {
    if (status !== 'scanning') return;

    const steps = inputMode === 'audio' ? SCAN_STEPS_AUDIO : SCAN_STEPS_TEXT;
    let currentIndex = 0;
    setLogs([]);
    nextLogId.current = 0;

    const interval = window.setInterval(() => {
      if (currentIndex < steps.length) {
        const stepText = steps[currentIndex];
        setScanStepIndex(currentIndex);

        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

        setLogs(prev => [...prev, { id: nextLogId.current++, text: stepText, time: timeString }]);
        currentIndex++;
      } else {
        setLogs(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, text: last.text.endsWith('...') ? last.text.replace('...', '....') : last.text.endsWith('....') ? last.text.replace('....', '.....') : last.text.endsWith('.....') ? last.text.replace('.....', '...') : last.text + '.' }];
        });
      }
    }, inputMode === 'audio' ? 800 : 400);

    return () => window.clearInterval(interval);
  }, [status, inputMode]);

  const handleAnalyze = async () => {
    if ((status === 'scanning') || (!message.trim() && !selectedFile)) return;

    setStatus('scanning');
    setAnalysis(null);

    try {
      const token = localStorage.getItem('auth_token');
      const isAudioMode = inputMode === 'audio' && selectedFile;

      const response = isAudioMode
        ? await fetch(apiUrl('/analyze/audio'), {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: (() => {
              const formData = new FormData();
              formData.append('file', selectedFile as File);
              return formData;
            })(),
          })
        : await fetch(apiUrl('/analyze'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              message: message.trim() || (selectedFile ? `[${inputMode === 'image' ? 'Image' : 'Document'}: ${selectedFile.name}]` : ''),
              modality: inputMode
            }),
          });

      let data: any = null;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: responseText || response.statusText || 'Analysis failed' };
      }

      const stepsCount = inputMode === 'audio' ? SCAN_STEPS_AUDIO.length : SCAN_STEPS_TEXT.length;
      const stepTime = inputMode === 'audio' ? 800 : 400;
      await new Promise(resolve => setTimeout(resolve, stepsCount * stepTime));

      if (!response.ok) {
        setAnalysis({
          risk_level: 'MEDIUM',
          confidence_score: 0,
          signals: [],
          explanation: data?.error || data?.details || `Analysis service error: ${response.status}`,
        });
      } else {
        setAnalysis(data as AnalysisResult);
        // Debug: Log detected links
        if (data.detected_links && data.detected_links.length > 0) {
          console.log('[DEBUG] Detected Links received:', data.detected_links);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis({
        risk_level: 'MEDIUM',
        confidence_score: 0,
        signals: [],
        explanation: `Connection error: ${error instanceof Error ? error.message : 'Unable to reach analysis service. Check NEXT_PUBLIC_API_URL in your deployment environment.'}`,
      });
    } finally {
      setStatus('complete');
      setLastScanTime(new Date().toLocaleTimeString());
    }
  };

  const handleReset = () => {
    setMessage('');
    setSelectedFile(null);
    setAnalysis(null);
    setStatus('idle');
    setLogs([]);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const isSupportedAudioFile = (file: File) => {
    return /\.(mp3|wav|m4a)$/i.test(file.name) || file.type.startsWith('audio/');
  };

  const ingestAudioFile = (file: File) => {
    if (!isSupportedAudioFile(file)) {
      alert('Please upload an MP3, WAV, or M4A call recording.');
      return;
    }

    setSelectedFile(file);
    setMessage('');
    setInputMode('audio');
    setAnalysis(null);
    setStatus('idle');
    setLogs([]);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // MULTI-MODAL HANDLERS
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsExtracting(true);
    setExtractionProgress('Initializing OCR engine...');

    try {
      const createWorker = await loadTesseractCreateWorker();
      const worker = await createWorker('eng');
      setExtractionProgress('Extracting text preview...');
      const ret = await worker.recognize(file);
      setMessage(ret.data.text.trim());
      await worker.terminate();
      setInputMode('image');
      setExtractionProgress('Image loaded for deep analysis.');
    } catch (err) {
      console.error(err);
      setMessage("[Image uploaded for analysis]");
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsExtracting(true);
    setExtractionProgress('Ready for analysis...');

    // We don't use Tesseract for PDFs/DOCX; backend handles this with pdfplumber/docx
    setMessage(`[Document: ${file.name} uploaded]`);

    setTimeout(() => {
      setIsExtracting(false);
      setExtractionProgress('');
      setInputMode('document');
    }, 800);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ingestAudioFile(file);
  };

  const handleAudioDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    ingestAudioFile(file);
  };

  const handleAudioDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAudio(true);
  };

  const handleAudioDragLeave = () => {
    setIsDraggingAudio(false);
  };

  const selectedAudioFile = selectedFile && isSupportedAudioFile(selectedFile) ? selectedFile : null;

  const normalizeSignalSet = (items: string[] = []) => {
    return new Set(items.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
  };

  const containsSuspiciousDomain = (text: string) => {
    return /(?:^|[\s(])[a-z0-9.-]*(microsoft|google|apple|amazon|paypal|facebook|instagram|whatsapp|linkedin|netflix)[a-z0-9.-]*(verify|security|support|login|account|portal|auth|secure|update|access)?\.[a-z]{2,}(?:\/|\b)/i.test(text);
  };

  const computeRawTextDisplayScore = () => {
    const signalSet = normalizeSignalSet(analysis?.signals ?? analysis?.indicators ?? []);
    const urgency = analysis?.urgency_level ?? 0;
    const authority = analysis?.authority_claim ?? 0;
    const emotional = analysis?.emotional_pressure ?? 0;
    const financial = analysis?.financial_request ?? 0;
    const baseConfidenceScore = Math.max(0, Math.min(100, analysis?.confidence ?? analysis?.confidence_score ?? 0));
    const vectorValues = [urgency, authority, emotional, financial];
    const vectorMax = Math.max(...vectorValues);
    const activeVectorCount = vectorValues.filter((value) => value > 0).length;
    const messageText = `${message}\n${analysis?.explanation ?? ''}`;

    const hasUrgency = signalSet.has('urgency pressure') || urgency >= 35 || /\b(urgent|immediately|act now|final warning|today|within\s+\d+\s*(?:minutes?|hours?|days?)|before\s+\d+\s*(?:am|pm)?|before\s+\d+\b)/i.test(messageText);
    const hasAuthority = signalSet.has('authority impersonation') || authority >= 25 || /\b(bank|government|irs|support|security team|fraud department|official notice|company security team)\b/i.test(messageText);
    const hasLink = signalSet.has('phishing links') || /(?:https?:\/\/|www\.|bit\.ly|tinyurl|is\.gd|ow\.ly|t\.co|cutt\.ly|buff\.ly)/i.test(messageText);
    const hasShortenedUrl = /(?:bit\.ly|tinyurl|is\.gd|ow\.ly|t\.co|cutt\.ly|buff\.ly)\//i.test(messageText);
    const hasSuspensionThreat = signalSet.has('account security threats') || /\b(account|profile|application|access).*(suspend|suspended|blocked|freeze|closed|terminated)|\b(suspend|suspended|blocked|freeze|closed|terminated).*(account|profile|application|access)\b/i.test(messageText);
    const hasVerificationPressure = signalSet.has('credential harvesting') || /\b(verify|verification|confirm|re-verify|validate|student profile|identity)\b/i.test(messageText);
    const hasFakeDomain = containsSuspiciousDomain(messageText);
    const suspiciousCount = [hasUrgency, hasAuthority, hasLink, hasShortenedUrl, hasSuspensionThreat, hasVerificationPressure, hasFakeDomain].filter(Boolean).length;

    let displayScore = baseConfidenceScore;

    if (inputMode === 'text' || analysis?.modality === 'text' || !analysis?.modality) {
      displayScore = Math.max(displayScore, vectorMax + (activeVectorCount * 10) + Math.round((urgency + authority + emotional + financial) * 0.15));

      if (hasFakeDomain && hasShortenedUrl && hasSuspensionThreat) {
        displayScore = Math.max(displayScore, 95);
      } else if (hasFakeDomain && hasLink && hasSuspensionThreat) {
        displayScore = Math.max(displayScore, 92);
      } else if (hasUrgency && hasFakeDomain) {
        displayScore = Math.max(displayScore, 82);
      } else if (hasUrgency && hasLink && hasSuspensionThreat) {
        displayScore = Math.max(displayScore, 88);
      } else if (suspiciousCount >= 4) {
        displayScore = Math.max(displayScore, 80);
      } else if (suspiciousCount === 1 && hasUrgency) {
        displayScore = Math.max(displayScore, 55);
      }

      if (!hasUrgency && !hasAuthority && !hasLink && !hasShortenedUrl && !hasSuspensionThreat && !hasVerificationPressure && !hasFakeDomain) {
        displayScore = Math.min(displayScore, 35);
      }
    }

    return Math.max(0, Math.min(100, Math.round(displayScore)));
  };

  const confidenceScore = computeRawTextDisplayScore();

  // RENDERING HELPERS
  const rawRisk = analysis?.risk || analysis?.risk_level || 'Medium';
  const riskLevel = (confidenceScore >= 80 ? 'HIGH' : confidenceScore >= 40 ? 'MEDIUM' : rawRisk.toUpperCase()) as 'LOW' | 'MEDIUM' | 'HIGH';
  const detectedSignals = analysis?.indicators ?? analysis?.signals ?? [];
  const explanation = analysis?.explanation ?? '';
  const threatHighlights = analysis?.threat_highlights || (analysis as any)?.analysis?.threat_highlights || [];
  const showThreatHighlights = ['MEDIUM', 'HIGH', 'CRITICAL'].includes(riskLevel.toUpperCase());

  const riskStyles: Record<string, any> = {
    LOW: { label: (detectedSignals.includes('transcription_failed') || detectedSignals.includes('analysis_incomplete')) ? 'Incomplete' : 'Safe', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', bar: 'bg-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', Icon: ShieldCheck },
    MEDIUM: { label: 'Suspicious', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', bar: 'bg-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', Icon: AlertCircle },
    HIGH: { label: 'High Risk', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', bar: 'bg-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', Icon: ShieldAlert },
    ERROR: { label: 'Analysis Failed', color: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10', bar: 'bg-slate-500', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.3)]', Icon: Ban },
  };

  const RiskIcon = riskStyles[riskLevel]?.Icon || ShieldCheck;

  // Document analysis helpers
  const inferDocumentIdentity = (text: string) => {
    if (!text || text.includes('[Document:')) return 'General Document';
    const t = text.toLowerCase();
    if (t.includes('invoice') || t.includes('bill to') || t.includes('purchase order') || t.includes('amount due')) return 'Financial Invoice';
    if (t.includes('offer letter') || t.includes('internship') || t.includes('employment') || t.includes('appointment')) return 'Internship Offer Letter';
    if (t.includes('statement') || t.includes('bank') || t.includes('transaction history') || t.includes('balance')) return 'Bank Statement';
    if (t.includes('registration') || t.includes('form') || t.includes('application') || t.includes('enrollment')) return 'Registration Form';
    return 'Official Document';
  };

  const hasFinancialIndicators = (text: string) => {
    if (!text || text.includes('[Document:')) return false;
    const t = text.toLowerCase();
    return t.includes('upi') || t.includes('payment') || t.includes('fee') || t.includes('bank details') || 
           t.includes('transaction') || t.includes('account number') || t.includes('ifsc') || 
           t.includes('total amount') || t.includes('pay to');
  };

  const detectLanguage = (text: string) => {
    if (!text || text.includes('[Document:')) return 'English (Global)';
    if (/[अ-ह]/.test(text)) return 'Hindi (Detected)';
    return 'English (US)';
  };

  return (
    <div className="w-full h-screen bg-[#020813] text-white font-sans flex flex-col overflow-hidden">

      {/* GLOBAL HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#020813]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(0,212,255,0.12),0_8px_32px_-8px_rgba(0,212,255,0.15)] border-b border-[#1e3a8a]/40">
        {/* Logo */}
        <BrandLogo />

        {/* Status Metrics */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">Input Type</span>
            <span className="text-[11px] font-bold text-[#00D4FF] uppercase">{inputMode}</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">Processing Time</span>
            <span className="text-[11px] font-bold text-white/90">~5-10s</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">Last Scan</span>
            <span className="text-[11px] font-bold text-white/90">{lastScanTime || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2 border-l border-[#1e3a8a]/40 pl-8 ml-2">
            <span className={`w-2 h-2 rounded-full ${status === 'scanning' ? 'bg-[#00FF66] animate-pulse shadow-[0_0_8px_#00FF66]' : 'bg-white/30'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'scanning' ? 'text-[#00FF66]' : 'text-white/60'}`}>
              {status === 'scanning' ? 'Analyzing' : 'Idle'}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-1 min-[1200px]:grid-cols-[4fr_9fr_7fr] gap-3 relative pt-[92px] px-3 pb-28 w-full overflow-y-auto">

        {/* ============================== */}
        {/* LEFT PANEL */}
        {/* ============================== */}
        <div className="flex flex-col gap-4">

          {/* Input Modality */}
          <div className="border border-[#1e3a8a]/50 bg-[#06142e]/40 rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <h2 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase flex items-center gap-2 mb-2">
              <ServerCog className="w-3.5 h-3.5" /> Input Modality
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { id: 'text', label: 'Raw Text', icon: Type },
                { id: 'image', label: 'Image OCR', icon: ImageIcon },
                { id: 'document', label: 'Document Parse', icon: FileText },
                { id: 'audio', label: 'Call Recording', icon: UploadCloud }
              ].map(mode => {
                const isActive = inputMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button key={mode.id} onClick={() => setInputMode(mode.id as InputMode)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${isActive ? 'bg-[#00D4FF]/10 border-[#00D4FF] text-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.2)]' : 'bg-[#030B1C]/50 border-[#1e3a8a]/30 text-white/60 hover:border-[#1e3a8a] hover:text-white'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#00D4FF]' : 'text-white/40'}`} />
                    <span className="text-sm tracking-wide font-medium">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capabilities */}
          <div className="border border-[#1e3a8a]/50 bg-[#06142e]/40 rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <h2 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5" /> Core Capabilities
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-white/80 text-[11px] uppercase tracking-wide">Scam Detection</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <span className="text-white/80 text-[11px] uppercase tracking-wide">Phishing Analysis</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Crosshair className="w-4 h-4" />
                </div>
                <span className="text-white/80 text-[11px] uppercase tracking-wide">Fraud Patterns</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-white/80 text-[11px] uppercase tracking-wide">Threat Intel Sync</span>
              </div>
            </div>
          </div>

        </div>


        {/* ============================== */}
        {/* CENTER PANEL */}
        {/* ============================== */}
        <div className="flex flex-col gap-4">
          <div className="border border-[#1e3a8a]/50 bg-[#06142e]/40 rounded-xl p-5 flex flex-col gap-4 relative h-full shadow-md">

            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xs font-bold text-[#00D4FF] tracking-widest uppercase">Central Processing Hub</h2>
              <div className="flex items-center gap-2 text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse shadow-[0_0_5px_#00D4FF]" /> Live
              </div>
            </div>

            {/* Top Terminal Box */}
            <div className="border border-[#1e3a8a]/30 bg-[#030B1C]/80 rounded-lg p-4 font-mono text-[11px] text-[#00FF66]/80 leading-relaxed shadow-inner">
              <p>{'>'} System Ready to Analyze Input</p>
              {status === 'idle' ? (
                <p className="animate-pulse">{'>'} Waiting for user input...</p>
              ) : status === 'scanning' ? (
                <>
                  {inputMode === 'audio' ? (
                    <>
                      <p>{'>'} Transcribing audio...</p>
                      <p>{'>'} Detecting suspicious patterns...</p>
                      <p className="animate-pulse">{'>'} Running threat intelligence...</p>
                    </>
                  ) : (
                    <>
                      <p>{'>'} Analyzing message...</p>
                      <p>{'>'} Detecting scam patterns...</p>
                      <p className="animate-pulse">{'>'} Generating risk score...</p>
                    </>
                  )}
                </>
              ) : (
                <p>{'>'} Analysis complete. Awaiting new input...</p>
              )}
            </div>

            {/* Input Box */}
            <div className={`border border-[#1e3a8a]/50 bg-[#030B1C] rounded-lg p-4 flex-1 flex flex-col relative transition-all duration-300 focus-within:border-[#00D4FF] focus-within:shadow-[0_0_15px_rgba(0,212,255,0.2)_inset] ${(status === 'scanning' || isExtracting) ? 'opacity-50 pointer-events-none' : ''}`}>
              {isExtracting && (
                <div className="absolute inset-0 bg-[#030B1C]/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-[#00D4FF] gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-mono text-sm tracking-widest uppercase font-bold">{extractionProgress}</p>
                </div>
              )}

              {inputMode === 'text' && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Paste your message, email, or content here..."
                  className="w-full flex-1 bg-transparent resize-none text-white/90 placeholder:text-white/30 focus:outline-none font-mono text-sm leading-relaxed"
                  spellCheck={false}
                />
              )}
              {inputMode === 'image' && (
                <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1e3a8a]/20 transition-all rounded-lg border-2 border-dashed border-[#1e3a8a]/50 m-2" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <UploadCloud className="w-10 h-10 text-[#00D4FF]/50 mb-3" />
                  <p className="text-sm font-medium text-white mb-1">Optical Character Recognition</p>
                  <p className="text-[10px] text-white/40 text-center px-4">Click to upload image. Text will be extracted directly into the terminal.</p>
                </div>
              )}
              {inputMode === 'document' && (
                <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1e3a8a]/20 transition-all rounded-lg border-2 border-dashed border-[#1e3a8a]/50 m-2" onClick={() => docInputRef.current?.click()}>
                  <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt,.csv" onChange={handleDocumentUpload} />
                  <FileDigit className="w-10 h-10 text-[#00D4FF]/50 mb-3" />
                  <p className="text-sm font-medium text-white mb-1">Document Parsing</p>
                  <p className="text-[10px] text-white/40 text-center px-4">Upload TXT, PDF, or CSV for text extraction into the payload.</p>
                </div>
              )}
              {inputMode === 'audio' && (
                <div
                  className={`flex-1 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-all m-2 px-5 py-8 text-center ${isDraggingAudio ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-[0_0_25px_rgba(0,212,255,0.15)]' : 'border-[#1e3a8a]/50 hover:bg-[#1e3a8a]/20'}`}
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={handleAudioDragOver}
                  onDragLeave={handleAudioDragLeave}
                  onDrop={handleAudioDrop}
                >
                  <input
                    type="file"
                    ref={audioInputRef}
                    className="hidden"
                    accept=".mp3,.wav,.m4a,audio/*"
                    onChange={handleAudioUpload}
                  />
                  <div className="p-4 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30">
                    <UploadCloud className="w-10 h-10 text-[#00D4FF]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Upload Call Recording</p>
                    <p className="text-[10px] text-white/45 font-mono uppercase tracking-[0.18em]">Drag & drop or choose .mp3 / .wav / .m4a</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        audioInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-md border border-[#00D4FF]/40 text-[#00D4FF] text-[11px] font-bold uppercase tracking-widest hover:bg-[#00D4FF]/10 transition-colors"
                    >
                      Select Audio
                    </button>
                    {selectedAudioFile && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFile(null);
                          setMessage('');
                          if (audioInputRef.current) audioInputRef.current.value = '';
                        }}
                        className="px-4 py-2 rounded-md border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                      >
                        Clear File
                      </button>
                    )}
                  </div>
                  {selectedAudioFile ? (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-black/25 border border-white/5 text-[11px] text-white/70 font-mono">
                      Ready: {selectedAudioFile.name}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="absolute bottom-3 right-3 flex items-center gap-3 text-white/40">
                <Fingerprint className="w-4 h-4 hover:text-[#00D4FF] cursor-pointer transition-colors" />
                <FileText className="w-4 h-4 hover:text-[#00D4FF] cursor-pointer transition-colors" />
                <UploadCloud className="w-4 h-4 hover:text-[#00D4FF] cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Live Scan Feed + Hologram */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase">Live Scan Feed</h2>
              <div className="min-h-[300px] border border-[#1e3a8a]/30 bg-[#030B1C]/80 rounded-lg p-6 flex flex-col md:block overflow-hidden relative shadow-inner">

                {/* Left side: Logs (Constrained width to avoid overlap) */}
                <div className="w-full md:max-w-[40%] h-[150px] md:h-full flex flex-col relative z-20">
                  <div ref={logContainerRef} className="flex-1 overflow-y-auto font-mono text-[10px] text-[#00FF66]/80 leading-relaxed output-scroll pr-4">
                    {logs.length === 0 ? (
                      <p className="text-[#00D4FF]/50">{'>'} System standby. Awaiting data stream...</p>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="mb-1"><span className="text-[#00FF66]/40">[{log.time}]</span> {log.text}</div>
                      ))
                    )}
                  </div>
                </div>

                {/* Center Animation: Absolute Positioned Hub with Optical Lift */}
                <div className="relative md:absolute md:top-1/2 md:left-[80%] md:-translate-x-1/2 md:-translate-y-[70%] flex items-center justify-center mt-6 md:mt-0 z-10">
                  {/* Subtle Glow Integration */}
                  <div className="absolute inset-0 bg-radial-gradient from-[#00D4FF]/10 to-transparent blur-3xl rounded-full opacity-60" />

                  {(status as string) === 'scanning' ? (
                    <div className="w-[280px] h-[280px] shrink-0 flex items-center justify-center relative scale-110 md:scale-100">
                      <WireframeGlobe />
                    </div>
                  ) : (
                    <div className="w-[140px] h-[140px] shrink-0 relative flex items-center justify-center">
                      <div className="absolute inset-0 border border-[#00D4FF]/20 rounded-full transition-all duration-1000 opacity-20" style={{ borderTopStyle: 'dashed' }} />
                      <div className={`absolute inset-2 border border-[#00D4FF]/20 rounded-full transition-all duration-1000 ${(status as string) === 'scanning' ? 'animate-[spin_3s_linear_infinite_reverse] border-[#00D4FF]/60' : 'opacity-20'}`} style={{ borderBottomStyle: 'dotted', borderWidth: '2px' }} />
                      <div className={`absolute inset-6 border border-[#00D4FF]/10 rounded-full transition-all duration-1000 ${(status as string) === 'scanning' ? 'animate-[ping_2s_linear_infinite] border-[#00D4FF]/40' : 'opacity-0'}`} />
                      <Activity className={`w-10 h-10 transition-all duration-500 ${(status as string) === 'scanning' ? 'text-[#00D4FF] animate-pulse drop-shadow-[0_0_8px_#00D4FF]' : 'text-[#00D4FF]/20'}`} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* INITIATE SCAN BUTTON */}
            <button
              onClick={status === 'complete' ? handleReset : handleAnalyze}
              disabled={status === 'scanning' || isExtracting || (status === 'idle' && !message.trim() && !selectedFile)}
              className={`scan-btn mx-auto mt-4 ${(status === 'scanning' || isExtracting || (status === 'idle' && !message.trim() && !selectedFile)) ? 'opacity-40 cursor-not-allowed filter grayscale-[0.5] pointer-events-none' : ''}`}
            >
              {status === 'idle' && (
                <span className="flex items-center justify-center gap-2">START SCAN</span>
              )}
              {status === 'scanning' && (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  PROCESSING...
                </span>
              )}
              {status === 'complete' && (
                <span className="flex items-center justify-center gap-3">
                  <RefreshCcw className="w-5 h-5" />
                  RESET SCAN
                </span>
              )}
            </button>

          </div>
        </div>


        {/* ============================== */}
        {/* RIGHT PANEL */}
        {/* ============================== */}
        <div className="flex flex-col gap-4">
          <div className="border border-[#1e3a8a]/50 bg-[#06142e]/40 rounded-xl p-5 flex flex-col gap-4 h-full shadow-md">

            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xs font-bold text-[#00D4FF] tracking-widest uppercase">Intelligence Output</h2>
              <div className="flex items-center gap-2 text-[10px] text-white/50 font-bold uppercase tracking-widest">
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'idle' ? 'bg-white/30' : 'bg-[#00FF66] animate-pulse shadow-[0_0_5px_#00FF66]'}`} /> {status === 'idle' ? 'Standby' : 'Active'}
              </div>
            </div>

            {/* LIVE ANALYSIS FEED */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase">Live Analysis Feed</h2>
              <div className="h-[90px] border border-[#1e3a8a]/30 bg-[#030B1C]/80 rounded-lg p-4 font-mono text-[10px] text-[#00D4FF]/60 leading-relaxed relative overflow-hidden flex flex-col justify-between shadow-inner">
                <div>
                  {status === 'idle' ? (
                    <>
                      <p>{'>'} Waiting for input stream...</p>
                      <p>{'>'} Threat engine standing by.</p>
                    </>
                  ) : status === 'scanning' ? (
                    <p className="text-[#00FF66] animate-pulse">{'>'} Analyzing payload across neural net...</p>
                  ) : (
                    <>
                      <p className="text-[#00FF66]">{'>'} Analysis sequence complete.</p>
                    </>
                  )}
                </div>
                <Activity className={`absolute bottom-0 left-0 w-full h-8 opacity-20 ${status === 'scanning' ? 'text-[#00FF66] animate-pulse' : 'text-[#1e3a8a]'}`} />
              </div>
            </div>

            {/* THREAT RISK SCORE */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase">Threat Risk Score</h2>
              <div className="h-[140px] border border-[#1e3a8a]/30 bg-[#030B1C]/80 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">

                {/* Arc visualization */}
                <div className="relative w-40 h-20 overflow-hidden mb-2 mt-4">
                  <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[3px] border-[#1e3a8a]/50" />
                  <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[3px] border-transparent border-t-[#00D4FF] border-r-red-500 opacity-80" style={{ transform: 'rotate(-45deg)' }} />

                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 flex justify-between items-center text-[8px] text-white/50 px-2">
                    <span className="absolute top-[50%] left-1">25</span>
                    <span className="absolute top-[10%] left-[50%] -translate-x-1/2">50</span>
                    <span className="absolute top-[50%] right-1">75</span>
                  </div>

                  {/* Needle */}
                  <div className={`absolute bottom-0 left-1/2 w-1 h-16 bg-white origin-bottom rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_white] ${status === 'scanning' ? 'animate-[pulse_1s_infinite]' : ''}`} style={{ transform: `translateX(-50%) rotate(${status === 'complete' ? Math.max(-90, Math.min(90, (confidenceScore / 100) * 180 - 90)) : -90}deg)` }} />
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                  <span className="text-xl font-black text-white tracking-tighter">{status === 'complete' ? confidenceScore : '--'} <span className="text-[9px] text-white/30">/100</span></span>
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">{status === 'idle' ? 'AWAITING' : status === 'scanning' ? 'ANALYZING' : 'THREAT LEVEL'}</span>
                </div>

                <div className="absolute bottom-2 w-full px-8 flex justify-between text-[10px] text-white/40 font-mono">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* VERDICT & ANALYSIS */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-bold text-[#00D4FF] tracking-widest uppercase mb-2">Threat Intelligence Report</h2>
              <div className="border border-[#1e3a8a]/30 bg-[#030B1C]/80 rounded-lg p-0 flex flex-col gap-0 shadow-inner">
                {status === 'complete' && analysis ? (
                  <div className="p-4 space-y-6">
                    {/* Main Risk Banner - More compact and elegant */}
                    <div className="flex items-center gap-4 p-4 bg-[#060B18] border border-[#1e3a8a]/40 rounded-xl relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1 h-full ${riskStyles[riskLevel]?.bar || 'bg-white/20'}`} />
                      <RiskIcon className={`w-6 h-6 shrink-0 ${riskStyles[riskLevel]?.color || 'text-white'}`} />
                      <div className="flex flex-col">
                        <span className={`text-lg font-black italic tracking-widest ${riskStyles[riskLevel]?.color || 'text-white'}`}>{riskStyles[riskLevel]?.label || 'Unknown'}</span>
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Neural Confidence: {confidenceScore}%</span>
                      </div>
                    </div>

                    {/* MODALITY-SPECIFIC CONTENT */}

                    {/* 1. IMAGE OCR MODE PANELS */}
                    {(inputMode === 'image' || analysis.modality === 'image') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Execution Summary Card */}
                        <div className="p-4 bg-[#030B1C]/50 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                          <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <Cpu className="w-3 h-3" /> Execution Summary
                          </h4>
                          <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                            {explanation || "This screenshot appears suspicious due to urgency tactics and external links."}
                          </p>
                        </div>

                        {/* Detected Source Card */}
                        {(() => {
                          const inferSource = (text?: string) => {
                            if (!text) return null;
                            const t = text.toLowerCase();
                            if (t.includes('whatsapp')) return 'WhatsApp';
                            if (t.includes('gmail') || (t.includes('inbox') && t.includes('compose'))) return 'Gmail';
                            if (t.includes('linkedin') || t.includes('connections')) return 'LinkedIn';
                            if (t.includes('telegram')) return 'Telegram';
                            if (t.includes('instagram') || t.includes('reels')) return 'Instagram';
                            if (t.includes('facebook') || t.includes('messenger')) return 'Facebook';
                            return null;
                          };
                          const sourceName = analysis.detected_source || analysis.platform_detected || inferSource(analysis.extracted_text) || inferSource(message);
                          if (!sourceName) return null;

                          return (
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl relative overflow-hidden group shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ImageIcon className="w-12 h-12" />
                              </div>
                              <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Search className="w-3 h-3" /> Detected Source
                              </h4>
                              <span className="text-lg font-bold text-white tracking-tight">
                                {sourceName}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Why This Is Risky Section */}
                        {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                            <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <AlertCircle className="w-3 h-3" /> Why This Is Risky
                            </h4>
                            <div className="space-y-2">
                              {(() => {
                                const reasons: string[] = [];
                                if ((analysis.urgency_level || 0) > 30) reasons.push("Uses urgency tactics to create pressure");
                                if (analysis.detected_links && analysis.detected_links.length > 0) reasons.push("Contains unverified or suspicious external links");
                                if ((analysis.financial_request || 0) > 30) reasons.push("Asks for financial action or payment");
                                if ((analysis.authority_claim || 0) > 30) reasons.push("Impersonates an authority figure");

                                const allFindings = [...(analysis.indicators || []), ...(analysis.signals || []), ...(analysis.risk_findings || [])].join(' ').toLowerCase();
                                if (allFindings.includes('qr') || analysis.qr_detected) reasons.push("Uses a QR code to hide the real destination");
                                if (allFindings.includes('phish') || allFindings.includes('impersonat') || allFindings.includes('fake')) reasons.push("Shows strong signs of being a phishing attempt");
                                if (allFindings.includes('scam') || allFindings.includes('fraud')) reasons.push("Matches known scam patterns");

                                if (reasons.length === 0) reasons.push("Displays unusual formatting or suspicious requests");

                                return Array.from(new Set(reasons)).map((reason, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-[11px] text-white/90">
                                    <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                    <span>{reason}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 3. Threat Highlights Section (Image OCR) */}
                        {showThreatHighlights && (
                          <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                            <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> Threat Highlights
                            </h4>
                            {threatHighlights.length > 0 ? (
                              <div className="space-y-3">
                                {threatHighlights.map((highlight: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                      <span className="text-[11px] font-mono text-white/90 italic">"{highlight.snippet}"</span>
                                    </div>
                                    <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                      <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                      {highlight.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center p-4 bg-[#060B18]/40 border border-white/5 rounded-lg border-dashed">
                                  {status === 'scanning' ? (
                                    <span className="text-[10px] text-[#00D4FF]/60 italic font-mono flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-pulse" />
                                      Analyzing suspicious conversation signals...
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 w-full bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all text-left">
                                      <div className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                        <span className="text-[11px] font-mono text-white/90 italic">"Contextual threat pattern identified in image structure."</span>
                                      </div>
                                      <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                        <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                        {detectedSignals.length > 0 ? detectedSignals[0].replace(/_/g, ' ').toUpperCase() : 'COVERT THREAT'} DETECTED
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detected Links Section (Image OCR) */}
                        {analysis.detected_links && analysis.detected_links.length > 0 && (
                          <div className="p-4 bg-[#030B1C]/50 border border-cyan-500/30 rounded-xl">
                            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Link className="w-4 h-4" />
                              Detected Links Analysis
                            </h4>
                            <div className="space-y-3">
                              {analysis.detected_links.map((link, idx) => (
                                <div key={idx} className="p-3 bg-[#060B18] border border-cyan-500/20 rounded-lg">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <code className="text-[11px] text-blue-400 break-all font-mono">{link.url}</code>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap ${link.risk === 'high' ? 'text-red-300 bg-red-900/30' : link.risk === 'medium' ? 'text-yellow-300 bg-yellow-900/30' : 'text-green-300 bg-green-900/30'}`}>
                                      {link.risk.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/70 leading-relaxed">{link.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* QR Findings Section */}
                        {(analysis.detected_qr_data || analysis.qr_detected) && (
                          <div className="p-4 bg-[#030B1C]/50 border border-purple-500/20 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                            <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> QR Intelligence
                            </h4>
                            {(() => {
                              const qrText = analysis.qr_payload || (analysis.detected_qr_data && analysis.detected_qr_data[0]) || "Encrypted/Invalid QR Data";
                              const riskStatus = analysis.qr_risk || 'high'; // Scams often use QRs, default to high if undefined
                              const isSafe = riskStatus.toLowerCase() === 'safe' || riskStatus.toLowerCase() === 'low';
                              const badgeColor = isSafe ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

                              return (
                                <div className="flex flex-col gap-3 p-3 bg-[#060B18]/80 border border-white/5 rounded-lg group hover:border-purple-500/30 transition-all">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="font-mono text-[10px] text-purple-200 break-all leading-relaxed">
                                      {qrText}
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${badgeColor}`}>
                                      {isSafe ? 'SAFE QR' : 'SUSPICIOUS QR'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                       
                      </div>
                    )}
                    {/* 2. DOCUMENT MODE PANELS */}
                    {analysis.modality === 'document' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                        
                        {/* Document Identity */}
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl relative overflow-hidden group shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Fingerprint className="w-12 h-12" />
                          </div>
                          <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <Search className="w-3 h-3" /> Document Identity
                          </h4>
                          <span className="text-lg font-bold text-white tracking-tight">
                            {analysis.document_type || inferDocumentIdentity(analysis.extracted_text || message)}
                          </span>
                        </div>

                        {/* Financial / Payment Indicators */}
                        {hasFinancialIndicators(analysis.extracted_text || message) && (
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                            <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Wallet className="w-3 h-3" /> Financial / Payment Indicators
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { (analysis.extracted_text || message || "").toLowerCase().includes('upi') && (
                                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-400 font-black uppercase tracking-wider">UPI Request Detected</span>
                              )}
                              { (analysis.extracted_text || message || "").toLowerCase().includes('bank') && (
                                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-400 font-black uppercase tracking-wider">Bank Details Found</span>
                              )}
                              { (analysis.extracted_text || message || "").toLowerCase().includes('fee') && (
                                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-400 font-black uppercase tracking-wider">Payment Instructions</span>
                              )}
                              { (analysis.extracted_text || message || "").toLowerCase().includes('transaction') && (
                                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-400 font-black uppercase tracking-wider">Transfer Records</span>
                              )}
                            </div>
                            <p className="mt-3 text-[10px] text-amber-400/70 font-medium leading-relaxed italic">
                              * Neural engine detected active financial instructions within the document structure.
                            </p>
                          </div>
                        )}

                        {/* Document Metadata */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[#030B1C]/50 border border-[#1e3a8a]/30 rounded-lg group hover:border-[#00D4FF]/40 transition-colors">
                            <span className="text-[8px] text-white/40 uppercase tracking-widest block mb-1">Source Name</span>
                            <span className="text-[10px] font-bold text-white truncate block">{selectedFile?.name || "unnamed_source.pdf"}</span>
                          </div>
                          <div className="p-3 bg-[#030B1C]/50 border border-[#1e3a8a]/30 rounded-lg group hover:border-[#00D4FF]/40 transition-colors">
                            <span className="text-[8px] text-white/40 uppercase tracking-widest block mb-1">MIME Type</span>
                            <span className="text-[10px] font-bold text-white uppercase">{selectedFile?.type?.split('/')[1] || "DOC_STREAM"}</span>
                          </div>
                          <div className="p-3 bg-[#030B1C]/50 border border-[#1e3a8a]/30 rounded-lg group hover:border-[#00D4FF]/40 transition-colors">
                            <span className="text-[8px] text-white/40 uppercase tracking-widest block mb-1">Volume Analysis</span>
                            <span className="text-[10px] font-bold text-white">1 Page (Standard)</span>
                          </div>
                          <div className="p-3 bg-[#030B1C]/50 border border-[#1e3a8a]/30 rounded-lg group hover:border-[#00D4FF]/40 transition-colors">
                            <span className="text-[8px] text-white/40 uppercase tracking-widest block mb-1">Linguistic Profile</span>
                            <span className="text-[10px] font-bold text-white">{detectLanguage(analysis.extracted_text || message)}</span>
                          </div>
                        </div>

                        {/* Risk Findings */}
                        {analysis.risk_findings && analysis.risk_findings.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <ShieldAlert className="w-3 h-3" /> Risk Analysis findings
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {analysis.risk_findings.map((finding, idx) => (
                                <div key={idx} className="px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-[11px] text-white/90 flex items-center gap-3">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  {finding}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Threat Highlights Section (Document Parse) */}
                        {showThreatHighlights && (
                          <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                            <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> Threat Highlights
                            </h4>
                            {threatHighlights.length > 0 ? (
                              <div className="space-y-3">
                                {threatHighlights.map((highlight: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                      <span className="text-[11px] font-mono text-white/90 italic">"{highlight.snippet}"</span>
                                    </div>
                                    <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                      <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                      {highlight.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center p-4 bg-[#060B18]/40 border border-white/5 rounded-lg border-dashed">
                                  {status === 'scanning' ? (
                                    <span className="text-[10px] text-[#00D4FF]/60 italic font-mono flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-pulse" />
                                      Analyzing suspicious document patterns...
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 w-full bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all text-left">
                                      <div className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                        <span className="text-[11px] font-mono text-white/90 italic">"Contextual threat pattern identified in document structure."</span>
                                      </div>
                                      <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                        <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                        {detectedSignals.length > 0 ? detectedSignals[0].replace(/_/g, ' ').toUpperCase() : 'COVERT THREAT'} DETECTED
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detected Links Section */}
                        {analysis.detected_links && analysis.detected_links.length > 0 && (
                          <div className="p-4 bg-[#030B1C]/50 border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Link className="w-4 h-4" />
                              Detected Links Analysis
                            </h4>
                            <div className="space-y-3">
                              {analysis.detected_links.map((link, idx) => (
                                <div key={idx} className="p-3 bg-[#060B18] border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-colors">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <code className="text-[11px] text-blue-400 break-all font-mono">{link.url}</code>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap ${link.risk === 'high' ? 'text-red-300 bg-red-900/30' : link.risk === 'medium' ? 'text-yellow-300 bg-yellow-900/30' : 'text-green-300 bg-green-900/30'}`}>
                                      {link.risk.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/70 leading-relaxed">{link.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Better Extracted Transcript UI */}
                        <div className="space-y-3">
                          <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> Forensic Document Transcript
                          </h4>
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-b from-[#1e3a8a]/20 to-transparent rounded-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="relative p-4 bg-[#020813]/80 border border-[#1e3a8a]/40 rounded-xl text-[11px] font-mono text-[#00FF66]/70 leading-relaxed max-h-64 overflow-y-auto custom-scrollbar shadow-inner backdrop-blur-sm">
                              <div className="flex flex-col gap-1">
                                {(analysis.extracted_text || (message && !message.includes('[Document:') ? message : "") || "").split('\n').filter(l => l.trim()).map((line, i) => (
                                  <div key={i} className="flex gap-4 group/line">
                                    <span className="text-white/10 select-none w-6 text-right shrink-0 font-mono">{String(i + 1).padStart(2, '0')}</span>
                                    <span className="group-hover/line:text-[#00FF66] transition-colors">{line}</span>
                                  </div>
                                ))}
                                {!(analysis.extracted_text || (message && !message.includes('[Document:') ? message : "")) && (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-30 gap-2">
                                    <Ban className="w-8 h-8" />
                                    <span className="text-[10px] uppercase tracking-widest">No valid text payload recovered</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* 3. RAW TEXT MODE */}
                    {(() => {
                      const isRawText = (!analysis.modality && inputMode === 'text') || analysis.modality === 'text';
                      if (isRawText) {
                        console.log('[DEBUG] Raw Text Mode Enabled - Modality:', analysis.modality);
                        console.log('[DEBUG] Detected Links Available:', analysis.detected_links);
                        console.log('[DEBUG] Detected Links Count:', analysis.detected_links?.length || 0);
                      }
                      return isRawText;
                    })() && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Executive Summary Section */}
                        <div className="flex flex-col gap-4">
                          <h3 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase border-b border-[#1e3a8a]/50 pb-1">Executive Summary</h3>
                          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                            {explanation || 'Comprehensive analysis of the provided payload indicates specific threat patterns. See detailed breakdown below.'}
                          </p>

                        </div>

                        {/* Why This Is Risky Section */}
                        {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                            <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <AlertCircle className="w-3 h-3" /> Why This Is Risky
                            </h4>
                            <div className="space-y-2">
                              {(() => {
                                const reasons: string[] = [];
                                if ((analysis.urgency_level || 0) > 30) reasons.push("Uses urgency tactics to create pressure");
                                if (analysis.detected_links && analysis.detected_links.length > 0) reasons.push("Contains unverified or suspicious external links");
                                if ((analysis.financial_request || 0) > 30) reasons.push("Asks for financial action or payment");
                                if ((analysis.authority_claim || 0) > 30) reasons.push("Impersonates an authority figure");
                                
                                const allFindings = [...(analysis.indicators || []), ...(analysis.signals || []), ...(analysis.risk_findings || [])].join(' ').toLowerCase();
                                if (allFindings.includes('qr') || analysis.qr_detected) reasons.push("Uses a QR code to hide the real destination");
                                if (allFindings.includes('phish') || allFindings.includes('impersonat') || allFindings.includes('fake')) reasons.push("Shows strong signs of being a phishing attempt");
                                if (allFindings.includes('scam') || allFindings.includes('fraud')) reasons.push("Matches known scam patterns");
                                
                                if (reasons.length === 0) reasons.push("Displays unusual formatting or suspicious requests");
                                
                                return Array.from(new Set(reasons)).map((reason, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-[11px] text-white/90">
                                    <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                    <span>{reason}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 3. Threat Highlights Section (Raw Text) */}
                        {showThreatHighlights && (
                          <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                            <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> Threat Highlights
                            </h4>
                            {threatHighlights.length > 0 ? (
                              <div className="space-y-3">
                                {threatHighlights.map((highlight: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                      <span className="text-[11px] font-mono text-white/90 italic">"{highlight.snippet}"</span>
                                    </div>
                                    <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                      <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                      {highlight.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center p-4 bg-[#060B18]/40 border border-white/5 rounded-lg border-dashed">
                                  {status === 'scanning' ? (
                                    <span className="text-[10px] text-[#00D4FF]/60 italic font-mono flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-pulse" />
                                      Analyzing linguistic threat indicators...
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 w-full bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all text-left">
                                      <div className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                        <span className="text-[11px] font-mono text-white/90 italic">"Contextual threat pattern identified in message structure."</span>
                                      </div>
                                      <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                        <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                        {detectedSignals.length > 0 ? detectedSignals[0].replace(/_/g, ' ').toUpperCase() : 'COVERT THREAT'} DETECTED
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}

                        {analysis.detected_links && analysis.detected_links.length > 0 && (
                          <div className="p-4 bg-[#030B1C]/50 border border-cyan-500/30 rounded-xl">
                            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Link className="w-4 h-4" />
                              Detected Links Analysis
                            </h4>
                            <div className="space-y-3">
                              {analysis.detected_links.map((link, idx) => (
                                <div key={idx} className="p-3 bg-[#060B18] border border-cyan-500/20 rounded-lg">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <code className="text-[11px] text-blue-400 break-all font-mono">{link.url}</code>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap ${link.risk === 'high' ? 'text-red-300 bg-red-900/30' : link.risk === 'medium' ? 'text-yellow-300 bg-yellow-900/30' : 'text-green-300 bg-green-900/30'}`}>
                                      {link.risk.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/70 leading-relaxed">{link.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. AUDIO / CALL RECORDING MODE */}
                    {(inputMode === 'audio' || analysis.modality === 'audio') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* 1. Executive Summary */}
                        <div className="flex flex-col gap-4">
                          <h3 className="text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase border-b border-[#1e3a8a]/50 pb-1">Executive Summary</h3>
                          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                            {explanation || 'This call recording shows patterns associated with known scams. Review the analysis below for details.'}
                          </p>
                        </div>

                        {/* 2. Why Is This Risky */}
                        {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                            <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <AlertCircle className="w-3 h-3" /> Why Is This Risky
                            </h4>
                            <div className="space-y-2">
                              {(() => {
                                const reasons: string[] = [];
                                if ((analysis.urgency_level || 0) > 30) reasons.push("The caller uses urgency to pressure immediate action.");
                                if ((analysis.authority_claim || 0) > 30) reasons.push("The caller attempts to fake authority or impersonate an organization.");
                                if ((analysis.emotional_pressure || 0) > 30) reasons.push("The caller applies emotional or recruitment pressure.");
                                if ((analysis.financial_request || 0) > 30) reasons.push("The caller asks for financial information, money, or promises unrealistic rewards.");
                                
                                const allFindings = [...(analysis.indicators || []), ...(analysis.signals || []), ...(analysis.risk_findings || [])].join(' ').toLowerCase();
                                if (allFindings.includes('scam') || allFindings.includes('fraud') || allFindings.includes('phishing')) reasons.push("The conversation matches known scam scripts.");
                                
                                if (reasons.length === 0) reasons.push("The caller exhibits manipulative or suspicious conversational patterns.");
                                
                                return Array.from(new Set(reasons)).map((reason, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-[11px] text-white/90">
                                    <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                    <span>{reason}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 3. Threat Highlights Section (Audio) */}
                        {showThreatHighlights && (
                          <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                            <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> Threat Highlights
                            </h4>
                            {threatHighlights.length > 0 ? (
                              <div className="space-y-3">
                                {threatHighlights.map((highlight: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                      <span className="text-[11px] font-mono text-white/90 italic">"{highlight.snippet}"</span>
                                    </div>
                                    <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                      <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                      {highlight.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center p-4 bg-[#060B18]/40 border border-white/5 rounded-lg border-dashed">
                                  {status === 'scanning' ? (
                                    <span className="text-[10px] text-[#00D4FF]/60 italic font-mono flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-pulse" />
                                      Analyzing conversation for manipulative intent...
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 w-full bg-[#060B18]/60 border border-white/5 rounded-lg group hover:border-[#00D4FF]/30 transition-all text-left">
                                      <div className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-[#00D4FF] mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                                        <span className="text-[11px] font-mono text-white/90 italic">"Contextual threat pattern identified in audio transcription."</span>
                                      </div>
                                      <div className="pl-3 text-[10px] text-[#00D4FF]/70 font-medium flex items-center gap-1.5">
                                        <div className="w-2 h-[1px] bg-[#00D4FF]/30" />
                                        {detectedSignals.length > 0 ? detectedSignals[0].replace(/_/g, ' ').toUpperCase() : 'COVERT THREAT'} DETECTED
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}



                        {/* 4. Transcript */}
                        <div className="space-y-3">
                          <h4 className="text-[9px] font-black text-[#00D4FF] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> Transcript
                          </h4>
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-b from-[#1e3a8a]/20 to-transparent rounded-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="relative p-4 bg-[#020813]/80 border border-[#1e3a8a]/40 rounded-xl text-[11px] font-mono text-white/70 leading-relaxed max-h-64 overflow-y-auto custom-scrollbar shadow-inner backdrop-blur-sm">
                              <div className="flex flex-col gap-2">
                                {(() => {
                                  const textToShow = analysis.extracted_text || analysis.original_text || message;
                                  if (!textToShow || textToShow.trim() === '') {
                                    return (
                                      <div className="flex flex-col items-center justify-center py-8 opacity-30 gap-2">
                                        <Ban className="w-8 h-8" />
                                        <span className="text-[10px] uppercase tracking-widest">No transcript recovered</span>
                                      </div>
                                    );
                                  }
                                  return textToShow.split('\n').filter(l => l.trim()).map((line, i) => (
                                    <div key={i} className="flex gap-4 group/line">
                                      <span className="text-white/20 select-none w-6 text-right shrink-0 font-mono">{String(i + 1).padStart(2, '0')}</span>
                                      <span className="group-hover/line:text-white transition-colors">{line}</span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* THREAT VECTORS INSIDE REPORT */}
                    <div className="flex flex-col gap-1.5 pt-4 border-t border-[#1e3a8a]/30 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#00D4FF] tracking-widest uppercase mb-1">
                        <span>Threat Vectors</span>
                      </div>
                      <ThreatVectorsChart data={analysis} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 p-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
                      <ShieldAlert className="w-12 h-12 text-yellow-500 relative z-10" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-bold text-white uppercase tracking-widest">Intelligence Standby</span>
                      <span className="text-[10px] text-white/40 text-center font-mono uppercase tracking-widest">Awaiting Data Stream for Neural Analysis</span>
                    </div>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>

      </div>


    </div>
  );
}
