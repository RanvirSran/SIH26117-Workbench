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

// --- POST-DEMO: richer evidence card (source count, chunk count, retrieval
// timing, per-source section/page location) — backend doesn't compute this
// yet. See /areas/sih2026-post-demo-ideas.md for the plan to add real
// instrumentation to retrieve.py before reviving this.
// export interface EvidenceData {
//   sourceCount: number;
//   chunkCount: number;
//   retrievalMs: number;
//   sources: Source[];
//   documentsInIndex: number;
//   excerpt: string;
// }

// --- POST-DEMO: structured checklist artifact — backend's docgen/xlsxgen
// tools return a downloadable file, not structured checklist items. Either
// revive this once docgen is changed to also emit structured data, or drop
// it in favor of a permanent simple "generated file" download link.
// export interface ArtifactData {
//   title: string;
//   items: ChecklistItem[];
//   sourcesLine: string;
// }

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  steps?: string[];        // reasoning trace — flat list of strings, matches backend's `steps`
  generatedFile?: string;  // download URL (e.g. "/download/foo.docx"), if the agent generated a file
  // evidence?: EvidenceData;  // POST-DEMO — see above
  // artifact?: ArtifactData;  // POST-DEMO — see above
}

// Shape returned by POST /chat. Matches backend/main.py's ChatResponse exactly.
export interface ChatResponse {
  reply: string;
  steps: string[];
  generated_file?: string | null;
}

export interface KnowledgeBaseStatus {
  documentCount: number;
  lastIndexed: string;
}

// Shape returned by POST /search. Matches backend/main.py's SearchResult exactly
// (text/source/distance) — `id` is generated client-side since the backend
// doesn't provide one, and `location` (section/page) isn't available yet.
export interface SearchResult {
  id: string;
  snippet: string;        // ← backend's `text`
  documentTitle: string;  // ← backend's `source`
  distance: number;
  // location?: string;    // POST-DEMO — needs per-chunk section/page metadata from retrieve.py
}

export interface ReasoningStep {
  id: string;
  label: string;
}