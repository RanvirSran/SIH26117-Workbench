import type { ChatMessage, ChatResponse, Conversation, KnowledgeBaseStatus } from '../types';

export const mockConversations: Conversation[] = [
  { id: 'c1', title: 'P-102 shutdown SOP', timestamp: '4 min ago', active: true },
  { id: 'c2', title: 'LOTO isolation query', timestamp: 'Yesterday' },
  { id: 'c3', title: 'Vessel inspection rules', timestamp: '2 days ago' },
  { id: 'c4', title: 'Fire safety drawing review', timestamp: '4 days ago' },
];

export const mockKnowledgeBaseStatus: KnowledgeBaseStatus = {
  documentCount: 248,
  lastIndexed: 'Today · 14:32',
};

const mockChatReplyText =
  'Based on the retrieved refinery documents, the shutdown procedure requires isolating the upstream and downstream block valves, confirming zero pressure, verifying the vent line condition, and applying LOTO before maintenance begins.';

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
    answer: mockChatReplyText,
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
