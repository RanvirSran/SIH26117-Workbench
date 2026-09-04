import { motion } from 'framer-motion';
import { GlassPanel } from '../components/Glass';
import { DotField } from '../components/DotField';

export function Airgap() {
  return (
    <section className="airgap" id="proof">
      <div className="wrap airgap__grid">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.75 }}>
          <h2 className="section__title" style={{ maxWidth: '13ch', marginBottom: 14 }}>
            Nothing gets out. Nothing has to be trusted.
          </h2>
          <p className="section__desc" style={{ maxWidth: '48ch' }}>
            AURA runs on an interface with no outbound route configured. A network monitor sits
            alongside every session and shows exactly that: nothing requested, nothing sent.
            There is no log of a call that was never possible in the first place.
          </p>
          <p className="section__desc" style={{ maxWidth: '48ch', marginTop: 14 }}>
            It reads your P&amp;IDs, drawings and inspection reports, plans and runs multi-step
            work across your own tools, and hands back a finished document — all on your GPU
            server, with nothing routed out to reach it.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.75, delay: 0.12 }}>
          <GlassPanel size="sm" className="airgap__stats">
            <div className="stat stat--lg">
              <div className="stat__value">0</div>
              <div className="stat__label">destinations reachable outside the boundary</div>
            </div>
            <div className="stat stat--lg">
              <div className="stat__value">100%</div>
              <div className="stat__label">of inference, retrieval and tool calls served on-premises</div>
            </div>
            <div className="stat stat--lg">
              <div className="stat__value">live</div>
              <div className="stat__label">monitor running for the length of every session</div>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}

const FILES = [
  { ext: '.docx', name: 'Approval note, drafted from the scanned inspection report', meta: '4 pages, 2 findings' },
  { ext: '.xlsx', name: 'Vendor cost comparison, pulled from three quotations', meta: '6 sheets, formulas live' },
  { ext: '.pptx', name: 'Board summary of a design review', meta: '9 slides, sourced' },
  { ext: '.py', name: 'Internal tool patch, run and verified in the sandbox', meta: 'tests passing' },
];

export function Deliverables() {
  return (
    <section className="section section--tight" id="deliverables">
      <div className="wrap">
        <div className="section__head section__head--center">
          <h2 className="section__title">A finished file, not a longer chat reply.</h2>
          <p className="section__desc">
            Every workflow ends in something usable:
            <br />
            a document, a workbook, a slide deck, or code that has already been run.
          </p>
        </div>
        <div className="deliverables__list">
          {FILES.map((f, i) => (
            <motion.div
              className="file-row"
              key={f.ext + f.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.65, delay: i * 0.08 }}
            >
              <span className="file-row__ext">{f.ext}</span>
              <span className="file-row__name">{f.name}</span>
              <span className="file-row__meta">{f.meta}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SPECS = [
  { value: '1', label: 'Workstation or server with a mid-range GPU. Scales up to a 120B-class model where hardware allows.' },
  { value: 'N', label: 'Open-weight models supported at once, added without redesigning the router.' },
  { value: 'RAG', label: 'Local knowledge base: manuals, SOPs and past correspondence, indexed on-premises.' },
  { value: '0', label: 'External network dependencies at inference time.' },
];

export function Specs() {
  return (
    <section className="specs">
      <div className="wrap specs__grid">
        {SPECS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.65, delay: i * 0.08 }}>
            <div className="spec-item__value">{s.value}</div>
            <div className="spec-item__label">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="cta-final">
      <DotField count={36} />
      <div className="wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.75 }}>
          <GlassPanel className="cta-final__panel" tick>
            <h2 className="cta-final__title">
              Keep the work where the data already has to stay.
            </h2>
            <div className="cta-final__actions">
              <button className="btn btn--brass" onClick={onLaunch}>Enter the workbench</button>
              <span className="cta-final__note">Runs entirely on your GPU server.</span>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}
