import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * A stack of two physical-paper "documents" that slide in from off-screen
 * right as the section scrolls into view, with a slight 3D perspective
 * tilt and layered depth so the front sheet reads as sitting above the
 * back one. Motion is restrained: one horizontal slide + settle, no
 * bouncing, no glow. Respects prefers-reduced-motion (cross-fade only).
 */

interface DocCardProps {
  className?: string;
  delay?: number;
  depth?: 'back' | 'front';
  children: ReactNode;
}

function DocCard({ className = '', delay = 0, depth = 'front', children }: DocCardProps) {
  const reduced = useReducedMotion();
  const travel = depth === 'front' ? 380 : 260;
  const rotateY = depth === 'front' ? -16 : -9;
  const restRotate = depth === 'front' ? 2 : -3;

  return (
    <motion.div
      className={`doc-card doc-card--${depth} ${className}`.trim()}
      initial={
        reduced
          ? { opacity: 0 }
          : { x: travel, opacity: 0, rotateY: rotateY - 8, rotate: restRotate + (depth === 'front' ? 6 : -4) }
      }
      whileInView={
        reduced
          ? { opacity: 1 }
          : { x: 0, opacity: 1, rotateY, rotate: restRotate }
      }
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduced ? 0.4 : 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Confidential approval note — used in the Problem section. */
export function ApprovalDocStack() {
  return (
    <div className="doc-stack doc-stack--shift-right">
      <DocCard depth="back" delay={0.05}>
        <div className="doc-card__top">
          <span>draft_approval_note.txt</span>
        </div>
        <div className="doc-card__line" style={{ width: '70%' }} />
        <div className="doc-card__bar" style={{ width: '90%' }} />
        <div className="doc-card__bar" style={{ width: '58%' }} />
      </DocCard>
      <DocCard depth="front" delay={0.22}>
        <div className="doc-card__top">
          <span>draft_approval_note.txt</span>
          <span>pasted → public-assistant.ai</span>
        </div>
        <div className="doc-card__line" style={{ width: '58%' }} />
        <div className="doc-card__bar" style={{ width: '94%' }} />
        <div className="doc-card__bar" style={{ width: '71%' }} />
        <div className="doc-card__line" style={{ width: '40%' }} />
        <div className="doc-card__bar" style={{ width: '85%' }} />
        <div className="doc-card__stamp">↑ leaves the network the moment it's sent</div>
      </DocCard>
    </div>
  );
}

/** Scanned inspection report / P&ID — used in the Multimodal section. */
export function ScanDocStack() {
  return (
    <div className="doc-stack doc-stack--shift-left">
      <DocCard depth="back" delay={0.05}>
        <div className="doc-card__top">
          <span>pid_sheet_07.jpg</span>
        </div>
        <div className="doc-card__scan">
          <div className="doc-card__line" style={{ top: 14, width: '80%' }} />
          <div className="doc-card__line" style={{ top: 32, width: '55%' }} />
          <div className="doc-card__line" style={{ top: 50, width: '68%' }} />
        </div>
        <div className="doc-card__tag">drawing</div>
      </DocCard>
      <DocCard depth="front" delay={0.22}>
        <div className="doc-card__top">
          <span>inspection_report.pdf</span>
          <span>ocr · 12p</span>
        </div>
        <div className="doc-card__scan">
          <div className="doc-card__line" style={{ top: 12, width: '82%' }} />
          <div className="doc-card__line" style={{ top: 30, width: '60%' }} />
          <div className="doc-card__line" style={{ top: 48, width: '72%' }} />
          <div className="doc-card__line" style={{ top: 66, width: '44%' }} />
        </div>
        <div className="doc-card__tag">handwriting · read alongside typed original</div>
      </DocCard>
    </div>
  );
}
