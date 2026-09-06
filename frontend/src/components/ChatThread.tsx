import EvidencePanel from './EvidencePanel';
import ArtifactPanel from './ArtifactPanel';
import ReasoningPanel from './ReasoningPanel';
import { IconFile } from './Icons';
import { API_URL } from '../config';
import type { ChatMessage } from '../types';

interface ChatThreadProps {
  title: string;
  workspace: string;
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function ChatThread({ messages, isLoading }: ChatThreadProps) {
  return (
    <div className="thread">
      {messages.map((msg) => (
        <div className={`msg${msg.role === 'user' ? ' user' : ' ai'}`} key={msg.id}>
          <div className="msg-inner">
            <div className={`msg-role${msg.role === 'ai' ? ' ai' : ''}`}>
              {msg.role === 'user' ? 'You' : 'AURA'}
            </div>
            <div className="msg-body">{msg.text}</div>

            {msg.steps && msg.steps.length > 0 && (
              <details className="why-toggle" style={{ marginTop: '0.75rem' }}>
                <summary className="why-summary">
                  <span className="chev">▶</span> Reasoning Trace ({msg.steps.length} steps)
                </summary>
                <ReasoningPanel steps={msg.steps} />
              </details>
            )}

            {msg.generated_file && (
              <div className="artifact-panel" style={{ marginTop: '1rem' }}>
                <div className="artifact-panel-head">
                  <div className="artifact-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconFile />
                    <span>Deliverable Generated</span>
                  </div>
                  <div className="artifact-panel-tag">Sovereign Artifact</div>
                </div>
                <div style={{ margin: '0.75rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  File: {msg.generated_file.split('/').pop()}
                </div>
                <div className="artifact-actions">
                  <a
                    href={`${API_URL}${msg.generated_file}`}
                    download
                    className="action-btn primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    Download Deliverable ↓
                  </a>
                </div>
              </div>
            )}

            {msg.evidence && (
              <EvidencePanel
                sourceCount={msg.evidence.sourceCount}
                chunkCount={msg.evidence.chunkCount}
                retrievalMs={msg.evidence.retrievalMs}
                sources={msg.evidence.sources}
                documentsInIndex={msg.evidence.documentsInIndex}
                excerpt={msg.evidence.excerpt}
              />
            )}

            {msg.artifact && (
              <ArtifactPanel
                title={msg.artifact.title}
                items={msg.artifact.items}
                sourcesLine={msg.artifact.sourcesLine}
              />
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="msg ai">
          <div className="msg-inner">
            <div className="msg-role ai">AURA</div>
            <ReasoningPanel />
          </div>
        </div>
      )}
    </div>
  );
}
