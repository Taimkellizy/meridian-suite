import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TerminalDemo from './TerminalDemo';

gsap.registerPlugin(ScrollTrigger);

export default function CodeExample() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.anim-up',
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: containerRef.current, start: 'top 80%' }
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="w-full relative max-w-6xl mx-auto px-6 pb-24 md:pb-48 pt-12">
      <div className="text-center mb-20 max-w-3xl mx-auto anim-up">
        <h2 className="font-hero text-5xl md:text-6xl font-medium tracking-tighter text-white">See it in action.</h2>
      </div>

      <div className="flex flex-col max-w-4xl mx-auto anim-up">
        <div className="relative rounded-3xl bg-black border border-white/[0.05] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_10px_40px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <div className="p-2 md:p-8 rounded-2xl bg-[#030407] border border-white/[0.03]">
            <TerminalDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
