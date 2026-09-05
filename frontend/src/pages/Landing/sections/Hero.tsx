// import { motion } from 'framer-motion';

// const lineUp = {
//   hidden: { y: '110%' },
//   show: (i: number) => ({ y: '0%', transition: { duration: 0.9, delay: 0.14 + i * 0.11, ease: [0.16, 1, 0.3, 1] } }),
// };
// const fadeUp = {
//   hidden: { opacity: 0, y: 14 },
//   show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] } }),
// };

// export function Hero({ onLaunch }: { onLaunch: () => void; theme: 'dark' | 'light' }) {
//   return (
//     <section className="hero hero--immersive">
//       <motion.div
//         className="hero__arc-bg"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 1.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
//         aria-hidden="true"
//       >
//         <svg viewBox="0 0 1440 900" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
//           <ellipse cx="720" cy="920" rx="980" ry="520" fill="var(--horizon-fill)" />
//           <ellipse cx="720" cy="920" rx="980" ry="520" fill="none" stroke="var(--horizon-line)" strokeWidth={1.4} />
//         </svg>
//       </motion.div>

//       <div className="hero__content">
//         <h1 className="hero__title">
//           <span className="hero__title-line">
//             <motion.span style={{ display: 'inline-block' }} custom={0} variants={lineUp} initial="hidden" animate="show">
//               Intelligence,
//             </motion.span>
//           </span>
//           <span className="hero__title-line">
//             <motion.span className="hero__title-accent" style={{ display: 'inline-block' }} custom={1} variants={lineUp} initial="hidden" animate="show">
//               kept on-site.
//             </motion.span>
//           </span>
//         </h1>

//         <motion.p className="hero__tagline" custom={0.5} variants={fadeUp} initial="hidden" animate="show">
//           AURA is the on-premise agentic workbench for confidential industrial work.
//           Bring the archive. Leave the perimeter intact.
//         </motion.p>

//         <motion.div className="hero__actions" custom={0.74} variants={fadeUp} initial="hidden" animate="show">
//           <button className="btn btn--brass" onClick={onLaunch}>Enter the workbench</button>
//         </motion.div>
//       </div>
//     </section>
//   );
// }


import { motion } from 'framer-motion';

const lineUp = {
  hidden: { y: '110%' },
  show: (i: number) => ({
    y: '0%',
    transition: {
      duration: 0.9,
      delay: 0.14 + i * 0.11,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      delay,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export function Hero({
  onLaunch,
}: {
  onLaunch: () => void;
  theme: 'dark' | 'light';
}) {
  return (
    <section className="hero hero--immersive">
      <motion.div
        className="hero__arc-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.3,
          delay: 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 900"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMax slice"
        >
          <ellipse
            cx="720"
            cy="760"
            rx="980"
            ry="520"
            fill="var(--horizon-fill)"
          />

          <ellipse
            cx="720"
            cy="760"
            rx="980"
            ry="520"
            fill="none"
            stroke="var(--horizon-line)"
            strokeWidth={1.4}
          />
        </svg>
      </motion.div>

      <div className="hero__content">
        <h1
          className="hero__title"
          style={{
            fontSize: 'clamp(4.5rem, 7vw, 8rem)',
          }}
        >
          <span className="hero__title-line">
            <motion.span
              style={{ display: 'inline-block' }}
              custom={0}
              variants={lineUp}
              initial="hidden"
              animate="show"
            >
              Intelligence,
            </motion.span>
          </span>

          <span className="hero__title-line">
            <motion.span
              className="hero__title-accent"
              style={{ display: 'inline-block' }}
              custom={1}
              variants={lineUp}
              initial="hidden"
              animate="show"
            >
              kept on-site.
            </motion.span>
          </span>
        </h1>

        <motion.p
          className="hero__tagline"
          custom={0.5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          AURA is the on-premise agentic workbench for confidential industrial
          work. Bring the archive. Leave the perimeter intact.
        </motion.p>

        <motion.div
          className="hero__actions"
          custom={0.74}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <button className="btn btn--brass" onClick={onLaunch}>
            Enter the workbench
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ### What changed

// * **Arc moved up:** `cy="920"` → `cy="600"`, so the top of the arc now reaches much higher and can sit **behind/above “Intelligence”**.
// * **Title reduced 25%:** `fontSize: '75%'`.
// * Everything else — animations, text, button, colors, etc. — is unchanged.

// If the arc is **still too low**, change `cy="600"` to around `cy="500"`. If it's too high, use `cy="650"`.
