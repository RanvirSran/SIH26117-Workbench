export interface Conversation {
  id: string;
  title: string;
  active?: boolean;
}

export interface ToolDef {
  id: string;
  name: string;
  status: 'ready' | 'busy' | 'offline';
  icon: 'search' | 'file' | 'calc' | 'code' | 'artifact';
}

export interface Source {
  title: string;
  location: string;
  /** Relative URL (resolved against API_URL) that opens the actual source document. */
  url?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface EvidenceData {
  sourceCount: number;
  chunkCount: number;
  retrievalMs: number;
  sources: Source[];
  documentsInIndex: number;
  excerpt: string;
}

export interface ArtifactData {
  title: string;
  items: ChecklistItem[];
  sourcesLine: string;
}

/** A file the user attached to a chat message via the composer's "+" button. */
export interface Attachment {
  name: string;
  url: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  steps?: string[];               // reasoning trace — flat list of strings, matches backend's `steps`
  generated_file?: string | null; // download URL (e.g. "/download/foo.docx"), if the agent generated a file
  evidence?: EvidenceData | null; // sources/excerpt backing an answer, from backend's agent.build_evidence()
  artifact?: ArtifactData;        // structured checklist artifact (demo/mock data path)
  attachments?: Attachment[];     // files the user attached when sending this message
}

// Shape returned by POST /chat and streamed (as the "final" event) by
// POST /chat/stream. Matches backend/main.py's ChatResponse, plus the
// mock-mode-only `answer`/`artifact` fields the frontend also accepts.
export interface ChatResponse {
  reply: string;
  answer?: string; // used by mock data; sendMessage() normalizes reply/answer into one field
  steps: string[];
  generated_file?: string | null;
  evidence?: EvidenceData | null;
  artifact?: ArtifactData;
}

/** One event from the POST /chat/stream Server-Sent Events stream. */
export type ChatStreamEvent =
  | { type: 'step'; text: string }
  | ({ type: 'final' } & ChatResponse);

export interface KnowledgeBaseStatus {
  documentCount: number;
  lastIndexed: string;
}

// Shape returned by POST /search, adapted client-side. `id` is
// generated client-side since the backend doesn't provide one.
export interface SearchResult {
  id: string;
  snippet: string;        // ← backend's `text`
  documentTitle: string;  // ← backend's `source`
  location: string;       // human-readable location/relevance label
  distance?: number;
  url?: string;           // opens the real source document, e.g. "/kb-docs/<file>"
}

export interface ReasoningStep {
  id: string;
  label: string;
}
