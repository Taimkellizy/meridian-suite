import React from 'react';

export default function TopNav() {
  return (
    <div className="fixed top-0 w-full z-50 flex justify-center mt-5 px-4 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-between px-5 py-2.5 bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-full w-full max-w-3xl relative overflow-hidden transition-all duration-300 hover:bg-black/60 hover:border-white/[0.12]">
        
        {/* Subtle top edge glare */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
        
        <div className="flex items-center gap-2">
          {/* Logo icon */}
          <img src="/assets/icon-white.svg" alt="Meridian Icon" className="h-7 w-7 ml-1" />
          <span className="font-ui font-semibold text-white tracking-tight text-[15px] hidden md:block">Meridian</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-ui text-[14px] font-medium text-slate-300">
          <a href="#solution" className="hover:text-white transition-colors duration-200">Solution</a>
          <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200">Developers</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="https://github.com/meridian-suite" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          </a>
          <button className="text-[13px] font-bold tracking-wide text-black bg-white hover:bg-slate-200 transition-colors px-4 py-1.5 rounded-full filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            Log in
          </button>
        </div>
      </nav>
    </div>
  );
}
