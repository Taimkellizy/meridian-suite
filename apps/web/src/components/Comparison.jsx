import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Comparison() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.anim-comp-up',
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
    <section ref={containerRef} id="comparison" className="w-full relative max-w-[1400px] mx-auto px-6 py-24 md:py-40">
      {/* Top Mask */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#000] to-transparent pointer-events-none z-10"></div>
      
      <div className="text-center mb-24 max-w-4xl mx-auto relative z-20">
        <h2 className="anim-comp-up font-hero text-5xl md:text-6xl font-medium text-white tracking-tighter leading-tight">State of the art simplicity.</h2>
        <p className="anim-comp-up font-ui mt-6 text-xl text-slate-400 font-medium tracking-tight">See exactly how Meridian reduces your boilerplate and respects your source of truth.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-20">
        
        {/* The Old Way */}
        <div className="anim-comp-up flex flex-col border border-white/5 bg-white/[0.01] rounded-3xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <span className="font-ui text-sm text-slate-500 font-medium">Traditional Boilerplate</span>
            <span className="font-mono text-xs text-slate-500">Manual Wiring</span>
          </div>
          <div className="p-8 font-mono text-sm leading-loose overflow-x-auto text-slate-400">
<pre><code>{`import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  const changeLang = (lang) => {
    router.push(router.pathname, router.asPath, { locale: lang });
    setIsOpen(false);
  };

  return (
    <header>
      <Logo />
      {/* Dozens of lines for custom dropdown... */}
      <div className="dropdown">
        <button onClick={() => setIsOpen(!isOpen)}>
          {router.locale.toUpperCase()}
        </button>
        {isOpen && (
          <ul>
            <li onClick={() => changeLang('en')}>EN</li>
            <li onClick={() => changeLang('es')}>ES</li>
          </ul>
        )}
      </div>
    </header>
  );
}`}</code></pre>
          </div>
        </div>

        {/* The Meridian Way */}
        <div className="anim-comp-up flex flex-col border border-white/20 bg-white/5 rounded-3xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="px-6 py-5 border-b border-white/10 bg-white/[0.05] flex justify-between items-center">
            <span className="font-ui text-sm text-white font-semibold">With Meridian</span>
            <span className="font-mono text-xs text-white">AST Injected</span>
          </div>
          <div className="p-8 font-mono text-sm leading-loose overflow-x-auto text-slate-200">
<pre><code>{`import { MeridianSwitcher } from '@meridian-suite/react';

export default function Header() {
  return (
    <header>
      <Logo />
      
      {/* Handled perfectly via CLI injection */}
      <MeridianSwitcher theme="studio" align="right" />
      
    </header>
  );
}`}</code></pre>
          </div>
        </div>

      </div>
    </section>
  );
}
