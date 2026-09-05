import EvidencePanel from './EvidencePanel';
import ArtifactPanel from './ArtifactPanel';
import ReasoningPanel from './ReasoningPanel';
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
