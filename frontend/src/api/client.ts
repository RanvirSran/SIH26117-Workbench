import { API_URL, USE_MOCK_DATA } from '../config';
import { mockChatReply, mockConversations, mockKnowledgeBaseStatus, mockMessageHistory, mockSearch } from '../data/mockData';
import type { ChatMessage, ChatResponse, Conversation, KnowledgeBaseStatus, SearchResult } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Sends a chat message to FastAPI POST /chat and returns the AI response with steps & file URL.
 */
export async function sendMessage(message: string, _conversationId?: string): Promise<ChatResponse> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return mockChatReply(message);
  }

  try {
    const raw = await request<{ reply: string; steps?: string[]; generated_file?: string | null }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });

    return {
      answer: raw.reply,
      reply: raw.reply,
      steps: raw.steps ?? [],
      generated_file: raw.generated_file,
    };
  } catch (err) {
    console.warn('Real backend unreachable, falling back to mock mode:', err);
    return mockChatReply(message);
  }
}

/**
 * Fetches conversations list.
 */
export async function fetchConversations(): Promise<Conversation[]> {
  if (USE_MOCK_DATA) return mockConversations;
  try {
    return await request<Conversation[]>('/conversations');
  } catch {
    return mockConversations;
  }
}

/**
 * Fetches conversation history.
 */
export async function fetchConversationHistory(conversationId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_DATA) return mockMessageHistory[conversationId] ?? [];
  try {
    return await request<ChatMessage[]>(`/conversations/${conversationId}/messages`);
  } catch {
    return mockMessageHistory[conversationId] ?? [];
  }
}

/**
 * Backend contract: GET {API_URL}/knowledge-base/status
 */
export async function fetchKnowledgeBaseStatus(): Promise<KnowledgeBaseStatus> {
  if (USE_MOCK_DATA) return mockKnowledgeBaseStatus;
  try {
    return await request<KnowledgeBaseStatus>('/knowledge-base/status');
  } catch {
    return mockKnowledgeBaseStatus;
  }
}

/**
 * Searches across the indexed company document set via FastAPI POST /search.
 */
export async function searchDocuments(query: string): Promise<SearchResult[]> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return mockSearch(query);
  }

  try {
    const data = await request<{ results: Array<{ text: string; source: string; distance: number }> }>('/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });

    return (data.results || []).map((item, idx) => ({
      id: `sr-${idx}-${Date.now()}`,
      snippet: item.text,
      documentTitle: item.source || 'Knowledge Base Document',
      location: `Distance: ${item.distance.toFixed(4)}`,
    }));
  } catch (err) {
    console.warn('Backend search failed, falling back to mock search:', err);
    return mockSearch(query);
  }
}
