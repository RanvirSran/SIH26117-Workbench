import { motion } from 'framer-motion';
import { ApprovalDocStack } from '../components/DocStack';

export function Problem() {
  return (
    <section className="section section--tight" style={{ overflow: 'clip' }}>
      <div className="wrap problem__grid">
        <motion.div className="problem__body" initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
          <h2 className="section__title" style={{ marginBottom: 20 }}>
            Cloud convenience is not a security strategy.
          </h2>
          <p>
            Industrial teams hold the context that makes AI useful: years of manuals, sensor
            traces, and operator knowledge. Right now that either stays locked in a filing
            cabinet, or ends up pasted into a public assistant. AURA gives it a third option.
          </p>
        </motion.div>

        <ApprovalDocStack />
      </div>
    </section>
  );
}
