import type { ChatMessage, ChatResponse, Conversation, KnowledgeBaseStatus, ReasoningStep, SearchResult } from '../types';

export const mockConversations: Conversation[] = [
  { id: 'c1', title: 'P-102 shutdown SOP', active: true },
  { id: 'c2', title: 'LOTO isolation query' },
  { id: 'c3', title: 'Vessel inspection rules' },
  { id: 'c4', title: 'Fire safety drawing review' },
];

export const mockKnowledgeBaseStatus: KnowledgeBaseStatus = {
  documentCount: 248,
  lastIndexed: 'Today · 14:32',
};

const mockChatReplyText =
  '## Shutdown requirements\n\n' +
  'Based on the retrieved refinery documents, the shutdown procedure for Pump P-102 requires:\n\n' +
  '1. Isolating the **upstream and downstream block valves**\n' +
  '2. Confirming **zero pressure** at the local gauge\n' +
  '3. Verifying the **vent line condition** is clear of obstruction\n' +
  '4. Applying **LOTO** before maintenance begins\n';

// Seeded history so the default conversation isn't empty on first load.
export const mockMessageHistory: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: 'seed-1',
      role: 'user',
      text: 'What are the shutdown requirements for Pump P-102 according to the SOP?',
    },
    {
      id: 'seed-2',
      role: 'ai',
      text: mockChatReplyText,
      evidence: {
        sourceCount: 3,
        chunkCount: 3,
        retrievalMs: 42,
        documentsInIndex: 248,
        sources: [
          { title: 'SMPV(U) Rules, 2016', location: 'Section 4.2' },
          { title: 'Petroleum Rules, 2002', location: 'Section 12' },
          { title: 'P-102 Equipment Manual', location: 'Page 18' },
        ],
        excerpt:
          '...isolation of upstream and downstream block valves shall be confirmed prior to any maintenance activity, with zero pressure verified at the local gauge before disconnection...',
      },
      artifact: {
        title: 'P-102 SHUTDOWN CHECKLIST',
        sourcesLine: 'P-102 Equipment Manual §18 · Petroleum Rules, 2002 §12',
        items: [
          { id: '1', label: 'Isolate upstream block valve', done: true },
          { id: '2', label: 'Isolate downstream block valve', done: true },
          { id: '3', label: 'Verify pressure = 0', done: false },
          { id: '4', label: 'Confirm vent line condition', done: false },
          { id: '5', label: 'Apply LOTO', done: false },
          { id: '6', label: 'Obtain supervisor verification', done: false },
        ],
      },
    },
  ],
};

// Canned reply used in mock mode. A real backend would generate this from
// the actual message text; here it always returns the P-102 demo answer so
// the frontend is fully demoable without a backend running.
export function mockChatReply(_message: string): ChatResponse {
  return {
    reply: mockChatReplyText,
    answer: mockChatReplyText,
    steps: [
      'Searching knowledge base...',
      'Found 3 relevant results...',
      'Cross-checking against source documents...',
      'Generating answer...',
    ],
    evidence: {
      sourceCount: 3,
      chunkCount: 3,
      retrievalMs: 42,
      documentsInIndex: 248,
      sources: [
        { title: 'SMPV(U) Rules, 2016', location: 'Section 4.2' },
        { title: 'Petroleum Rules, 2002', location: 'Section 12' },
        { title: 'P-102 Equipment Manual', location: 'Page 18' },
      ],
      excerpt:
        '...isolation of upstream and downstream block valves shall be confirmed prior to any maintenance activity, with zero pressure verified at the local gauge before disconnection...',
    },
    artifact: {
      title: 'P-102 SHUTDOWN CHECKLIST',
      sourcesLine: 'P-102 Equipment Manual §18 · Petroleum Rules, 2002 §12',
      items: [
        { id: '1', label: 'Isolate upstream block valve', done: true },
        { id: '2', label: 'Isolate downstream block valve', done: true },
        { id: '3', label: 'Verify pressure = 0', done: false },
        { id: '4', label: 'Confirm vent line condition', done: false },
        { id: '5', label: 'Apply LOTO', done: false },
        { id: '6', label: 'Obtain supervisor verification', done: false },
      ],
    },
  };
}

// Placeholder search corpus so the search UI is fully demoable before the
// real /search endpoint exists. Swap mockSearch() for the real API call in
// src/api/client.ts once it's ready; the SearchResult shape won't change.
const mockSearchCorpus: SearchResult[] = [
  {
    id: 's1',
    snippet: 'Isolation of upstream and downstream block valves shall be confirmed prior to any maintenance activity, with zero pressure verified at the local gauge before disconnection.',
    documentTitle: 'P-102 Equipment Manual',
    location: 'Page 18',
  },
  {
    id: 's2',
    snippet: 'Lock-out/tag-out devices must remain in place until all affected personnel have signed off and the equipment has been visually confirmed de-energized.',
    documentTitle: 'LOTO Isolation Procedure',
    location: 'Section 3.1',
  },
  {
    id: 's3',
    snippet: 'Pressure vessels operating above design threshold require inspection at intervals not exceeding those set out in the applicable statutory rules.',
    documentTitle: 'SMPV(U) Rules, 2016',
    location: 'Section 4.2',
  },
  {
    id: 's4',
    snippet: 'A hot work permit is required before any welding, cutting, or grinding activity within 15 metres of a flammable storage area.',
    documentTitle: 'Fire Safety Drawing Review',
    location: 'Page 4',
  },
  {
    id: 's5',
    snippet: 'Vent line condition must be confirmed clear of obstruction before depressurization begins, with a secondary check logged by the shift supervisor.',
    documentTitle: 'Vessel Inspection Rules',
    location: 'Section 7',
  },
];

export function mockSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const matches = mockSearchCorpus.filter(
    (r) => r.snippet.toLowerCase().includes(q) || r.documentTitle.toLowerCase().includes(q)
  );
  // Falls back to a representative sample so the demo never shows an empty
  // state for an unrecognized query; a real backend would return true
  // relevance-ranked results instead.
  return matches.length > 0 ? matches : mockSearchCorpus.slice(0, 3);
}

// Placeholder step sequence for the reasoning panel, used only as a last
// resort (mock mode, or if a stream ends with zero step events). The real
// live steps now come from the backend's /chat/stream events as they
// actually happen — see ReasoningPanel's `liveStep` prop.
export const mockReasoningSteps: ReasoningStep[] = [
  { id: 'r1', label: 'Searching knowledge base...' },
  { id: 'r2', label: 'Found 3 relevant results...' },
  { id: 'r3', label: 'Cross-checking against source documents...' },
  { id: 'r4', label: 'Generating answer...' },
];
