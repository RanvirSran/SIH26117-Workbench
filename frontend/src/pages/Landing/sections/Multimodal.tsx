import { ScanDocStack } from '../components/DocStack';

const ROWS = [
  { label: 'scanned pdf', text: <>A 12-page inspection report, scanned at an angle, half of it stamped. Findings pulled out in order.</> },
  { label: 'handwriting', text: <>A shift engineer's handwritten margin notes, read alongside the typed original.</> },
  { label: 'drawing', text: <>A P&amp;ID or GA drawing photographed on a phone, tags read directly off the image.</> },
  { label: 'photograph', text: <>A site photograph of a nameplate or gauge, read for the value that matters.</> },
];

export function Multimodal() {
  return (
    <section className="section" id="read" style={{ overflow: 'clip' }}>
      <div className="wrap multimodal__grid">
        <ScanDocStack />

        <div>
          <h2 className="section__title" style={{ marginBottom: 14 }}>Not every record in a plant is typed text.</h2>
          <p className="section__desc" style={{ marginBottom: 8 }}>
            AURA is deliberately close to the work: it understands mixed media, stays local, and
            gives teams a controlled way to share useful context.
          </p>
          <div className="multimodal__list">
            {ROWS.map((r) => (
              <div className="mm-row" key={r.label}>
                <div className="mm-row__label">{r.label}</div>
                <div className="mm-row__text">{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
