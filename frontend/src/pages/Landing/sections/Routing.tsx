import { motion } from 'framer-motion';
import { GlassPanel } from '../components/Glass';
import { RoutingDiagram } from '../components/Diagrams';

export function Routing() {
  return (
    <section className="section" id="decide">
      <div className="wrap routing__layout">
        <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
          <GlassPanel className="routing__diagram-panel">
            <RoutingDiagram />
          </GlassPanel>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
          <h2 className="section__title" style={{ marginBottom: 14 }}>One backend, several models, one router that reads the task first.</h2>
          <p className="section__desc">
            Each request is classified before it's answered. A code change, a scanned report
            and a spreadsheet don't want the same model, so they don't get one.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
