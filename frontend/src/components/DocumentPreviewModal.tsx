import { useEffect, useRef, useState } from 'react';
import FileTypeBadge from './FileTypeBadge';
import { IconDownload, IconX } from './Icons';
import { API_URL } from '../config';

interface DocumentPreviewModalProps {
  /** The knowledge-base source filename, e.g. "P-102 Equipment Manual.pdf". */
  filename: string;
  /** The specific chunk of text that was cited, if any — gets highlighted and scrolled to. */
  highlight?: string;
  onClose: () => void;
}

// Collapses whitespace so a highlight snippet lifted from a chunk (which
// may have different line-wrapping than the freshly extracted document
// text) can still be found with a plain substring search.
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export default function DocumentPreviewModal({ filename, highlight, onClose }: DocumentPreviewModalProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const highlightRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);

    fetch(`${API_URL}/kb-docs/${encodeURIComponent(filename)}/content`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setText(data.text ?? '');
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (text != null) {
      // Wait a tick for the highlighted <mark> (if any) to be in the DOM.
      const handle = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 30);
      return () => clearTimeout(handle);
    }
  }, [text]);

  const renderBody = () => {
    if (error) {
      return <div className="doc-preview__empty">Couldn't load this document: {error}</div>;
    }
    if (text == null) {
      return <div className="doc-preview__empty">Loading document…</div>;
    }
    if (!text.trim()) {
      return <div className="doc-preview__empty">No extractable text found in this document.</div>;
    }

    const needle = highlight ? normalize(highlight) : '';
    const haystack = normalize(text);
    const matchIndex = needle.length > 20 ? haystack.indexOf(needle) : -1;

    // Split into paragraphs for readability regardless of whether we found
    // a highlight match — this keeps the fallback (no match / short quote)
    // just as readable as the highlighted case.
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    if (matchIndex === -1) {
      return (
        <>
          {highlight && (
            <div className="doc-preview__no-match">
              Couldn't locate the exact cited passage in the extracted text — showing the full document.
            </div>
          )}
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </>
      );
    }

    // Find which paragraph contains the match (using the same normalized
    // comparison) so we only need to split *that* paragraph around the
    // highlight, and can render the rest as plain text.
    let runningLength = 0;
    return (
      <>
        {paragraphs.map((p, i) => {
          const normalizedP = normalize(p);
          const startsAt = runningLength;
          runningLength += normalizedP.length + 1;

          if (matchIndex < startsAt || matchIndex >= runningLength) {
            return <p key={i}>{p}</p>;
          }

          const localIndex = p.toLowerCase().indexOf(needle.slice(0, 40).toLowerCase());
          if (localIndex === -1) {
            return <p key={i}>{p}</p>;
          }

          const before = p.slice(0, localIndex);
          const matchLen = Math.min(needle.length, p.length - localIndex);
          const match = p.slice(localIndex, localIndex + matchLen);
          const after = p.slice(localIndex + matchLen);

          return (
            <p key={i}>
              {before}
              <mark ref={highlightRef} className="doc-preview__highlight">
                {match}
              </mark>
              {after}
            </p>
          );
        })}
      </>
    );
  };

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label={`Preview of ${filename}`}>
      <div className="search-overlay__backdrop" onClick={onClose} />
      <div className="doc-preview__panel">
        <div className="doc-preview__header">
          <FileTypeBadge filename={filename} />
          <div className="doc-preview__title">{filename}</div>
          <a
            className="doc-preview__action"
            href={`${API_URL}/kb-docs/${encodeURIComponent(filename)}`}
            download
            aria-label={`Download ${filename}`}
          >
            <IconDownload />
          </a>
          <button className="doc-preview__action" onClick={onClose} aria-label="Close preview">
            <IconX />
          </button>
        </div>
        <div className="doc-preview__body">{renderBody()}</div>
      </div>
    </div>
  );
}
