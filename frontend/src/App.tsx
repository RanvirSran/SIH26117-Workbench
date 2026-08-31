import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ChatThread from './components/ChatThread';
import Composer from './components/Composer';
import StatusBar from './components/StatusBar';
import { useTheme } from './hooks/useTheme';
import { fetchConversationHistory, fetchConversations, fetchKnowledgeBaseStatus, sendMessage } from './api/client';
import type { ChatMessage, Conversation, KnowledgeBaseStatus } from './types';

let messageIdCounter = 0;
const nextId = () => `m${++messageIdCounter}`;

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [kbStatus, setKbStatus] = useState<KnowledgeBaseStatus>({
    documentCount: 0,
    lastIndexed: '—',
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        text: response.answer,
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
    <div className="app">
      <TopBar workspace="Refinery Ops" model="Local-32B-Instruct" userInitials="RS" theme={theme} toggleTheme={toggleTheme} />

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        documentCount={kbStatus.documentCount}
        lastIndexed={kbStatus.lastIndexed}
      />

      <div className="main">
        <ChatThread
          title={activeConversation?.title ?? 'New conversation'}
          workspace="Refinery Ops"
          model="Local-32B-Instruct"
          messages={messages}
          isLoading={isLoading}
        />
        <Composer onSend={handleSend} disabled={isLoading} />
      </div>

      <StatusBar documentCount={kbStatus.documentCount} version="v0.9.2-onprem" />
    </div>
  );
}
