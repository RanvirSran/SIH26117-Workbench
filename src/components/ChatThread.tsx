import EvidencePanel from './EvidencePanel';
import ArtifactPanel from './ArtifactPanel';
import type { ChatMessage } from '../types';

interface ChatThreadProps {
  title: string;
  workspace: string;
  model: string;
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function ChatThread({ title, workspace, model, messages, isLoading }: ChatThreadProps) {
  return (
    <>
      <div className="thread-header">
        <div>
          <div className="thread-title">{title}</div>
          <div className="thread-meta">
            {workspace} · {model}
          </div>
        </div>
        <div className="thread-actions">
          <button className="chip-btn">Export</button>
          <button className="chip-btn">New artifact</button>
        </div>
      </div>

      <div className="thread">
        {messages.map((msg) => (
          <div className={`msg${msg.role === 'user' ? ' user' : ' ai'}`} key={msg.id}>
            <div className={`msg-role${msg.role === 'ai' ? ' ai' : ''}`}>
              {msg.role === 'user' ? 'You' : 'Sovereign AI'}
            </div>
            <div className="msg-body">{msg.text}</div>

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
        ))}

        {isLoading && (
          <div className="msg ai">
            <div className="msg-role ai">Sovereign AI</div>
            <div className="msg-body" style={{ color: 'var(--text-muted)' }}>
              Retrieving from local knowledge base…
            </div>
          </div>
        )}
      </div>
    </>
  );
}
