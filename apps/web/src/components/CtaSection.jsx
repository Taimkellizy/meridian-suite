import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CtaSection() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.anim-up-cta',
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: containerRef.current, start: 'top 85%' }
        }
      );

      // Master Scrub Timeline for CTA
      const scrubTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 90%',
          end: 'bottom bottom', // Finishes exactly when reaching the absolute bottom limit of the page
          scrub: 1.5
        }
      });

      // Letter sweep glow effect mapped to scroll
      gsap.set('.glow-letter', { textShadow: "0 0 8px rgba(255,255,255,0.15)" });

      scrubTl.to('.glow-letter', {
        textShadow: "0 0 15px rgba(255,255,255,0.6)", // Much softer peak
        duration: 0.5,
        stagger: {
          each: 0.1,
          yoyo: true,
          repeat: 1
        },
        ease: 'power2.inOut'
      }, 0);

      // Slanted linear sweep mapped to scroll
      scrubTl.fromTo('.border-shine-sweep', 
        { xPercent: -200, skewX: -45 },
        { xPercent: 350, skewX: -45, ease: 'none', duration: scrubTl.recent().duration() },
        0
      );

      // Smooth GPU-accelerated expansion mapping (Replacing letterSpacing layout thrashing)
      scrubTl.fromTo('#cta-text',
        { scale: 0.95, y: 15 },
        { scale: 1, y: 0, ease: 'none', duration: scrubTl.recent().duration() },
        0
      );

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="w-full relative">
      {/* Top Mask */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#000] to-transparent pointer-events-none z-10"></div>
      
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-48">
        
        {/* Magic Edge Shine Container */}
        <div className="relative rounded-[48px] p-[1px] overflow-hidden group">
          
          {/* Diagonal Slanted Linear Sweep (Now controlled by GSAP scrub layer) */}
          <div 
            className="border-shine-sweep absolute top-0 bottom-0 w-[50%] blur-[8px] opacity-100 pointer-events-none"
            style={{ 
              background: 'linear-gradient(to right, transparent, #ffffff, transparent)'
            }}
          ></div>
          
          {/* Inner Content Block */}
          <div className="relative border border-white/[0.04] bg-[#030303] rounded-[47px] p-12 md:p-32 text-center overflow-hidden flex flex-col items-center z-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <h2 id="cta-text" className="anim-up-cta font-hero text-5xl md:text-7xl font-medium tracking-tighter text-white mb-6 relative z-10 leading-[1.05]">
              {"Ready to inject precision?".split('').map((char, i) => (
                <span key={i} className="glow-letter inline-block">{char === ' ' ? '\u00A0' : char}</span>
              ))}
            </h2>
            <p className="anim-up-cta font-ui text-[20px] text-slate-400 max-w-2xl mb-12 relative z-10 font-medium tracking-tight leading-[1.6]">
              Join the open source movement. Meridian is free, transparent, and built for developers who care about clean architecture.
            </p>
            
            <div className="anim-up-cta flex flex-col sm:flex-row gap-4 relative z-10">
              <button className="font-ui font-semibold text-[15px] text-black bg-white hover:bg-slate-200 hover:tracking-wide transition-all duration-300 px-8 py-3.5 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] tracking-tight">
                Start using Meridian
              </button>
              
              <a href="https://github.com/meridian-suite" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 font-ui font-semibold text-[15px] text-white bg-transparent hover:bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:tracking-wide px-8 py-3.5 rounded-full tracking-tight">
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
