# SIH26117 — Sovereign On-Premise Agentic AI Workbench

Air-gapped, self-hosted agentic AI workbench. See `/docs/architecture.md` for the full
system design and `/docs/GIT_WORKFLOW.md` for how we're using this repo day-to-day.

## Structure

```
backend/
  main.py              # FastAPI app (Day 1)
  rag/                 # embeddings + Chroma retrieval (Day 2)
  agent/               # LangGraph agent loop (Day 3)
  tools/
    docgen.py           # DOCX generation (Day 4)
    xlsxgen.py           # XLSX generation (Day 5)
  monitor/             # network monitor / offline proof (Day 5)
  requirements.txt

frontend/
  # React app

data/
  sample_docs/         # knowledge base source documents (not committed if large -
                        # check .gitignore, add a note here on where to get them if so)

docs/
  architecture.md
  GIT_WORKFLOW.md
```

## Running locally

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

