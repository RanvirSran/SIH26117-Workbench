import type { PropsWithChildren, CSSProperties } from 'react';

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Fixed film-grain layer — keeps the deep glass gradients from reading flat. */
export function NoiseOverlay() {
  return (
    <div
      className="landing-noise"
      style={{ backgroundImage: NOISE_SVG, backgroundSize: '120px 120px' }}
      aria-hidden="true"
    />
  );
}

interface GlassPanelProps extends PropsWithChildren {
  className?: string;
  size?: 'lg' | 'sm';
  tick?: boolean;
  style?: CSSProperties;
}

/** The page's signature surface: a chamfered, blurred "machined glass" panel. */
export function GlassPanel({ className = '', size = 'lg', tick = false, style, children }: GlassPanelProps) {
  const sizeClass = size === 'sm' ? 'glass-panel--sm' : '';
  return (
    <div className={`glass-panel ${sizeClass} ${className}`.trim()} style={style}>
      {tick && <span className="glass-panel__tick" aria-hidden="true" />}
      {children}
    </div>
  );
}

/** Small breathing status dot — used where the copy claims a live/secure state. */
export function StatusDot({ color = 'var(--phosphor)' }: { color?: string }) {
  return <span className="pulse-dot" style={{ background: color }} aria-hidden="true" />;
}
