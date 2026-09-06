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
  steps?: string[];
  generated_file?: string | null;
  evidence?: EvidenceData;
  artifact?: ArtifactData;
}

// Raw or mapped shape returned by POST /chat.
export interface ChatResponse {
  reply?: string;
  answer?: string;
  steps?: string[];
  generated_file?: string | null;
  evidence?: EvidenceData;
  artifact?: ArtifactData;
}

export interface BackendSearchResult {
  text: string;
  source: string;
  distance: number;
}

export interface KnowledgeBaseStatus {
  documentCount: number;
  lastIndexed: string;
}

export interface SearchResult {
  id: string;
  snippet: string;
  documentTitle: string;
  location: string;
}

export interface ReasoningStep {
  id: string;
  label: string;
}
