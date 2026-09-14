import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- Grid Sub-components --- //

function LogicalBlueprint() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center bg-[#050505] rounded-xl border border-white/10 p-6 relative overflow-hidden font-mono text-[13px] leading-relaxed shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
      <div className="text-slate-400 w-full text-left">
        <div><span className="text-white font-bold">.header</span> {'{'}</div>
        <div className="pl-4 relative flex items-center">
          <span className="text-slate-600 relative">
            padding-left: 2rem;
            {/* White strike-through */}
            <span className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-400 -translate-y-1/2 rotate-[-2deg]"></span>
          </span>
        </div>
        <div className="pl-4 mt-2 font-semibold">
          <span className="text-white">padding-inline-start:</span> <span className="text-slate-300">2rem;</span>
        </div>
        <div>{'}'}</div>
      </div>
    </div>
  );
}

function LanguageMatrix() {
  const flags = Array.from({ length: 48 }); // 8x6 grid
  return (
    <div className="w-full h-full flex flex-col items-center justify-center pt-8">
      <div className="mb-6 px-3 py-1 bg-white/5 border border-white/20 text-white text-[10px] uppercase tracking-widest rounded-full font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
        100% Translated
      </div>
      <div className="grid grid-cols-8 gap-2 opacity-60">
        {flags.map((_, i) => (
          <div key={i} className="w-4 h-3 bg-white/20 rounded-[2px] shadow-[inset_0_1px_rgba(255,255,255,0.3)]"></div>
        ))}
      </div>
    </div>
  );
}

function ASTExtraction() {
  return (
    <div className="w-full h-full flex items-center justify-center relative min-h-[200px]">
      {/* Component Box */}
      <div className="absolute left-4 w-32 h-32 border border-white/20 bg-black rounded-xl flex flex-col p-3 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="w-12 h-2 bg-white/40 rounded mb-4"></div>
        <div className="w-full h-4 bg-white/10 rounded border border-white/30 mb-2 flex items-center px-1">
          <span className="text-[8px] font-mono text-white">"Submit"</span>
        </div>
        <div className="w-3/4 h-4 bg-white/10 rounded border border-white/30 flex items-center px-1">
          <span className="text-[8px] font-mono text-white">"Cancel"</span>
        </div>
      </div>

      {/* SVG Connecting Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <path d="M 100 100 C 150 100, 180 60, 220 60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
        <path d="M 100 120 C 140 120, 180 80, 220 80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
      </svg>
      <style>{`@keyframes dash { to { stroke-dashoffset: -100; } }`}</style>

      {/* JSON Box */}
      <div className="absolute right-4 top-8 w-28 h-24 border border-white/40 bg-white/5 rounded-lg flex flex-col justify-center p-3 z-10 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md">
        <span className="text-white font-bold font-mono text-[10px] mb-1">en.json</span>
        <div className="text-[8px] font-mono text-slate-300">
          <div>"submit": "Submit",</div>
          <div>"cancel": "Cancel"</div>
        </div>
      </div>
    </div>
  );
}

function RTLMirror() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="relative w-full max-w-[280px] h-32 flex">
        {/* LTR Side */}
        <div className="w-1/2 h-full border-r border-white/20 bg-white/[0.02] rounded-l-xl p-4 flex flex-col justify-center">
          <div className="text-[9px] font-mono text-slate-400 mb-2 font-bold tracking-wider">LTR</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800"></div>
            <div className="flex-1 h-2 bg-slate-800 rounded"></div>
          </div>
        </div>
        
        {/* Mirror Line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-gradient-to-b from-transparent via-white/80 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-white text-black font-bold flex items-center justify-center text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          ↔
        </div>

        {/* RTL Side */}
        <div className="w-1/2 h-full bg-white/[0.08] rounded-r-xl p-4 flex flex-col justify-center items-end text-right">
          <div className="text-[9px] font-mono text-white mb-2 pr-1 font-bold tracking-wider">RTL</div>
          <div className="flex items-center gap-2 flex-row-reverse w-full">
            <div className="w-6 h-6 rounded border border-white bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>
            <div className="flex-1 h-2 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinterShield() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-[#020202]">
      <div className="relative font-mono text-[12px] text-slate-400 whitespace-nowrap bg-black p-4 rounded-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <span className="text-white font-bold">const</span> dir = <span className="text-white font-bold">await</span> getDir();
        
        {/* Underline */}
        <div className="absolute bottom-3 left-10 right-4 h-0.5 bg-white/80 rounded pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>

        {/* Tooltip */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black font-bold border border-white text-[9px] px-3 py-1.5 rounded flex items-center gap-2 shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
          MERIDIAN_ERR: MISSING_RTL_LOGIC
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-black/10 rotate-45"></div>
        </div>
      </div>
    </div>
  );
}

function PerformanceChip() {
  return (
    <div className="w-full h-full flex flex-col justify-center text-center px-4">
      <div className="font-hero font-bold tracking-tighter text-6xl text-white mb-2 leading-none drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
        &lt;2<span className="text-slate-400 text-4xl">ms</span>
      </div>
      <div className="font-mono text-[9px] text-slate-400 font-bold tracking-[0.15em] uppercase break-words">
        Translation_Lookup
      </div>
    </div>
  );
}

// --- Main Grid Data --- //

const FEATURES = [
  {
    title: "Logical Blueprint",
    description: "Converts physical CSS directions into logical inline/block properties.",
    height: "22rem",
    Visual: LogicalBlueprint
  },
  {
    title: "Language Matrix",
    description: "Manages hundreds of locales with guaranteed type safety.",
    height: "18rem",
    Visual: LanguageMatrix
  },
  {
    title: "AST Extraction",
    description: "Traverses components to automatically pull out hardcoded strings.",
    height: "24rem",
    Visual: ASTExtraction
  },
  {
    title: "Performance Chip",
    description: "Bypass React Context. Direct dictionary lookups for extreme speed.",
    height: "16rem",
    Visual: PerformanceChip
  },
  {
    title: "RTL Mirror",
    description: "Automatic bidirectional flip mappings across your entire UI.",
    height: "20rem",
    Visual: RTLMirror
  },
  {
    title: "Linter Shield",
    description: "Real-time editor feedback catches hardcoded un-localized strings.",
    height: "18rem",
    Visual: LinterShield
  }
];

export default function MasonryGallery() {
  const gridRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const cards = gridRef.current.querySelectorAll('.feature-card');
      
      gsap.fromTo(cards, 
        { scale: 0.95, opacity: 0, y: 40 },
        {
          scale: 1, 
          opacity: 1, 
          y: 0,
          duration: 0.8,
          stagger: 0.05,
          ease: "power4.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
          }
        }
      );

      // Removed skew animation to prevent column overflow breakdown
    }, gridRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e) => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.feature-card');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  };

  return (
    <section id="features" onMouseMove={handleMouseMove} className="group/grid w-full px-6 md:px-12 pb-24 md:pb-40 pt-16 overflow-hidden max-w-[1400px] mx-auto">
      <div className="flex flex-col items-center text-center mb-20 max-w-3xl mx-auto">
        <h2 className="font-hero text-5xl md:text-6xl font-medium text-white tracking-tighter leading-tight mb-6">Packed perfectly.<br /> Master localization.</h2>
        <p className="font-ui text-xl text-slate-400 font-medium tracking-tight">Everything you need to master localization seamlessly injected in a single high-performance library.</p>
      </div>
      
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 auto-rows-[420px]">
        {FEATURES.map((feat, i) => {
          let spanClass = "col-span-1";
          if (i === 0 || i === 3 || i === 4) spanClass = "md:col-span-2 lg:col-span-2";
          
          return (
            <div 
              key={i} 
              className={`feature-card flex flex-col w-full relative p-[1px] rounded-[32px] bg-white/[0.015] border border-white/[0.12] transition-all duration-300 overflow-hidden ${spanClass}`}
              style={{ boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)" }}
            >
              {/* Spotlight Overlay */}
              <div 
                className="pointer-events-none absolute -inset-px opacity-0 group-hover/grid:opacity-100 transition duration-300 z-30 mix-blend-overlay"
                style={{
                  background: `radial-gradient(800px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.25), transparent 40%)`
                }}
              />

              <div className="relative w-full h-full flex flex-col bg-black rounded-[31px] overflow-hidden z-20">
                {/* Top Visual Component */}
                <div className="flex-1 w-full bg-[#030303] rounded-t-[31px] rounded-b-2xl overflow-hidden flex items-center justify-center relative border-b border-white/[0.03]">
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <feat.Visual />
                  </div>
                </div>

                {/* Text Payload */}
                <div className="relative z-20 px-8 py-8 shrink-0 text-left bg-black">
                  <h3 className="font-hero text-[22px] font-semibold mb-2 text-white tracking-tight relative z-10">{feat.title}</h3>
                  <p className="font-ui text-[15px] text-slate-400 leading-relaxed font-medium tracking-tight max-w-sm relative z-10">{feat.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
