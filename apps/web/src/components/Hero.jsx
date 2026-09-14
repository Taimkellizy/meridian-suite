import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useMousePosition } from '../hooks/useMousePosition';

export default function Hero() {
  const containerRef = useRef(null);
  const headlineRef = useRef(null);
  const mousePos = useMousePosition();

  useEffect(() => {
    // Animate the hardcoded span wrapper words
    gsap.to('.hero-word', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.04,
      ease: "power3.out",
      delay: 0.2
    });

    const otherElements = containerRef.current.querySelectorAll('.unveil-item');
    gsap.fromTo(otherElements, 
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power4.out", delay: 0.6 }
    );
  }, []);

  return (
    <section ref={containerRef} className="relative w-full flex-col flex items-center justify-center min-h-[85vh] pt-32 pb-16 px-4 text-center overflow-hidden">
      
      {/* Absolute Ambient Background (Framer-like subtle blurs) */}
      <div 
        className="absolute top-[20%] left-[20%] w-[30rem] h-[30rem] bg-white opacity-[0.015] blur-[100px] rounded-full pointer-events-none"
        style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}
      ></div>
      <div 
        className="absolute bottom-[20%] right-[15%] w-[40rem] h-[40rem] bg-white opacity-[0.01] blur-[120px] rounded-full pointer-events-none"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
      ></div>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col items-center">
        
        {/* Top Pill Badge */}
        <div className="unveil-item inline-flex items-center gap-2 px-3 py-1 mb-10 rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-md text-[13px] text-slate-300 font-medium tracking-wide shadow-sm hover:bg-white/[0.04] transition-colors cursor-pointer cursor-reactive">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          Introducing Meridian Engine 2.0
          <svg className="w-3.5 h-3.5 ml-1 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
        
        {/* Massive Headline */}
        <h1 ref={headlineRef} className="font-hero text-6xl md:text-[5.5rem] lg:text-[7.5rem] tracking-tighter font-medium mb-8 text-white leading-[0.95] max-w-[1100px] mx-auto" style={{ WebkitFontSmoothing: 'antialiased' }}>
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">The</span>{' '}
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">site</span>{' '}
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">translator</span>
          <br className="hidden md:block"/>
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">trusted</span>{' '}
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">by</span>{' '}
          <span className="hero-word inline-block whitespace-nowrap opacity-0 translate-y-4">engineers</span>
        </h1>
        
        {/* Subdued Subheadline */}
        <p className="unveil-item font-ui text-lg md:text-[22px] text-slate-400 max-w-2xl mx-auto mb-12 leading-[1.4] font-medium tracking-tight">
          Inject professional language routing and dynamic switchers directly into your AST with a single command. Full design freedom.
        </p>
        
        {/* Action Buttons */}
        <div className="unveil-item flex flex-row gap-4 items-center justify-center">
          <button className="font-ui font-semibold text-[15px] tracking-wide text-black bg-white hover:bg-slate-200 transition-colors px-6 py-3 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95 duration-200 flex items-center gap-2">
            Start for free
          </button>
          <button className="font-ui font-medium text-[15px] tracking-wide text-white bg-transparent hover:bg-white/[0.05] border border-white/[0.1] transition-colors px-6 py-3 rounded-full active:scale-95 duration-200">
            Read Docs
          </button>
        </div>
      </div>
    </section>
  );
}
