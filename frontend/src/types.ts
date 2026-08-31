export interface Conversation {
  id: string;
  title: string;
  timestamp: string; // e.g. "4 min ago" — shown under the title in the sidebar
  active?: boolean;
}

export interface ToolDef {
  id: string;
  name: string;
  status: 'ready' | 'busy' | 'offline';
  icon: 'search' | 'file' | 'calc' | 'code' | 'artifact';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  evidence?: EvidenceData;
  artifact?: ArtifactData;
}

// Shape returned by POST /chat. Backend devs: match this, or update it to
// match your actual response and adjust src/api/client.ts accordingly.
export interface ChatResponse {
  answer: string;
  evidence?: EvidenceData;
  artifact?: ArtifactData;
}

export interface KnowledgeBaseStatus {
  documentCount: number;
  lastIndexed: string;
}

export interface Source {
  title: string;
  location: string;
}
