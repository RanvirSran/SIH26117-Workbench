import { useEffect, useState } from 'react';
import HeaderControls from './components/HeaderControls';
import Sidebar from './components/Sidebar';
import ChatThread from './components/ChatThread';
import Composer from './components/Composer';
import SearchOverlay from './components/SearchOverlay';
import { useTheme } from './hooks/useTheme';
import { fetchConversationHistory, fetchConversations, fetchKnowledgeBaseStatus, sendMessageStream } from './api/client';
import type { Attachment, ChatMessage, Conversation, KnowledgeBaseStatus } from './types';

let messageIdCounter = 0;
const nextId = () => `m${++messageIdCounter}`;

// Turns the first user message of a new conversation into a short title,
// the same way most chat apps do it - no backend/model call needed for
// something this cheap. Strips common question/request scaffolding
// ("what is", "can you", "please generate a word doc about", etc.) so the
// title is just the topic in a few words, not a truncated whole sentence.
// Falls back to "New conversation" if nothing meaningful is left (e.g. an
// attachment-only send, or a message that was pure scaffolding).
const TITLE_LEAD_IN_RE =
  /^(please\s+|could\s+you\s+|can\s+you\s+|would\s+you\s+)?(what\s+(is|are|was|were)|how\s+(do|does|did|can|to)|why\s+(is|are|was|were|do|does)|when\s+(is|are|was|were|do|does)|where\s+(is|are|was|were|do|does)|tell\s+me\s+(about|more\s+about)?|explain|show\s+me|list|generate|create|make|give\s+me|export|produce|prepare|build|find|search\s+for|look\s+up)\s+/i;

const TITLE_MAX_WORDS = 5;

function titleFromMessage(text: string): string {
  let trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New conversation';

  // Strip at most one leading scaffolding phrase (repeat once more in case
  // of stacked lead-ins like "can you tell me about...").
  trimmed = trimmed.replace(TITLE_LEAD_IN_RE, '').replace(TITLE_LEAD_IN_RE, '').trim();
  trimmed = trimmed.replace(/^(a|an|the)\s+/i, '').trim();
  trimmed = trimmed.replace(/[?.!]+$/, '').trim();

  if (!trimmed) return 'New conversation';

  const words = trimmed.split(' ');
  const short = words.slice(0, TITLE_MAX_WORDS).join(' ');
  const capitalized = short.charAt(0).toUpperCase() + short.slice(1);
  return words.length > TITLE_MAX_WORDS ? `${capitalized}…` : capitalized;
}

export default function App({ onGoHome }: { onGoHome?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [kbStatus, setKbStatus] = useState<KnowledgeBaseStatus>({
    documentCount: 0,
    lastIndexed: 'Not indexed yet',
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(272);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth > 860);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initial load: conversations + knowledge base status come from the
  // backend (or mock data, depending on VITE_USE_MOCK_DATA).
  useEffect(() => {
    fetchConversations().then((convs) => {
      setConversations(convs);
      const active = convs.find((c) => c.active) ?? convs[0];
      if (active) {
        setActiveConversationId(active.id);
        fetchConversationHistory(active.id).then(setMessages);
      }
    });
    fetchKnowledgeBaseStatus().then(setKbStatus);
    // Knowledge-base status can change as documents are indexed in the
    // background; refresh it periodically instead of only once on load.
    const interval = setInterval(() => {
      fetchKnowledgeBaseStatus().then(setKbStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSend = async (text: string, attachments: Attachment[] = []) => {
    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      text,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);

    // First message in a fresh "New conversation" gets a real title,
    // the same way most chat apps derive one - purely local/frontend
    // for now, since there's no backend conversation persistence yet
    // (see handleNewConversation below).
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage && text.trim()) {
      const title = titleFromMessage(text);
      setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, title } : c)));
    }

    setIsLoading(true);
    setLiveSteps([]);
    try {
      const response = await sendMessageStream(
        text,
        (stepText) => setLiveSteps((prev) => [...prev, stepText]),
        activeConversationId
      );
      const aiMessage: ChatMessage = {
        id: nextId(),
        role: 'ai',
        text: response.answer || response.reply || 'No answer returned.',
        steps: response.steps,
        generated_file: response.generated_file,
        evidence: response.evidence,
        artifact: response.artifact,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: nextId(),
        role: 'ai',
        text: 'Unable to reach the local inference service. Check that the backend is running.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLiveSteps([]);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    fetchConversationHistory(id).then(setMessages);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = { id: `local-${Date.now()}`, title: 'New conversation' };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]);
    // Backend wiring: POST /conversations to persist the new conversation.
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeConversationId) {
        const fallback = next[0];
        if (fallback) {
          setActiveConversationId(fallback.id);
          fetchConversationHistory(fallback.id).then(setMessages);
        } else {
          setActiveConversationId('');
          setMessages([]);
        }
      }
      return next;
    });
    // Backend wiring: DELETE /conversations/{id} to persist the removal.
  };

  return (
    <div className="app" style={isDesktop ? { gridTemplateColumns: `${sidebarWidth}px 1fr` } : undefined}>
      <Sidebar
        workspace="Refinery Ops"
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        documentCount={kbStatus.documentCount}
        lastIndexed={kbStatus.lastIndexed}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        onGoHome={onGoHome}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <div className="main">
        <HeaderControls userInitials="RS" theme={theme} toggleTheme={toggleTheme} />
        <ChatThread
          title={activeConversation?.title ?? 'New conversation'}
          workspace="Refinery Ops"
          messages={messages}
          isLoading={isLoading}
          liveSteps={liveSteps}
        />
        <Composer onSend={handleSend} disabled={isLoading} />
      </div>

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
    </div>
  );
}
