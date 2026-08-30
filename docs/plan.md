# Development process — 10 days to Sep 9 demo

Companion to `GIT_WORKFLOW.md` — this maps each day's work to actual branches and merges,
so it's clear what should land on `main` and when.

## Day 1 (Aug 30) — Foundation
- Branches: `ranvir/backend-scaffold`, `<name>/frontend-scaffold`
- Merge target: both land on `main` by end of day — everything after this depends on
  these two existing, so don't let this slip.
- **Checkpoint:** `uvicorn main:app --reload` runs, `/chat` responds via the browser at
  `/docs`, frontend loads and can hit the backend.

## Day 2 (Aug 31) — Knowledge base
- Branches: `ranvir/rag-retrieval`, `<name>/sample-kb-docs`
- Merge target: `main` by end of day.
- **Checkpoint:** retrieval function returns relevant chunks for a test query, run
  standalone (script or `/docs` test) before wiring into anything else.

## Day 3 (Sep 1) — Reasoning loop
- Branch: `ranvir/agent-loop`
- Rebase onto `main` first (Day 2's RAG work needs to be in before this can call it).
- **Checkpoint:** agent can take a user message, decide to search the KB, and produce an
  answer using retrieved content. Reasoning steps logged/returned, not just the final answer.

## Day 4 (Sep 2) — Document generation
- Branches: `<name>/docx-generation`, `ranvir/agent-routing`
- Rebase both onto `main` (needs Day 3's agent loop).
- **Checkpoint:** agent can decide "generate a doc" vs. "just answer," and produces a real
  `.docx` file when it does.

## Day 5 (Sep 3) — Excel + network monitor
- Branches: `<name>/xlsx-generation`, `<name>/network-monitor`
- **Checkpoint:** XLSX generation working via the same pattern as Day 4's DOCX. Network
  monitor script running and logging connections (test it against something that DOES make
  an external call, to confirm it actually detects that, before trusting it shows "clean").

## Day 6 (Sep 4) — Full integration
- **No new branches today.** Everyone rebases their in-progress work onto latest `main`
  FIRST THING this morning, then focuses on merging and fixing what breaks.
- This is the day most likely to need pairing up to resolve conflicts — don't solo-debug
  something for hours if a second pair of eyes would resolve it faster.
- **Checkpoint:** the full flow works end-to-end at least once, even if rough.

## Day 7 (Sep 5) — Buffer
- No new feature branches. Bug-fix branches only (`fix/<short-description>`), merged as
  found.

## Day 8 (Sep 6) — Polish
- Branches: `<name>/ui-polish`, `ranvir/error-handling`
- **Checkpoint:** failure states (empty query, model timeout, malformed file) look
  intentional, not like a crash.

## Day 9 (Sep 7) — Dry run
- No new feature work. Full rehearsal against whatever's on `main`. Log every failure as an
  issue/note, don't fix live during the rehearsal itself — finish the run, then fix.

## Day 10 (Sep 8) — Final buffer + rehearsal
- Fix Day 9's findings, final rehearsal, then **freeze `main`** — no merges after the
  evening rehearsal, whatever's there is what you present.

## Sep 9 — Demo day
