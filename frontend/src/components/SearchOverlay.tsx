import { useEffect, useRef, useState } from 'react';
import { IconSearch, IconFile } from './Icons';
import { searchDocuments } from '../api/client';
import { API_URL } from '../config';
import type { SearchResult } from '../types';

interface SearchOverlayProps {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchDocuments(query).then((r) => {
        setResults(r);
        setIsSearching(false);
        setHasSearched(true);
      });
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search company documents">
      <div className="search-overlay__backdrop" onClick={onClose} />
      <div className="search-overlay__panel">
        <div className="search-overlay__input-row">
          <span className="search-overlay__icon"><IconSearch /></span>
          <input
            ref={inputRef}
            className="search-overlay__input"
            placeholder="Search across all indexed company documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-overlay__close" onClick={onClose} aria-label="Close search">Esc</button>
        </div>

        <div className="search-overlay__results">
          {!hasSearched && !isSearching && (
            <div className="search-overlay__empty">Start typing to search the knowledge base.</div>
          )}
          {isSearching && (
            <div className="search-overlay__empty">Searching...</div>
          )}
          {!isSearching && hasSearched && results.length === 0 && (
            <div className="search-overlay__empty">No matches found.</div>
          )}
          {!isSearching && results.map((r) => {
            const content = (
              <>
                <div className="search-result__snippet">{r.snippet}</div>
                <div className="search-result__source">
                  <IconFile />
                  <span>{r.documentTitle}</span>
                  <span className="search-result__loc">{r.location}</span>
                </div>
              </>
            );
            return r.url ? (
              <a
                className="search-result"
                key={r.id}
                href={`${API_URL}${r.url}`}
                target="_blank"
                rel="noreferrer"
              >
                {content}
              </a>
            ) : (
              <div className="search-result" key={r.id}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
