import type { Conversation, ToolDef } from '../types';
import { toolIconMap } from './Icons';

const tools: ToolDef[] = [
  { id: 't1', name: 'RAG search', status: 'ready', icon: 'search' },
  { id: 't2', name: 'File reader', status: 'ready', icon: 'file' },
  { id: 't3', name: 'Calculator', status: 'ready', icon: 'calc' },
  { id: 't4', name: 'Code execution', status: 'ready', icon: 'code' },
  { id: 't5', name: 'Artifact generation', status: 'ready', icon: 'artifact' },
];

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  documentCount: number;
  lastIndexed: string;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  documentCount,
  lastIndexed,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewConversation}>
        <span className="plus">+</span> New conversation
      </button>

      <div className="side-section">
        <div className="side-heading">Conversations</div>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conv-item${c.id === activeConversationId ? ' active' : ''}`}
            onClick={() => onSelectConversation(c.id)}
          >
            {c.title}
          </div>
        ))}
      </div>

      <div className="side-section">
        <div className="side-heading">Knowledge base</div>
        <div className="kb-stat">
          <span className="kb-num">{documentCount}</span>
          <span className="kb-lbl">documents indexed</span>
        </div>
        <div className="kb-meta">
          Last indexed <b>{lastIndexed}</b>
          <br />
          Storage <b>Local disk</b> · Pending <b>0</b>
        </div>
      </div>

      <div className="side-section">
        <div className="side-heading">Agents &amp; tools</div>
        {tools.map((tool) => {
          const Icon = toolIconMap[tool.icon];
          return (
            <div className="tool-row" key={tool.id}>
              <Icon />
              <span className="name">{tool.name}</span>
              <span className="dot" />
              <span className="state">Ready</span>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="exec-mini">
          <span>Inference</span>
          <b>Local</b>
        </div>
        <div className="exec-mini">
          <span>Internet</span>
          <span>Disabled</span>
        </div>
      </div>
    </div>
  );
}
