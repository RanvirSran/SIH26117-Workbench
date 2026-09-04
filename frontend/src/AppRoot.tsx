import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/Landing/LandingPage';
import App from './App';

const viewVariants = {
  initial: { opacity: 0, scale: 0.99 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 1.01, transition: { duration: 0.4, ease: [0.4, 0, 1, 1] } },
};

export default function AppRoot() {
  const [view, setView] = useState<'landing' | 'workbench'>('landing');

  return (
    <AnimatePresence mode="wait">
      {view === 'workbench' ? (
        <motion.div key="workbench" variants={viewVariants} initial="initial" animate="animate" exit="exit">
          <App onGoHome={() => setView('landing')} />
        </motion.div>
      ) : (
        <motion.div key="landing" variants={viewVariants} initial="initial" animate="animate" exit="exit">
          <LandingPage onLaunch={() => setView('workbench')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
