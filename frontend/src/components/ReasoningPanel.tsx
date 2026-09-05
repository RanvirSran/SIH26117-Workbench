import { useEffect, useState } from 'react';
import { mockReasoningSteps } from '../data/mockData';

// Placeholder step timeline. Once the real agent loop exists, replace this
// with steps streamed from the backend (e.g. over SSE/WebSocket) instead of
// the fixed interval below; the render logic can stay the same.
export default function ReasoningPanel() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= mockReasoningSteps.length) return;
    const handle = setTimeout(() => setVisibleCount((c) => c + 1), 650);
    return () => clearTimeout(handle);
  }, [visibleCount]);

  const steps = mockReasoningSteps.slice(0, visibleCount);

  return (
    <div className="reasoning-panel">
      {steps.map((step, i) => {
        const isActive = i === steps.length - 1;
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
