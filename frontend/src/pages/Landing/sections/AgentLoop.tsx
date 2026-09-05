import { useState } from 'react';
import { motion } from 'framer-motion';
import { AgentLoopDiagram } from '../components/Diagrams';

const STEPS = [
  { title: 'Plan', desc: 'Breaks the request into a short sequence of steps instead of answering in one shot, reading a report before drafting the note that depends on it.' },
  { title: 'Call a tool', desc: 'Reads and writes files, runs code in a sandbox, queries the knowledge base, or works a spreadsheet, whichever the step in front of it needs.' },
  { title: 'Observe', desc: 'Checks what the tool actually returned: a failed test, a missing field, an OCR pass that needs a second look, before moving on.' },
  { title: 'Iterate', desc: 'Repeats or adjusts the plan until the step holds up, rather than surfacing the first attempt as the final answer.' },
  { title: 'Deliver', desc: 'Hands back a working file: a Word note, a checked calculation, a filled spreadsheet. Not a chat reply describing one.' },
];

export function AgentLoop() {
  // `loopStart` drives the diagram's travelling dot and persists once set.
  // `hovered` only controls which step description is expanded, and clears
  // as soon as the cursor leaves the step list entirely.
  const [loopStart, setLoopStart] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const select = (i: number) => {
    setLoopStart(i);
    setHovered(i);
  };

  return (
    <section className="section" id="agent">
      <div className="wrap agentloop__grid">
        <div>
          <h2 className="section__title" style={{ marginBottom: 14 }}>It acts on the task, not just replies to it.</h2>
          <p className="section__desc" style={{ marginBottom: 44 }}>
            A single answer isn't enough for approval notes or inspection reviews. The agent
            carries the work through, end to end, checking its own steps along the way.
          </p>
          <div className="agentloop__steps" onMouseLeave={() => setHovered(null)}>
            {STEPS.map((s, i) => (
              <motion.div
                className={`loop-step${hovered === i ? ' loop-step--open' : ''}`}
                key={s.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.65, delay: i * 0.08 }}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                onClick={() => select(i)}
                tabIndex={0}
              >
                <div className="loop-step__row">
                  <span className="loop-step__index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="loop-step__title">{s.title}</span>
                </div>
                <div className="loop-step__desc-wrap">
                  <p className="loop-step__desc">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
          <AgentLoopDiagram activeIndex={loopStart} onSelect={select} />
        </motion.div>
      </div>
    </section>
  );
}
