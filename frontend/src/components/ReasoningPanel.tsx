import { useEffect, useState } from 'react';
import { mockReasoningSteps } from '../data/mockData';

interface ReasoningPanelProps {
  steps?: string[];
}

export default function ReasoningPanel({ steps }: ReasoningPanelProps) {
  const displaySteps = steps && steps.length > 0
    ? steps.map((s, idx) => ({ id: `step-${idx}`, label: s }))
    : mockReasoningSteps;

  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= displaySteps.length) return;
    const handle = setTimeout(() => setVisibleCount((c) => c + 1), 500);
    return () => clearTimeout(handle);
  }, [visibleCount, displaySteps.length]);

  const items = displaySteps.slice(0, visibleCount);

  return (
    <div className="reasoning-panel">
      {items.map((step, i) => {
        const isActive = i === items.length - 1;
        return (
          <div className={`reasoning-step${isActive ? ' active' : ' done'}`} key={step.id}>
            <span className="reasoning-step__marker" />
            <span className="reasoning-step__label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
