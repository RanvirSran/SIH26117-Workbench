import { motion, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 1.1, delay: 0.18 + i * 0.11, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.35, delay: 0.18 + i * 0.11 } },
  }),
};

const nodeIn = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.42 + i * 0.08 } }),
};

const TASKS = [
  { label: 'Code review', meta: '200-line Python patch', color: 'var(--phosphor)' },
  { label: 'Scanned inspection report', meta: 'handwritten annotations', color: 'var(--brass-soft)' },
  { label: 'Quarterly cost sheet', meta: '40-tab workbook', color: 'var(--ink-dim)' },
];
const MODELS = [
  { label: 'Qwen · Coder 14B' },
  { label: 'Llama · Vision 11B' },
  { label: 'DeepSeek · Reasoner 32B' },
];

/** Task → model routing diagram used in the "how it decides" section. */
export function RoutingDiagram() {
  const ROW_H = 112;
  const Y0 = 26;
  const TASK_W = 216;
  const BOX_H = 82;
  const centerY = (i: number) => Y0 + i * ROW_H + BOX_H / 2;

  const paths = TASKS.map((t, i) => ({
    d: `M ${12 + TASK_W},${centerY(i)} C ${12 + TASK_W + 60},${centerY(i)} ${326 - 60},${centerY(i)} 326,${centerY(i)}`,
    color: t.color,
  }));

  return (
    <svg viewBox="0 0 650 372" width="100%" role="img" aria-label="Three task types, each routed to a different local model">
      {TASKS.map((t, i) => {
        const words = t.label.split(' ');
        const wrap = t.label.length > 20;
        const firstLine = wrap ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : t.label;
        const secondLine = wrap ? words.slice(Math.ceil(words.length / 2)).join(' ') : '';
        return (
          <g key={t.label}>
            <rect x={12} y={Y0 + i * ROW_H} width={TASK_W} height={BOX_H} rx={3} fill="rgba(53,41,65,0.025)" stroke="var(--line-strong)" />
            <text x={26} y={Y0 + i * ROW_H + 30} fill="var(--ink)" fontSize="15.5" fontFamily="var(--body)" fontWeight={600}>{firstLine}</text>
            {wrap && (
              <text x={26} y={Y0 + i * ROW_H + 50} fill="var(--ink)" fontSize="15.5" fontFamily="var(--body)" fontWeight={600}>{secondLine}</text>
            )}
            <text x={26} y={Y0 + i * ROW_H + (wrap ? 68 : 52)} fill="var(--ink-dim)" fontSize="13.5" fontFamily="var(--body)" fontWeight={500}>{t.meta}</text>
          </g>
        );
      })}
      {paths.map((p, i) => (
        <motion.path key={p.d} d={p.d} fill="none" stroke={p.color} strokeWidth={1.4} strokeDasharray="0" custom={i} variants={draw} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }} />
      ))}
      {MODELS.map((m, i) => (
        <motion.g key={m.label} custom={i} variants={nodeIn} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
          <rect x={326} y={Y0 + i * ROW_H} width={312} height={BOX_H} rx={3} fill="rgba(53,41,65,0.03)" stroke="var(--line-strong)" />
          <text x={350} y={Y0 + i * ROW_H + BOX_H / 2 + 6} fill="var(--ink)" fontSize="18" fontFamily="var(--body)" fontWeight={700}>{m.label}</text>
        </motion.g>
      ))}
    </svg>
  );
}

const LOOP_STAGES = ['Plan', 'Call tool', 'Observe', 'Iterate', 'Deliver'];

interface AgentLoopDiagramProps {
  activeIndex: number;
  onSelect: (i: number) => void;
}

/** Circular plan → act → observe loop. A dot continuously travels the ring
 *  and the node it is currently passing is highlighted in real time.
 *  Clicking a node re-starts the dot from that stage. */
export function AgentLoopDiagram({ activeIndex, onSelect }: AgentLoopDiagramProps) {
  const reduced = useReducedMotion();
  const cx = 190, cy = 190, r = 138;
  const n = LOOP_STAGES.length;
  const points = LOOP_STAGES.map((label, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { label, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const progress = useMotionValue(0);
  const [visited, setVisited] = useState(activeIndex);

  const dotX = useTransform(progress, (p) => {
    const angle = ((activeIndex / n) + p) * Math.PI * 2 - Math.PI / 2;
    return cx + r * Math.cos(angle);
  });
  const dotY = useTransform(progress, (p) => {
    const angle = ((activeIndex / n) + p) * Math.PI * 2 - Math.PI / 2;
    return cy + r * Math.sin(angle);
  });

  useEffect(() => {
    progress.set(0);
    setVisited(activeIndex);
    if (reduced) return;
    const controls = animate(progress, 1, { duration: 9, ease: 'linear', repeat: Infinity });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, reduced]);

  useEffect(() => {
    const unsub = progress.on('change', (p) => {
      const idx = (activeIndex + Math.round(p * n)) % n;
      setVisited((prev) => (prev === idx ? prev : idx));
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <svg viewBox="0 0 380 380" width="100%" role="img" aria-label="Agent loop: plan, call tool, observe, iterate, deliver, repeating">
      <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 6" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.75 }} />
      {points.map((p, i) => {
        const isVisited = i === visited;
        return (
          <motion.g
            key={p.label}
            custom={i}
            variants={nodeIn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            onClick={() => onSelect(i)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
            <circle
              cx={p.x} cy={p.y} r={22}
              fill={isVisited ? 'var(--brass-dim)' : 'var(--bg-2)'}
              stroke={isVisited ? 'var(--brass)' : 'var(--line-strong)'}
              strokeWidth={isVisited ? 1.8 : 1.2}
              style={{ transition: 'fill 0.35s ease, stroke 0.35s ease' }}
            />
            <text x={p.x} y={p.y + 4} fill={isVisited ? 'var(--brass)' : 'var(--ink)'} fontSize="11.5" fontFamily="var(--mono)" fontStyle="italic" fontWeight={isVisited ? 500 : 300} textAnchor="middle">{String(i + 1).padStart(2, '0')}</text>
          </motion.g>
        );
      })}
      <text x={cx} y={cy + 5} fill="var(--ink)" fontSize="16" fontFamily="var(--display)" fontWeight={700} textAnchor="middle">Agent loop</text>
      {!reduced && (
        <motion.circle r={3.5} fill="var(--brass-soft)" style={{ cx: dotX, cy: dotY }} />
      )}
    </svg>
  );
}
