import { API_URL } from '../config';
import type { Source } from '../types';

interface EvidencePanelProps {
  sourceCount: number;
  chunkCount: number;
  retrievalMs: number;
  sources: Source[];
  documentsInIndex: number;
  excerpt: string;
}

function sourceHref(source: Source): string | undefined {
  if (!source.url) return undefined;
  return `${API_URL}${source.url}`;
}

export default function EvidencePanel({
  sourceCount,
  chunkCount,
  retrievalMs,
  sources,
  documentsInIndex,
  excerpt,
}: EvidencePanelProps) {
  const sectionsUsed = sources.map((s) => `${s.title} ${s.location}`).join(' · ');

  return (
    <div className="evidence-block">
      <div className="evidence-header">
        <div>
          <div className="evidence-title">✓ Evidence-backed answer</div>
          <div className="evidence-meta">
            {sourceCount} sources · {chunkCount} relevant chunks · Local vector search · {retrievalMs} ms
          </div>
        </div>
        <span className="state-badge verified">Source-backed · not AI-generated guidance</span>
      </div>

      <div className="evidence-body">
        <div className="source-grid">
          {sources.map((s) => {
            const href = sourceHref(s);
            const inner = (
              <>
                <div className="src-title">{s.title}</div>
                <div className="src-loc">{s.location}</div>
                {href && <div className="src-link">Open source document →</div>}
              </>
            );
            return href ? (
              <a className="source-card" key={s.title} href={href} target="_blank" rel="noreferrer">
                {inner}
              </a>
            ) : (
              <div className="source-card" key={s.title}>
                {inner}
              </div>
            );
          })}
        </div>

        <details className="why-toggle">
          <summary className="why-summary">
            <span className="chev">▶</span> Why this answer?
          </summary>
          <div className="why-content">
            <div className="why-row">
              <b>Documents retrieved</b>
              <span>{sourceCount} of {documentsInIndex}</span>
            </div>
            <div className="why-row">
              <b>Sections used</b>
              <span>{sectionsUsed}</span>
            </div>
            <div className="why-row">
              <b>External sources</b>
              <span>None. Internet disabled.</span>
            </div>
            <div className="why-excerpt">"{excerpt}"</div>
          </div>
        </details>
      </div>
    </div>
  );
}
