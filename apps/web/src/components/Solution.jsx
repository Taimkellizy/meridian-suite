import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Solution() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.anim-sol-up',
        { y: 50, opacity: 0 },
        { 
          y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: containerRef.current, start: 'top 80%' }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="solution" className="w-full relative px-6 py-24 md:py-48 max-w-7xl mx-auto flex flex-col items-center">
      {/* Top Mask Gradient for fading effect */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none z-10"></div>
      
      <div className="text-center max-w-4xl mx-auto mb-20 relative z-20">
        <h2 className="anim-sol-up font-hero text-5xl md:text-7xl font-medium tracking-tighter text-white leading-[1.05] mb-8">
          Localization shouldn't <br className="hidden md:block"/> hijack your workflow.
        </h2>
        <p className="anim-sol-up font-ui text-[21px] text-slate-400 leading-[1.5] font-medium tracking-tight max-w-3xl mx-auto">
          Implementing i18n usually means polluting your clean components with context providers, complex routing wrappers, and manual switcher state. We surgically implant it instead.
        </p>
      </div>

      <div className="anim-sol-up relative w-full max-w-5xl rounded-[36px] bg-white/[0.015] border border-white/[0.05] p-2 md:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_80px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03),_transparent)] pointer-events-none opacity-50"></div>
        
        <div className="relative bg-black rounded-2xl p-8 md:p-16 flex flex-col items-center border border-white/[0.08] overflow-hidden">
          {/* Fading Abstract Lines */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-16 w-full justify-center relative z-10">
            <div className="w-64 h-32 rounded-xl border border-white/20 bg-white/[0.02] backdrop-blur text-sm font-mono text-white font-bold flex items-center justify-center p-6 text-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              Target Component
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-px h-8 md:h-0 md:w-16 bg-white/40"></div>
              <div className="px-5 py-2.5 bg-white text-black rounded-full font-ui text-sm font-semibold shadow-[0_0_30px_rgba(255,255,255,0.6)] my-4 md:my-0 md:mx-4 z-10 relative">
                AST Engine
                <div className="absolute inset-0 bg-white blur-md rounded-full -z-10 opacity-40"></div>
              </div>
              <div className="w-px h-8 md:h-0 md:w-16 bg-white/40"></div>
            </div>

            <div className="w-64 h-32 rounded-xl border-2 border-white bg-white/10 backdrop-blur text-sm font-mono text-white font-bold flex items-center justify-center p-6 text-center shadow-[0_0_30px_rgba(255,255,255,0.2)] relative">
              <span className="absolute -top-3 -right-3 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-100"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-white shrink-0 items-center justify-center text-black text-[10px]">✨</span>
              </span>
              Injected Output
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Mask Gradient */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#000] via-[#000]/80 to-transparent pointer-events-none z-10"></div>
    </section>
  );
}
