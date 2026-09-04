import { motion } from 'framer-motion';
import ThemeToggle from '../../../components/ThemeToggle';

interface NavBarProps {
  onLaunch: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export function NavBar({ onLaunch, theme, toggleTheme }: NavBarProps) {
  return (
    <motion.div className="landing-nav" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.05 }}>
      <div className="landing-nav__inner">
        <button className="landing-nav__mark" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <span className="landing-nav__mark-glyph" />
          AURA <span>Autonomous Utility for Restricted Applications</span>
        </button>
        <nav className="landing-nav__links">
          <a href="#decide">Model routing</a>
          <a href="#agent">Agent loop</a>
          <a href="#read">Multimodal</a>
          <a href="#proof">Offline proof</a>
          <a href="#deliverables">Output</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="btn btn--ghost btn--sm" onClick={onLaunch}>Enter workbench</button>
        </div>
      </div>
    </motion.div>
  );
}

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="wrap landing-footer__inner">
        <div className="landing-footer__mark">AURA</div>
        <div className="landing-footer__meta">
          <span>SIH26117</span>
          <span>Sovereign On-Premise Agentic AI Workbench</span>
          <span>Built for air-gapped deployment</span>
        </div>
      </div>
    </footer>
  );
}
