import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function TerminalDemo() {
  const terminalRef = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => {
    // Blinking cursor
    gsap.to(cursorRef.current, {
      opacity: 0,
      repeat: -1,
      yoyo: true,
      duration: 0.5,
      ease: 'steps(1)'
    });

    // The Terminal "Animation" Type in effect
    const lines = terminalRef.current.querySelectorAll('.log-line');
    gsap.set(lines, { opacity: 0 });
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: terminalRef.current,
        start: "top 85%",
      }
    });

    // 1. Typewriter effect on the first command
    tl.fromTo('#typewriter-cmd', 
      { width: 0 },
      { width: '22ch', duration: 1.5, ease: 'steps(22)' }
    );

    // 2. Instant print stagger for the console output
    tl.to(lines, {
      opacity: 1,
      duration: 0.01,
      stagger: 0.15,
      ease: 'none'
    }, "+=0.2");

  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-xl bg-[#030303] border border-white/10 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-left overflow-hidden relative">
      <div className="flex gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-white/20"></div>
        <div className="w-3 h-3 rounded-full bg-white/20"></div>
        <div className="w-3 h-3 rounded-full bg-white/20"></div>
      </div>
      
      <div ref={terminalRef} className="font-mono text-[13px] md:text-sm leading-relaxed">
        <div className="text-slate-500 mb-4 block">
          <span className="text-white font-semibold mr-2">~/meridian $</span> 
          <div className="inline-block overflow-hidden whitespace-nowrap align-bottom" id="typewriter-cmd">
             <span className="text-white">npx @meridian/cli init</span>
          </div>
        </div>
        
        <div className="log-line text-white font-bold mb-1">◆  Meridian AST Injector v2.0</div>
        <div className="log-line text-slate-600 mb-1">│</div>
        
        <div className="log-line text-slate-400 mb-1">
          <span className="text-white">◇</span>  Scanning workspaces... <span className="text-slate-500 ml-2">Found apps/web (React)</span>
        </div>
        <div className="log-line text-slate-600 mb-1">│</div>
        
        <div className="log-line text-slate-400 mb-1">
          <span className="text-white">◇</span>  Where should we inject the language switcher?
        </div>
        <div className="log-line text-slate-500 mb-1">
          │  Target DOM ID <span className="text-white bg-white/10 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,255,255,0.1)]">navbar-container</span>
        </div>
        <div className="log-line text-slate-600 mb-1">│</div>
        
        <div className="log-line text-slate-400 mb-1">
          <span className="text-white">◇</span>  Select insertion mode
        </div>
        <div className="log-line text-slate-500 mb-1">
          │  Mode <span className="text-white bg-white/10 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,255,255,0.1)]">Append</span>
        </div>
        <div className="log-line text-slate-600 mb-1">│</div>

        <div className="log-line text-slate-400 mb-1">
          <span className="text-white">◇</span>  Compiling AST & resolving dependencies...
        </div>
        <div className="log-line text-slate-600 mb-1">│</div>
        
        <div className="log-line text-white mb-6 font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          <span className="text-white">◻</span>  Successfully injected TopNav.jsx mapped to i18n
        </div>

        <div className="mt-2 text-slate-500 flex items-center">
          <span className="text-white font-semibold mr-2">~/meridian</span> $ <span ref={cursorRef} className="ml-2 inline-block w-[8px] h-[16px] bg-white align-middle shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
        </div>
      </div>
    </div>
  );
}
