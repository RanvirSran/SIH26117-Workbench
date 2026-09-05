import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Dot {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  hue: 'indigo' | 'teal';
}

function makeDots(count: number, seed: number): Dot[] {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    left: next() * 100,
    top: next() * 100,
    size: 2 + next() * 3.4,
    duration: 7 + next() * 9,
    delay: next() * 6,
    drift: 14 + next() * 26,
    hue: i % 3 === 0 ? 'teal' : 'indigo',
  }));
}

/** Slow, ambient drifting dots for a section backdrop. Purely decorative. */
export function DotField({ count = 42 }: { count?: number }) {
  const reduced = useReducedMotion();
  const dots = useMemo(() => makeDots(count, 42), [count]);

  return (
    <div className="dot-field" aria-hidden="true">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className={`dot-field__dot dot-field__dot--${d.hue}`}
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size }}
          animate={reduced ? undefined : { y: [0, -d.drift, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={reduced ? undefined : { duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
