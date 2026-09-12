import { useCallback, useRef, useState } from 'react';
import type { Conversation } from '../types';
import { IconSearch, IconX } from './Icons';

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

interface SidebarProps {
  workspace: string;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  documentCount: number;
  lastIndexed: string;
  width: number;
  onWidthChange: (width: number) => void;
  onGoHome?: () => void;
  onOpenSearch?: () => void;
}

export default function Sidebar({
  workspace,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  documentCount,
  lastIndexed,
  width,
  onWidthChange,
  onGoHome,
  onOpenSearch,
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, width });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, width };
    setIsDragging(true);

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startRef.current.x;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startRef.current.width + delta));
      onWidthChange(next);
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [width, onWidthChange]);

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <button className="wordmark" onClick={onGoHome} aria-label="Back to AURA home">
          <span className="mark" />
          AURA
        </button>
        <div className="crumb">
          Workspace <b>{workspace}</b>
        </div>
      </div>

      <button className="search-trigger search-trigger--sidebar" onClick={onOpenSearch} aria-label="Search company documents">
        <IconSearch />
        <span>Search documents</span>
        <span className="search-trigger__kbd">⌘K</span>
      </button>

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
            <span className="conv-item__title">{c.title}</span>
            <button
              className="conv-item__delete"
              aria-label={`Delete conversation "${c.title}"`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(c.id);
              }}
            >
              <IconX />
            </button>
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

      <div
        className={`sidebar-resize-handle${isDragging ? ' active' : ''}`}
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
      />
    </div>
  );
}
