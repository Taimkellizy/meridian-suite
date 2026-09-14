import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function WorkflowFilmstrip() {
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  useLayoutEffect(() => {
    // using gsap.context protects against React 18 strict mode double-firing
    let ctx = gsap.context(() => {
      const track = trackRef.current;
      
      const getScrollAmount = () => {
        return track.scrollWidth - window.innerWidth;
      };

      const tl = gsap.timeline();
      
      tl.to(track, {
        x: () => -getScrollAmount(),
        ease: "none"
      }, 0);

      tl.to('.beam', {
        width: '100%',
        ease: "none"
      }, 0);

      gsap.fromTo('.anim-film-up',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: containerRef.current, start: "top 70%" } }
      );

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "center center",
        end: () => `+=${getScrollAmount()}`,
        pin: true,
        animation: tl,
        scrub: 1,
        invalidateOnRefresh: true,
      });

      const cards = track.querySelectorAll('.film-card');
      cards.forEach((card) => {
        gsap.fromTo(card, 
          { opacity: 0.3, scale: 0.95, borderColor: "rgba(255,255,255,0.08)" },
          {
            opacity: 1,
            scale: 1.02,
            borderColor: "rgba(255,255,255,0.4)",
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: tl,
              start: "left center+=30%",
              end: "right center-=30%",
              toggleActions: "play reverse play reverse",
            }
          }
        );
      });

    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} id="how-it-works" className="w-full h-screen bg-[#000] border-y border-white/5 relative z-10 overflow-hidden flex flex-col justify-center">
      <div className="anim-film-up absolute top-24 w-full px-8 md:text-center max-w-6xl mx-auto left-0 right-0 z-20 pointer-events-none">
        <h2 className="font-hero text-5xl md:text-6xl font-medium tracking-tighter text-white">The Injection Workflow.</h2>
      </div>
      
      <div ref={trackRef} className="flex gap-12 md:gap-24 px-8 items-center h-[500px] min-w-max relative">
        {/* Background Global Track Line */}
        <div className="absolute top-1/2 left-0 h-[2px] w-[3000px] bg-white/[0.03] -translate-y-1/2 -z-10">
           <div className="beam h-full bg-white w-0 shadow-[0_0_20px_rgba(255,255,255,0.8)] relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,1)]"></div>
           </div>
        </div>

        {/* Increased start spacer */}
        <div className="w-8 md:w-96 pl-12 shrinks-0 z-10 shrink-0"></div>

        <div className="film-card flex flex-col w-72 md:w-[450px] p-8 md:p-12 border border-white/[0.08] bg-[#050505] rounded-[36px] h-[360px] justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_60px_rgba(0,0,0,0.8)] z-10">
          <div className="text-white font-mono text-xl mb-4 opacity-50 tracking-widest font-bold">01.</div>
          <h3 className="font-hero text-4xl font-semibold text-white mb-4 tracking-tight">Initialize</h3>
          <p className="font-ui text-slate-400 text-lg font-medium leading-[1.6]">Run the meridian init command to launch the interactive setup directly in your monorepo.</p>
        </div>

        <div className="w-16 h-[2px] relative z-10 opacity-0"></div>
        
        <div className="film-card flex flex-col w-72 md:w-[450px] p-8 md:p-12 border border-white/[0.08] bg-[#050505] rounded-[36px] h-[360px] justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_60px_rgba(0,0,0,0.8)] z-10">
          <div className="text-white font-mono text-xl mb-4 opacity-50 tracking-widest font-bold">02.</div>
          <h3 className="font-hero text-4xl font-semibold text-white mb-4 tracking-tight">Select Target</h3>
          <p className="font-ui text-slate-400 text-lg font-medium leading-[1.6]">Meridian scans your codebase and lets you pick the DOM ID or component to attach the switcher to.</p>
        </div>

        <div className="w-16 h-[2px] relative z-10 opacity-0"></div>

        <div className="film-card flex flex-col w-72 md:w-[450px] p-8 md:p-12 border border-white/[0.08] bg-[#050505] rounded-[36px] h-[360px] justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_60px_rgba(0,0,0,0.8)] z-10">
          <div className="text-white font-mono text-xl mb-4 opacity-50 tracking-widest font-bold">03.</div>
          <h3 className="font-hero text-4xl font-semibold text-white mb-4 tracking-tight">AST Injection</h3>
          <p className="font-ui text-slate-400 text-lg font-medium leading-[1.6]">The engine safely parses your layout, drops the component imports, and wires up the routing.</p>
        </div>
        
        <div className="w-16 md:w-96"></div>
      </div>
    </div>
  );
}
