import { useEffect, useState } from 'react';
import HeaderControls from './components/HeaderControls';
import Sidebar from './components/Sidebar';
import ChatThread from './components/ChatThread';
import Composer from './components/Composer';
import SearchOverlay from './components/SearchOverlay';
import { useTheme } from './hooks/useTheme';
import { fetchConversationHistory, fetchConversations, fetchKnowledgeBaseStatus, sendMessage } from './api/client';
import type { ChatMessage, Conversation, KnowledgeBaseStatus } from './types';

let messageIdCounter = 0;
const nextId = () => `m${++messageIdCounter}`;

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
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { id: nextId(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const response = await sendMessage(text, activeConversationId);
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

  return (
    <div className="app" style={isDesktop ? { gridTemplateColumns: `${sidebarWidth}px 1fr` } : undefined}>
      <Sidebar
        workspace="Refinery Ops"
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
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
        />
        <Composer onSend={handleSend} disabled={isLoading} />
      </div>

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
    </div>
  );
}
