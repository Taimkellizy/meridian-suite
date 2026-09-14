import TopNav from './components/TopNav'
import Hero from './components/Hero'
import Solution from './components/Solution'
import MasonryGallery from './components/MasonryGallery'
import WorkflowFilmstrip from './components/WorkflowFilmstrip'
import Comparison from './components/Comparison'
import CodeExample from './components/CodeExample'
import CtaSection from './components/CtaSection'

function App() {
  return (
    <main className="bg-black min-h-screen text-slate-100 selection:bg-white selection:text-black font-ui overflow-x-hidden">
      
      <TopNav />

      <div className="block w-full">
        <Hero />
        
        <Solution />
        
        <MasonryGallery />

        <WorkflowFilmstrip />
        
        <Comparison />

        <CodeExample />
        
        <CtaSection />
      </div>
      
      {/* Mega Footer */}
      <footer className="w-full bg-black border-t border-white/[0.05] pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-16 mb-20">
          <div className="flex flex-col shrink-0 items-start max-w-xs">
            <img src="/assets/full-white.svg" alt="Meridian Full Logo" className="h-20 w-auto mb-6 opacity-90" />
            <p className="font-ui text-[14px] text-slate-400 leading-relaxed font-medium">
              The invisible craftsman for modern localization. Zero boilerplate. Absolute precision.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full text-[13px] font-ui">
            <div className="flex flex-col gap-3.5">
              <span className="text-white font-semibold mb-1">Product</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Features</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Integrations</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Pricing</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Changelog</a>
            </div>
            
            <div className="flex flex-col gap-3.5">
              <span className="text-white font-semibold mb-1">Developers</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Documentation</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">API Reference</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">GitHub</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">NPM Package</a>
            </div>

            <div className="flex flex-col gap-3.5">
              <span className="text-white font-semibold mb-1">Resources</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Blog</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Community</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Guides</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Help Center</a>
            </div>

            <div className="flex flex-col gap-3.5">
              <span className="text-white font-semibold mb-1">Company</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">About</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Careers</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Legal</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Contact</a>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/[0.05] pt-8">
          <p className="font-ui text-[13px] text-slate-500">© 2026 Meridian Suite. All rights reserved.</p>
          <div className="flex items-center gap-3 mt-4 md:mt-0 px-3 py-1.5 rounded-full border border-white/[0.05] bg-white/[0.01]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">All systems operational</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default App
