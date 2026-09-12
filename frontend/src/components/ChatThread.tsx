import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EvidencePanel from './EvidencePanel';
import ArtifactPanel from './ArtifactPanel';
import ReasoningPanel from './ReasoningPanel';
import FileCard from './FileCard';
import type { ChatMessage } from '../types';

interface ChatThreadProps {
  title: string;
  workspace: string;
  messages: ChatMessage[];
  isLoading?: boolean;
  /** Reasoning-trace lines received so far for the in-flight message, in order. */
  liveSteps?: string[];
}

export default function ChatThread({ messages, isLoading, liveSteps }: ChatThreadProps) {
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevIsLoading = useRef(isLoading);

  // Once a response finishes, scroll so the question that started this
  // exchange sits near the top of the viewport - the same pattern most
  // chat apps use so a long answer doesn't leave the question scrolled
  // out of view above it.
  useEffect(() => {
    if (prevIsLoading.current && !isLoading) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        const el = messageRefs.current[lastUserMessage.id];
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, messages]);

  return (
    <div className="thread">
      {messages.map((msg) => (
        <div
          className={`msg${msg.role === 'user' ? ' user' : ' ai'}`}
          key={msg.id}
          ref={(el) => {
            messageRefs.current[msg.id] = el;
          }}
        >
          <div className="msg-inner">
            <div className={`msg-role${msg.role === 'ai' ? ' ai' : ''}`}>
              {msg.role === 'user' ? 'You' : 'AURA'}
            </div>

            {msg.role === 'ai' ? (
              <div className="msg-body markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            ) : (
              <div className="msg-body">{msg.text}</div>
            )}

            {msg.attachments && msg.attachments.length > 0 && (
              <div className="file-card-row">
                {msg.attachments.map((att, i) => (
                  <FileCard key={`${att.name}-${i}`} name={att.name} url={att.url} size={att.size} />
                ))}
              </div>
            )}

            {msg.steps && msg.steps.length > 0 && (
              <details className="why-toggle" style={{ marginTop: '0.75rem' }}>
                <summary className="why-summary">
                  <span className="chev">▶</span> Reasoning Trace ({msg.steps.length} steps)
                </summary>
                <ReasoningPanel steps={msg.steps} />
              </details>
            )}

            {msg.generated_file && (
              <div className="file-card-row" style={{ marginTop: '0.85rem' }}>
                <FileCard
                  name={msg.generated_file.split('/').pop() ?? 'document'}
                  url={msg.generated_file}
                  subtitle="Generated deliverable"
                />
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
            <ReasoningPanel steps={liveSteps ?? []} live />
          </div>
        </div>
      )}
    </div>
  );
}
