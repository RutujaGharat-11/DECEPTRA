import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallback() {
  return (
    <div className="min-h-screen w-full bg-[#020308] text-white flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#00d4ff] font-mono tracking-widest text-sm uppercase animate-pulse">Authenticating Neural Identity...</p>
      </div>
      <div className="hidden">
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  )
}
