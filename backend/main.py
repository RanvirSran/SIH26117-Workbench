"""
SETUP (do this before running)
---------------------------------
1. Install Ollama from ollama.com (Windows installer, GUI-based, no
   command-line install needed).
2. Once installed, Ollama runs as a background service on
   http://localhost:11434 automatically - you don't need to manually
   start a server for it.
3. Pull a small model that fits your 6GB VRAM. Open a terminal and run:
       ollama pull llama3.2:3b
   This downloads the model once; after that it runs fully offline.
4. pip install fastapi uvicorn requests --break-system-packages
   (drop --break-system-packages if you're using a virtual environment,
   which is worth setting up soon if you haven't - keeps this project's
   dependencies separate from anything else on your machine)
5. Run this file with: uvicorn main:app --reload
6. Test it by opening http://localhost:8000/docs in a browser - FastAPI
   auto-generates an interactive test page for your endpoints, no
   frontend needed yet to check this works.

WHY FASTAPI CALLS OLLAMA OVER HTTP, NOT AS A PYTHON LIBRARY
----------------------------------------------------------------
Ollama runs as its own local server process (started automatically
when you install it). Your FastAPI app talks to it the same way it
would talk to any API - just that "any API" here is on your own
machine (localhost), never leaving it. This is exactly the pattern
that makes the "zero external calls" proof possible later: every
network call your monitor observes will show 127.0.0.1 (localhost)
as the destination, never a real external IP.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import sys
import os

# Makes the rag/ folder importable from here - adjust if your folder
# layout ends up different from backend/main.py + backend/rag/retrieve.py
sys.path.append(os.path.join(os.path.dirname(__file__), "rag"))
from retrieve import search as rag_search
from agent import run_agent

app = FastAPI(title="SIH26117 - Sovereign AI Workbench (Day 1 scaffold)")

# CORS: allows your React frontend (running on a different local port,
# e.g. localhost:5173) to call this backend (localhost:8000) from the
# browser. Without this, the browser blocks the request even though
# both are on your own machine - a common early confusion point.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev; would tighten this for
                          # anything beyond a hackathon demo
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:3b"  # change this if you pulled a different model


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    steps: list[str] = []


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    text: str
    source: str
    distance: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


@app.get("/health")
def health_check():
    """
    Quick sanity check: confirms FastAPI itself is running. Doesn't
    check Ollama - that's what /chat is for. Useful to hit first when
    debugging, so you know whether a problem is "FastAPI isn't running"
    vs "FastAPI is fine but Ollama isn't responding."
    """
    return {"status": "FastAPI is running"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Day 3 update: this now runs the real agent loop instead of a bare
    Ollama call. The agent decides for itself whether it needs to
    search the knowledge base before answering - that decision, plus
    the search itself if it happens, is captured in `steps` for the
    reasoning-trace UI panel.
    """
    result = run_agent(request.message)
    return ChatResponse(reply=result["reply"], steps=result["steps"])


@app.post("/search", response_model=SearchResponse)
def search_kb(request: SearchRequest):
    """
    Matches the SearchResponse shape your web-dev teammates are
    already building the UI against (source, text, distance per
    result) - calling the real retrieve.py search() function under
    the hood, so this is genuinely searching your actual Chroma
    knowledge base, not returning mock data.
    """
    raw_results = rag_search(request.query)
    return SearchResponse(results=[SearchResult(**r) for r in raw_results])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)