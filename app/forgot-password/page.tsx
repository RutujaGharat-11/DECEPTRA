'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import Image from 'next/image';
import { Orbitron } from 'next/font/google';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { userId } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      router.replace('/');
    }
  }, [userId, router]);

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Unable to request password reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Password reset incomplete');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Unable to reset password. Check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setError('Code sent! Check your inbox.');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Unable to resend code');
    }
  };

  return (
    <div className={`min-h-screen w-full bg-[#020308] text-white flex overflow-hidden relative ${orbitron.variable} font-sans`}>
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

      {/* Layer 1 & 2 */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient(circle at 30% 40%, #030818 0%, #020308 100%)" />
        <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-20 animate-[volumetricFog_25s_infinite_ease-in-out]" style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, rgba(0, 85, 255, 0.05) 50%, transparent 100%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full opacity-15 animate-[volumetricFog_32s_infinite_ease-in-out_2s]" style={{ background: 'radial-gradient(circle, rgba(0, 255, 102, 0.08) 0%, rgba(0, 212, 255, 0.03) 60%, transparent 100%)', filter: 'blur(50px)' }} />
      </div>

      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.02] animate-[gridScroll_40s_linear_infinite] z-1" style={{ backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="min-h-screen w-full flex flex-col md:flex-row relative z-10">
        
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden md:flex md:w-[46%] lg:w-[54%] relative flex-col justify-center items-center overflow-hidden border-r border-[#1e3a8a]/15 bg-transparent select-none">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none w-full h-full scale-[1.05] z-0">
            <svg viewBox="0 0 800 450" className="w-full h-full text-[#00d4ff]" fill="currentColor">
              <path d="M100,80 L220,100 L290,140 L180,240 L100,80 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" fill="none" />
              <path d="M290,140 L380,110 L440,160 L350,210 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" fill="none" />
              <path d="M440,160 L560,90 L620,200 L500,230 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" fill="none" />
              <path d="M220,100 L350,210 L500,230 L180,240 Z" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.15" fill="none" />
              <path d="M380,110 L560,90" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="3 3" />
              <path d="M290,140 L500,230" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="2 2" />
              <circle cx="400" cy="225" r="280" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="6 6" />
              <line x1="400" y1="225" x2="680" y2="225" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.25" className="origin-[400px_225px] animate-[radarSweep_28s_linear_infinite]" />
            </svg>
          </div>

          <div className="flex flex-col items-center justify-center text-center px-4 relative z-10">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-[-15px] rounded-full opacity-45 pointer-events-none animate-[pulseEnergyGlow_8s_infinite_ease-in-out]" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(0,85,255,0.08) 60%, transparent 100%)' }} />
              <svg viewBox="0 0 200 200" className="absolute w-[210px] h-[210px] text-[#00d4ff] pointer-events-none select-none z-0">
                <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.12" strokeDasharray="3 3" className="origin-center animate-[spin_60s_linear_infinite]" />
                <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="1 12" className="origin-center animate-[spin_40s_linear_infinite]" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.08" />
                <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="4 6" className="origin-center animate-[spin_25s_linear_infinite_reverse]" />
                <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06" />
                <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06" />
              </svg>
              <div className="absolute w-24 h-24 rounded-full border border-[#00d4ff]/20 animate-[activePulse_4s_ease-out_infinite]" />
              <Image src="/logo.png" alt="Deceptra Logo" width={86} height={86} className="object-contain brightness-110 contrast-110 drop-shadow-[0_0_18px_rgba(0,212,255,0.4)] select-none z-10" priority />
            </div>
            
            <h1 className="text-[28px] lg:text-[34px] font-black tracking-[0.35em] text-white uppercase mt-4 select-none font-orbitron">Deceptra</h1>
            <p className="text-[8px] sm:text-[9px] text-[#00d4ff]/80 tracking-[0.25em] uppercase mt-2 font-semibold font-orbitron">Deception Risk Intelligence System</p>
          </div>
        </div>

        {/* Right Panel - Auth Core */}
        <div className="w-full md:w-[54%] lg:w-[46%] min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 z-10 relative bg-transparent overflow-y-auto">
          <div className="absolute inset-0 z-0 pointer-events-none select-none opacity-40" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 75%)' }} />

          <div className="w-full max-w-[390px] flex flex-col justify-center my-auto relative z-10">
            
            {/* Mobile Header */}
            <div className="flex md:hidden flex-col items-center justify-center text-center mb-5 select-none relative z-10">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <Image src="/logo.png" alt="Deceptra Logo" width={54} height={54} className="object-contain brightness-110 contrast-110" />
              </div>
              <h1 className="text-2xl font-bold tracking-[0.25em] text-white uppercase mt-2.5 font-orbitron">Deceptra</h1>
            </div>

            <div className="w-full bg-[#030615]/85 backdrop-blur-xl border border-[#00d4ff]/40 rounded-[28px] p-6.5 sm:p-8 relative shadow-[0_0_35px_rgba(0,212,255,0.12)] flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_#00d4ff,0_0_15px_#00d4ff]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent shadow-[0_0_8px_#00d4ff]" />
              <div className="absolute inset-0 rounded-[28px] border border-white/5 pointer-events-none" />

              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-[#00d4ff]/5 border border-[#00d4ff]/15">
                  <ShieldAlert className="w-6 h-6 text-[#00d4ff]" />
                </div>
                
                <span className="text-[9px] tracking-[0.25em] text-[#00d4ff] font-bold uppercase text-center block mt-2.5 select-none font-orbitron">
                  {successfulCreation ? 'Secure Recovery' : 'Identity Recovery'}
                </span>
                
                <h2 className="text-lg sm:text-[21px] font-extrabold text-white tracking-[0.15em] uppercase text-center mt-0.5 select-none font-orbitron">
                  {successfulCreation ? 'Enter Code' : 'Reset Password'}
                </h2>
                
                <p className="text-[10px] text-[#94a3b8]/75 text-center mt-1 select-none font-medium">
                  {successfulCreation ? 'Provide the secure code sent to your email and your new password' : 'Enter your registered email to receive a recovery code'}
                </p>
                
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

              {!successfulCreation ? (
                <>
                  <form onSubmit={handleRequestCode} className="flex flex-col space-y-3">
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

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative mt-2 group select-none overflow-hidden rounded-xl border border-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-white font-bold tracking-[0.15em] text-[10px] sm:text-xs uppercase py-3 sm:py-3.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,212,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-orbitron"
                    >
                      <span>{loading ? "Requesting..." : "Request Reset Code"}</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-[#00d4ff]" />
                    </button>
                  </form>
                  
                  <div className="relative w-full flex items-center justify-center select-none py-0.5 mt-2">
                    <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#1e293b] to-transparent" />
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full relative mt-2 group select-none overflow-hidden rounded-xl border border-[#00d4ff]/35 hover:border-[#00d4ff]/70 bg-transparent text-[#00d4ff] hover:text-white font-bold tracking-[0.12em] text-[9.5px] sm:text-xs uppercase py-3 sm:py-3.5 transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer font-orbitron"
                  >
                    <span>Return to Secure Login</span>
                  </button>
                </>
              ) : (
                <form onSubmit={handleResetPassword} className="flex flex-col space-y-3">
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
                        placeholder="Enter 6-digit code"
                        required
                        className="w-full bg-[#030615]/95 border border-[#1e293b] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/50 text-white rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[11px] sm:text-xs transition-all placeholder:text-white/20 outline-none shadow-[0_0_8px_rgba(0,0,0,0.6)] font-medium tracking-[0.2em]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#94a3b8]/85 uppercase select-none" htmlFor="password">
                      New Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 w-3.5 h-3.5 text-[#00d4ff]/50 pointer-events-none" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
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

                  <div className="flex justify-between items-center text-[10px] font-medium pt-1 pb-1 px-1">
                    <button type="button" onClick={() => setSuccessfulCreation(false)} className="text-[#94a3b8] hover:text-white transition-colors cursor-pointer">
                      Change Email
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
                    <span>{loading ? "Resetting..." : "Confirm Password Reset"}</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-[#00d4ff]" />
                  </button>
                </form>
              )}

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
