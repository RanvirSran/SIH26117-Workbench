import { API_URL, USE_MOCK_DATA } from '../config';
import { mockChatReply, mockConversations, mockKnowledgeBaseStatus, mockMessageHistory, mockSearch } from '../data/mockData';
import type { Attachment, ChatMessage, ChatResponse, ChatStreamEvent, Conversation, KnowledgeBaseStatus, SearchResult } from '../types';

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
 * Sends a chat message to FastAPI POST /chat and returns the full
 * response in one shot (no live step updates). Used as a fallback when
 * streaming isn't available; prefer sendMessageStream() for normal use.
 */
export async function sendMessage(message: string, _conversationId?: string): Promise<ChatResponse> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    return mockChatReply(message);
  }

  try {
    const raw = await request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return { ...raw, answer: raw.reply };
  } catch (err) {
    console.warn('Real backend unreachable, falling back to mock mode:', err);
    return mockChatReply(message);
  }
}

/**
 * Streams a chat message via POST /chat/stream (Server-Sent Events),
 * invoking `onStep` with each reasoning-trace line as the backend
 * actually produces it, then resolving with the final response once
 * the "final" event arrives.
 *
 * Falls back to mock data (with a short artificial step sequence) when
 * USE_MOCK_DATA is set, and falls back to the non-streaming sendMessage()
 * if the stream can't be opened at all (backend down, old backend
 * without /chat/stream, etc).
 */
export async function sendMessageStream(
  message: string,
  onStep: (text: string) => void,
  _conversationId?: string
): Promise<ChatResponse> {
  if (USE_MOCK_DATA) {
    const steps = [
      'Searching knowledge base...',
      'Found 3 relevant results...',
      'Cross-checking against source documents...',
      'Generating answer...',
    ];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 260));
      onStep(step);
    }
    return mockChatReply(message);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    console.warn('Streaming chat unreachable, falling back to sendMessage():', err);
    return sendMessage(message, _conversationId);
  }

  if (!res.ok || !res.body) {
    console.warn(`Streaming chat failed (${res.status}), falling back to sendMessage()`);
    return sendMessage(message, _conversationId);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final: ChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; each frame's payload
    // line is prefixed with "data: ".
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const jsonText = line.slice(5).trim();
      if (!jsonText) continue;

      try {
        const event = JSON.parse(jsonText) as ChatStreamEvent;
        if (event.type === 'step') {
          onStep(event.text);
        } else if (event.type === 'final') {
          final = { ...event, answer: event.reply };
        }
      } catch (err) {
        console.warn('Malformed stream event, skipping:', jsonText, err);
      }
    }
  }

  if (!final) {
    console.warn('Stream ended without a final event, falling back to sendMessage()');
    return sendMessage(message, _conversationId);
  }

  return final;
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
      location: `Relevance ${Math.max(0, Math.min(100, Math.round((1 - item.distance) * 100)))}%`,
      distance: item.distance,
      url: item.source ? `/kb-docs/${encodeURIComponent(item.source)}` : undefined,
    }));
  } catch (err) {
    console.warn('Backend search failed, falling back to mock search:', err);
    return mockSearch(query);
  }
}

/**
 * Uploads a file attached in the composer via POST /upload. Returns the
 * Attachment the frontend attaches to the outgoing chat message.
 */
export async function uploadFile(file: File): Promise<Attachment> {
  if (USE_MOCK_DATA) {
    await new Promise((r) => setTimeout(r, 300));
    return { name: file.name, url: '#', size: file.size };
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { name: data.filename, url: data.url, size: data.size };
}
