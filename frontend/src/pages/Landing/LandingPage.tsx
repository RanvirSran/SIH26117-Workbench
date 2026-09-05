import { NoiseOverlay } from './components/Glass';
import { NavBar, Footer } from './sections/Chrome';
import { Hero } from './sections/Hero';
import { Problem } from './sections/Problem';
import { Routing } from './sections/Routing';
import { AgentLoop } from './sections/AgentLoop';
import { Multimodal } from './sections/Multimodal';
import { Airgap, Deliverables, Specs, FinalCTA } from './sections/Proof';
import { useTheme } from '../../hooks/useTheme';
import './landing.css';

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden="true" />
      <NoiseOverlay />
      <NavBar onLaunch={onLaunch} theme={theme} toggleTheme={toggleTheme} />
      <Hero onLaunch={onLaunch} theme={theme} />
      <Problem />
      <Routing />
      <AgentLoop />
      <Multimodal />
      <Airgap />
      <Deliverables />
      <Specs />
      <FinalCTA onLaunch={onLaunch} />
      <Footer />
    </div>
  );
}
