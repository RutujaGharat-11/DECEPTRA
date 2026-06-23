'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSignUp } from '@clerk/nextjs/legacy';
import Image from 'next/image';
import { Orbitron } from 'next/font/google';
import { User, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
});

export default function CreateAccountPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/');
      } else {
        setError('Verification incomplete');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      // Clear error slightly and replace with a pseudo-success state or let it be blank,
      // but showing a message helps. Since we only have `error` state, we'll use a hack to show a green message.
      setError('Code sent! Check your inbox.');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Unable to resend code');
    }
  };

  return (
    <div className={`min-h-screen w-full bg-[#020308] text-white flex overflow-hidden relative ${orbitron.variable} font-sans`}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ADVANCED DYNAMIC STYLESHEET: LIVING AI ENVIRONMENT           */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gridScroll {
          0% { background-position: 0px 0px; }
          100% { background-position: 50px 50px; }
        }
        @keyframes volumetricFog {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
          33% { transform: translate(40px, -30px) scale(1.15); opacity: 0.24; }
          66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.18; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes floatNeuralNode {
          0% { transform: translateY(15px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-15px) translateX(10px); opacity: 0.55; }
          100% { transform: translateY(15px) translateX(0px); opacity: 0.2; }
        }
        @keyframes flowTelemetry {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-50%); }
        }
        @keyframes activePulse {
          0% { transform: scale(0.96); opacity: 0.1; }
          50% { opacity: 0.35; }
          100% { transform: scale(1.06); opacity: 0; }
        }
        @keyframes pulseEnergyGlow {
          0% { opacity: 0.25; filter: blur(20px); }
          50% { opacity: 0.45; filter: blur(30px); }
          100% { opacity: 0.25; filter: blur(20px); }
        }
      `}} />

      {/* 1. LAYER 1: DEEP VOLUMETRIC GRADIENTS & ATMOSPHERIC HAZE */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Deep navy backplate */}
        <div className="absolute inset-0 bg-radial-gradient(circle at 30% 40%, #030818 0%, #020308 100%)" />
        
        {/* Layered soft blue atmospheric fog circles */}
        <div 
          className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-20 animate-[volumetricFog_25s_infinite_ease-in-out]"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, rgba(0, 85, 255, 0.05) 50%, transparent 100%)',
            filter: 'blur(60px)'
          }}
        />
        <div 
          className="absolute bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full opacity-15 animate-[volumetricFog_32s_infinite_ease-in-out_2s]"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 102, 0.08) 0%, rgba(0, 212, 255, 0.03) 60%, transparent 100%)',
            filter: 'blur(50px)'
          }}
        />
      </div>

      {/* 2. LAYER 2: LARGE-SCALE WORLD COORDINATE GRID */}
      <div 
        className="absolute inset-0 pointer-events-none select-none opacity-[0.02] animate-[gridScroll_40s_linear_infinite] z-1"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="min-h-screen w-full flex flex-col md:flex-row relative z-10">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: ACTIVE FORENSIC SURVEY ENVIRONMENT           */}
        {/* ========================================================= */}
        <div className="hidden md:flex md:w-[46%] lg:w-[54%] relative flex-col justify-center items-center overflow-hidden border-r border-[#1e3a8a]/15 bg-transparent select-none">
          
          {/* Constellation & Living Deception Mapping Grid */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none w-full h-full scale-[1.05] z-0">
            <svg viewBox="0 0 800 450" className="w-full h-full text-[#00d4ff]" fill="currentColor">
              {/* Linked neural intelligence pathways */}
              <path d="M100,80 L220,100 L290,140 L180,240 L100,80 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" fill="none" />
              <path d="M290,140 L380,110 L440,160 L350,210 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" fill="none" />
              <path d="M440,160 L560,90 L620,200 L500,230 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" fill="none" />
              <path d="M220,100 L350,210 L500,230 L180,240 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.15" fill="none" />
              <path d="M380,110 L560,90" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="3 3" />
              <path d="M290,140 L500,230" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="2 2" />

              {/* Passive forensic radar analysis sweep line */}
              <circle cx="400" cy="225" r="280" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="6 6" />
              <line 
                x1="400" 
                y1="225" 
                x2="680" 
                y2="225" 
                stroke="currentColor" 
                strokeWidth="0.8" 
                strokeOpacity="0.25" 
                className="origin-[400px_225px] animate-[radarSweep_28s_linear_infinite]"
              />

              {/* Living intelligence nodes with slow coordinate drifts */}
              <g className="animate-[floatNeuralNode_8s_infinite_ease-in-out]">
                <circle cx="100" cy="80" r="3" className="text-[#00d4ff] opacity-60 animate-pulse" />
                <circle cx="220" cy="100" r="3.5" className="text-[#00ff66] opacity-65" />
                <circle cx="290" cy="140" r="2" className="text-[#00d4ff] opacity-45" />
                <circle cx="180" cy="240" r="2.5" className="text-[#00d4ff] opacity-55" />
              </g>

              <g className="animate-[floatNeuralNode_12s_infinite_ease-in-out_2s]">
                <circle cx="380" cy="110" r="4" className="text-[#00d4ff] opacity-70 animate-pulse" />
                <circle cx="440" cy="160" r="2" className="text-[#00ff66] opacity-50" />
                <circle cx="350" cy="210" r="3" className="text-[#00d4ff] opacity-60" />
              </g>

              <g className="animate-[floatNeuralNode_10s_infinite_ease-in-out_1s]">
                <circle cx="560" cy="90" r="2.5" className="text-[#00d4ff] opacity-45" />
                <circle cx="620" cy="200" r="4" className="text-[#00ff66] opacity-65 animate-pulse" />
                <circle cx="500" cy="230" r="2" className="text-[#00d4ff] opacity-55" />
              </g>
            </svg>
          </div>

          {/* Micro Telemetry Flow Streams (Left Side Ambient Indicator) */}
          <div className="absolute top-[20%] left-6 w-24 h-32 overflow-hidden text-[7.5px] font-mono text-[#00d4ff]/25 pointer-events-none select-none mask-image-gradient">
            <div className="animate-[flowTelemetry_15s_linear_infinite] flex flex-col space-y-1">
              <span>DEC_TRK // 0.8924</span>
              <span>SYS_DELTA // +0.012</span>
              <span>AI_CORE_02 // STABLE</span>
              <span>FLOW_WGT // 99.41%</span>
              <span>NODE_ID // PX_442</span>
              <span>DEC_TRK // 0.8924</span>
              <span>SYS_DELTA // +0.012</span>
              <span>AI_CORE_02 // STABLE</span>
              <span>FLOW_WGT // 99.41%</span>
              <span>NODE_ID // PX_442</span>
            </div>
          </div>

          {/* Micro Telemetry Flow Streams (Right Side Ambient Coordinate Tracker) */}
          <div className="absolute bottom-[20%] right-6 w-24 h-32 overflow-hidden text-[7.5px] font-mono text-[#00d4ff]/25 pointer-events-none select-none text-right">
            <div className="animate-[flowTelemetry_18s_linear_infinite_reverse] flex flex-col space-y-1">
              <span>LAT_VAL // 34.9082</span>
              <span>LON_VAL // -118.243</span>
              <span>FRD_VEC // INCOMING</span>
              <span>SIG_CONF // 0.9882</span>
              <span>TRACER_ON // ACTIVE</span>
              <span>LAT_VAL // 34.9082</span>
              <span>LON_VAL // -118.243</span>
              <span>FRD_VEC // INCOMING</span>
              <span>SIG_CONF // 0.9882</span>
              <span>TRACER_ON // ACTIVE</span>
            </div>
          </div>

          {/* Top-Left: System Status Indicator */}
          <div className="absolute top-6 left-6 flex flex-col gap-0.5 font-mono text-left select-none">
            <span className="text-[8px] tracking-[0.2em] text-[#00d4ff]/40 font-bold uppercase">System Status</span>
            <div className="flex items-center gap-1">
              <span className="w-1.2 h-1.2 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_6px_#00ff66]" />
              <span className="text-[10px] tracking-widest text-[#00ff66] font-extrabold uppercase">Online</span>
            </div>
          </div>

          {/* Top-Center: Threat Intelligence Feed Line */}
          <div className="absolute top-6 left-[34%] lg:left-[38%] flex flex-col gap-0.5 font-mono select-none">
            <span className="text-[8px] tracking-[0.2em] text-[#00d4ff]/40 font-bold uppercase">Threat Intelligence Feed</span>
            <div className="h-5 w-28 flex items-center justify-center">
              <svg viewBox="0 0 100 30" className="w-full h-full text-[#00d4ff]/45" fill="none" stroke="currentColor" strokeWidth="0.8">
                <path
                  d="M0,15 Q15,5 30,20 T60,10 T90,25 L100,15"
                  strokeDasharray="200"
                  strokeDashoffset="0"
                  className="animate-[flowMove_12s_linear_infinite]"
                />
                <circle cx="30" cy="20" r="1.2" fill="#00d4ff" className="animate-ping" />
                <circle cx="60" cy="10" r="1.2" fill="#00ff66" className="animate-ping" />
              </svg>
            </div>
          </div>

          {/* Center Brand Area: Centered vertically with high premium negative spacing */}
          <div className="flex flex-col items-center justify-center text-center px-4 relative z-10">
            
            {/* Active Neural Energy Field and Radial Blur behind logo */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div 
                className="absolute inset-[-15px] rounded-full opacity-45 pointer-events-none animate-[pulseEnergyGlow_8s_infinite_ease-in-out]"
                style={{
                  background: 'radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(0,85,255,0.08) 60%, transparent 100%)'
                }}
              />
              
              {/* Concentric scan system matching the visual reference precisely */}
              <svg viewBox="0 0 200 200" className="absolute w-[210px] h-[210px] text-[#00d4ff] pointer-events-none select-none z-0">
                <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.12" strokeDasharray="3 3" className="origin-center animate-[spin_60s_linear_infinite]" />
                <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="1 12" className="origin-center animate-[spin_40s_linear_infinite]" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.08" />
                <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="4 6" className="origin-center animate-[spin_25s_linear_infinite_reverse]" />
                <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06" />
                <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06" />
              </svg>

              {/* Passive analysis pulse waves representing AI system energy */}
              <div className="absolute w-24 h-24 rounded-full border border-[#00d4ff]/20 animate-[activePulse_4s_ease-out_infinite]" />
              <div className="absolute w-24 h-24 rounded-full border border-[#00d4ff]/10 animate-[activePulse_4s_ease-out_infinite_2s]" />

              <Image
                src="/logo.png"
                alt="Deceptra Logo"
                width={86}
                height={86}
                className="object-contain brightness-110 contrast-110 drop-shadow-[0_0_18px_rgba(0,212,255,0.4)] select-none z-10"
                priority
              />
            </div>
            
            <h1 
              className="text-[28px] lg:text-[34px] font-black tracking-[0.35em] text-white uppercase mt-4 select-none font-orbitron"
              style={{
                WebkitFontSmoothing: 'antialiased',
              }}
            >
              Deceptra
            </h1>
            
            <p className="text-[8px] sm:text-[9px] text-[#00d4ff]/80 tracking-[0.25em] uppercase mt-2 font-semibold font-orbitron">
              Deception Risk Intelligence System
            </p>

            <div className="mt-5 text-center space-y-1 select-none font-mono text-[9px] sm:text-[10px] tracking-[0.22em] text-white/90">
              <div className="flex justify-center items-center gap-1.5">
                <span className="text-[#00d4ff] font-bold">DETECT.</span>
                <span className="text-[#00d4ff] font-bold">ANALYZE.</span>
                <span className="text-[#00d4ff] font-bold">DECEIVE.</span>
              </div>
              <div className="text-white/60 font-semibold uppercase">Stay Ahead.</div>
            </div>
          </div>

          {/* Middle-Right: Risk Scan Status Widget */}
          <div className="absolute top-[28%] right-6 flex flex-col gap-2 font-mono text-left select-none opacity-85 lg:opacity-100">
            <div className="flex flex-col gap-0.5 border border-[#00d4ff]/10 bg-[#06142e]/15 rounded p-2 backdrop-blur-sm shadow-xl">
              <span className="text-[7.5px] tracking-[0.18em] text-[#00d4ff]/40 font-bold uppercase">Risk Scan</span>
              <span className="text-[8.5px] tracking-widest text-[#00ff66] font-bold uppercase animate-pulse">Active</span>
              <div className="w-16 h-16 mt-1.5 relative flex items-center justify-center overflow-hidden bg-black/10 rounded">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#00d4ff]/25">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.4" />
                  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" />
                  <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" />
                  <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" />
                  <line 
                    x1="50" 
                    y1="50" 
                    x2="50" 
                    y2="5" 
                    stroke="#00d4ff" 
                    strokeWidth="1" 
                    className="origin-bottom animate-[spin_4.5s_linear_infinite]" 
                    style={{ transformOrigin: '50px 50px' }} 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle-Left: Neural Shield Status Widget */}
          <div className="absolute top-[52%] left-6 flex flex-col gap-2 font-mono text-left select-none opacity-85 lg:opacity-100">
            <div className="flex flex-col gap-1 border border-[#00d4ff]/10 bg-[#06142e]/15 rounded p-2.5 backdrop-blur-sm shadow-xl">
              <span className="text-[7.5px] tracking-[0.18em] text-[#00d4ff]/40 font-bold uppercase">Neural Shield</span>
              <span className="text-[8.5px] tracking-widest text-[#00d4ff] font-bold uppercase">Engaged</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="p-0.5 rounded bg-[#00d4ff]/5 border border-[#00d4ff]/20 text-[#00d4ff]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#00d4ff]" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-2 bg-[#00d4ff] rounded-xs" />
                    <span className="w-1 h-2 bg-[#00d4ff] rounded-xs" />
                    <span className="w-1 h-2 bg-[#00d4ff] rounded-xs animate-pulse" />
                    <span className="w-1 h-2 bg-[#00d4ff]/20 rounded-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Area: Holographic concentric perspective scanner floor platform */}
          <div className="absolute bottom-[-10px] left-0 right-0 h-40 overflow-hidden pointer-events-none select-none flex items-end justify-center">
            <div 
              className="absolute bottom-[-90px] w-[500px] h-[180px] rounded-full blur-3xl opacity-[0.12]"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.85) 0%, rgba(0,85,255,0.2) 60%, transparent 100%)'
              }}
            />
            <div className="w-[480px] h-[160px] relative opacity-[0.25] scale-y-[0.35]">
              <svg viewBox="0 0 400 200" className="w-full h-full text-[#00d4ff]">
                <ellipse cx="200" cy="100" rx="180" ry="80" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />
                <ellipse cx="200" cy="100" rx="140" ry="62" fill="none" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
                <ellipse cx="200" cy="100" rx="100" ry="44" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 4" />
                <ellipse cx="200" cy="100" rx="60" ry="26" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" className="animate-pulse" />
                <circle cx="200" cy="100" r="4" fill="#00d4ff" className="animate-ping" />
                <line x1="200" y1="100" x2="20" y2="100" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.15" />
                <line x1="200" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.15" />
                <line x1="200" y1="100" x2="80" y2="50" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.1" />
                <line x1="200" y1="100" x2="320" y2="50" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.1" />
              </svg>
            </div>

            {/* Sparse floating particles */}
            <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none select-none overflow-hidden opacity-[0.2]">
              <div className="absolute bottom-0 left-[20%] w-1.2 h-1.2 bg-[#00d4ff] rounded-full blur-[0.5px] animate-[floatNode_7s_infinite_ease-in]" style={{ animationDelay: '0s' }} />
              <div className="absolute bottom-0 left-[45%] w-1.5 h-1.5 bg-[#00ff66] rounded-full blur-[1px] animate-[floatNode_5.5s_infinite_ease-in]" style={{ animationDelay: '1.8s' }} />
              <div className="absolute bottom-0 left-[75%] w-1.2 h-1.2 bg-[#00d4ff] rounded-full blur-[1.2px] animate-[floatNode_8s_infinite_ease-in]" style={{ animationDelay: '3.5s' }} />
            </div>
          </div>

          {/* Bottom-Left: Technical environment details */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-0.5 font-mono text-left select-none">
            <span className="text-[7px] tracking-[0.18em] text-[#00d4ff]/35 font-bold uppercase">Deceptra Core</span>
            <span className="text-[8px] tracking-wider text-white/35 font-medium">v2.4.7 | SECURE NODE</span>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: CORE SECURE AUTHENTICATION CONSOLE          */}
        {/* ========================================================= */}
        <div className="w-full md:w-[54%] lg:w-[46%] min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 z-10 relative bg-transparent overflow-y-auto">
          
          {/* Right Panel Soft Cyan Back-Spill Light Integration */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none select-none opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 75%)'
            }}
          />

          <div className="w-full max-w-[390px] flex flex-col justify-center my-auto relative z-10">
            
            {/* Mobile Branding Header: Centered layout visible ONLY on mobile */}
            <div className="flex md:hidden flex-col items-center justify-center text-center mb-5 select-none relative z-10">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div 
                  className="absolute inset-[-6px] rounded-full blur-xl opacity-30 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 100%)'
                  }}
                />
                <Image
                  src="/logo.png"
                  alt="Deceptra Logo"
                  width={54}
                  height={54}
                  className="object-contain brightness-110 contrast-110 drop-shadow-[0_0_10px_rgba(0,212,255,0.35)]"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-[0.25em] text-white uppercase mt-2.5 font-orbitron">
                Deceptra
              </h1>
              <p className="text-[8px] text-[#00d4ff]/80 tracking-[0.2em] uppercase mt-1 font-orbitron font-semibold">
                Deception Risk Intelligence System
              </p>
            </div>

            {/* Sleek, Continuous Rounded Glass Console Card matching the primary reference image */}
            <div className="w-full bg-[#030615]/85 backdrop-blur-xl border border-[#00d4ff]/40 rounded-[28px] p-6.5 sm:p-8 relative shadow-[0_0_35px_rgba(0,212,255,0.12)] flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
              
              {/* Top & Bottom Center Bright Neon Spot Highlights */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_#00d4ff,0_0_15px_#00d4ff]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent shadow-[0_0_8px_#00d4ff]" />
              
              {/* Inner subtle glow boundary highlight */}
              <div className="absolute inset-0 rounded-[28px] border border-white/5 pointer-events-none" />

              {/* Header: Branding Identifier */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-[#00d4ff]/5 border border-[#00d4ff]/15">
                  <Image
                    src="/logo.png"
                    alt="Deceptra Mini Logo"
                    width={38}
                    height={38}
                    className="object-contain brightness-105 contrast-105 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)] select-none"
                    priority
                  />
                </div>
                
                <span className="text-[9px] tracking-[0.25em] text-[#00d4ff] font-bold uppercase text-center block mt-2.5 select-none font-orbitron">
                  {pendingVerification ? 'Verify Identity' : 'Initialize Access Node'}
                </span>
                
                <h2 
                  className="text-lg sm:text-[21px] font-extrabold text-white tracking-[0.15em] uppercase text-center mt-0.5 select-none font-orbitron"
                >
                  {pendingVerification ? 'Enter OTP' : 'Create Account'}
                </h2>
                
                <p className="text-[10px] text-[#94a3b8]/75 text-center mt-1 select-none font-medium">
                  {pendingVerification ? 'Enter the security code sent to your email' : 'Set up your deception risk scanner profile'}
                </p>
                
                {/* Premium separation bar with glowing notch */}
                <div className="relative w-full h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/35 to-transparent my-3 flex justify-center items-center select-none">
                  <div className="absolute w-6 h-[2.5px] bg-[#00d4ff] shadow-[0_0_6px_#00d4ff]" />
                </div>
              </div>

              {/* Error/Info Notification */}
              {error && (
                <div className={`text-[11px] p-2.5 rounded-xl flex items-center gap-2 select-none border ${error.includes('Code sent') ? 'bg-green-950/40 border-green-500/30 text-green-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}>
                  <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 shrink-0 ${error.includes('Code sent') ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="font-semibold tracking-wide">{error}</span>
                </div>
              )}

              {/* Account Initialization Form */}
              {!pendingVerification ? (
                <>
                  <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
                    
                    {/* Field: Full Name */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="fullName">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                        <input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          required
                          className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium"
                        />
                      </div>
                    </div>

                    {/* Field: Email */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="email">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium"
                        />
                      </div>
                    </div>

                    {/* Field: Password */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="password">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create secure password"
                          required
                          className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Field: Confirm Password */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="confirmPassword">
                        Confirm Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm secure password"
                          required
                          className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Primary Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative mt-2 group select-none overflow-hidden rounded-xl border border-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-white font-bold tracking-[0.15em] text-[10px] sm:text-xs uppercase py-3 sm:py-3.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,212,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-orbitron"
                    >
                      <span>{loading ? "Creating Profile..." : "Create Secure Profile"}</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-[#00d4ff]" />
                    </button>
                  </form>

                  {/* Splitter Row */}
                  <div className="relative w-full flex items-center justify-center select-none py-0.5 mt-3">
                    <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#1e293b] to-transparent" />
                    <span className="relative px-2.5 text-[8.5px] font-bold text-white/30 bg-[#030615] tracking-[0.18em] font-mono">OR</span>
                  </div>

                  {/* Secondary Button */}
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full relative mt-3 group select-none overflow-hidden rounded-xl border border-[#00d4ff]/35 hover:border-[#00d4ff]/70 bg-transparent text-[#00d4ff] hover:text-white font-bold tracking-[0.12em] text-[9.5px] sm:text-xs uppercase py-3 sm:py-3.5 transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer font-orbitron"
                  >
                    <span>Return to Secure Login</span>
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <form onSubmit={handleVerify} className="flex flex-col space-y-3">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="code">
                      Verification Code
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter the 6-digit code"
                        required
                        className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium tracking-[0.2em]"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] font-medium pt-1 pb-1 px-1">
                    <button type="button" onClick={() => setPendingVerification(false)} className="text-[#94a3b8] hover:text-white transition-colors cursor-pointer">
                      Back to Registration
                    </button>
                    <button type="button" onClick={handleResendCode} className="text-[#00d4ff] hover:text-white transition-colors font-bold cursor-pointer">
                      Resend Code
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative mt-2 group select-none overflow-hidden rounded-xl border border-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-white font-bold tracking-[0.15em] text-[10px] sm:text-xs uppercase py-3 sm:py-3.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,212,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-orbitron"
                  >
                    <span>{loading ? "Verifying..." : "Verify Identity"}</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-[#00d4ff]" />
                  </button>
                </form>
              )}

              {/* Footer Connection Verification - Fully sealed bottom closure inside the rounded card */}
              <div className="flex flex-col items-center justify-center space-y-1 mt-1 pt-3.5 border-t border-[#00d4ff]/10 text-center select-none w-full">
                <div className="flex items-center gap-1 text-[#00d4ff]/50 justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#00ff66]" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                  <span className="text-[8.5px] font-bold tracking-[0.18em] text-[#94a3b8]/75 uppercase font-mono">Encrypted Connection Established</span>
                </div>
                <p className="text-[7.5px] tracking-[0.2em] text-[#94a3b8]/40 uppercase font-mono font-bold">
                  Your Data. Your Shield. Our Priority.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
