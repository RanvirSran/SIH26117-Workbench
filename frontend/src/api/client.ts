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
 * Sends a chat message and returns the AI response.
 * Backend contract: POST {API_URL}/chat  body: { message: string, conversationId: string }
 * Expected response shape: ChatResponse (see src/types.ts)
 */
export async function sendMessage(message: string, conversationId: string): Promise<ChatResponse> {
  if (USE_MOCK_DATA) {
    // Simulated latency so the UI's loading states are exercised in mock mode too.
    await new Promise((r) => setTimeout(r, 400));
    return mockChatReply(message);
  }
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId }),
  });
}

/**
 * Backend contract: GET {API_URL}/conversations
 * Expected response shape: Conversation[] (see src/types.ts)
 */
export async function fetchConversations(): Promise<Conversation[]> {
  if (USE_MOCK_DATA) return mockConversations;
  return request<Conversation[]>('/conversations');
}

/**
 * Backend contract: GET {API_URL}/conversations/{id}/messages
 * Expected response shape: ChatMessage[] (see src/types.ts)
 */
export async function fetchConversationHistory(conversationId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_DATA) return mockMessageHistory[conversationId] ?? [];
  return request<ChatMessage[]>(`/conversations/${conversationId}/messages`);
}

/**
 * Backend contract: GET {API_URL}/knowledge-base/status
 * Expected response shape: KnowledgeBaseStatus (see src/types.ts)
 */
export async function fetchKnowledgeBaseStatus(): Promise<KnowledgeBaseStatus> {
  if (USE_MOCK_DATA) return mockKnowledgeBaseStatus;
  return request<KnowledgeBaseStatus>('/knowledge-base/status');
}

/**
 * Searches across the indexed company document set.
 * Backend contract: GET {API_URL}/search?q={query}
 * Expected response shape: SearchResult[] (see src/types.ts)
 * TODO: swap the mock branch for the real endpoint once it's ready.
 */
export async function searchDocuments(query: string): Promise<SearchResult[]> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return mockSearch(query);
  }
  return request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
}
