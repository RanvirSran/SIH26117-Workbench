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

Day 4/5 addendum: added /download/{filename} to serve files the agent
generates via the docgen/xlsxgen tools. IMPORTANT - GENERATED_DIR
below must point at the SAME folder docgen.py/xlsxgen.py actually
write to. Their OUTPUT_DIR is computed as
dirname(dirname(abspath(__file__)))/generated - if those files live
in backend/ alongside this one, that resolves to the REPO ROOT's
generated/ folder, not backend/generated/ despite what their
docstrings say. Confirm this matches before relying on downloads
working - mismatched paths here would mean the agent reports a file
was generated but /download/ 404s on it.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
import sys
import os

# Makes rag/ and agent/ importable from here. main.py sits directly in
# backend/, so both are simple children of this file's own directory -
# unlike agent.py, which is one level deeper and needs an extra
# dirname() to reach the same folders (see agent/agent.py).
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(_THIS_DIR, "rag"))
sys.path.append(os.path.join(_THIS_DIR, "agent"))

from retrieve import search as rag_search, get_kb_count
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

# docgen.py / xlsxgen.py live in backend/tools/ and compute their
# OUTPUT_DIR as dirname(dirname(__file__))/generated, which correctly
# resolves to backend/generated/. This file (main.py) sits one level
# SHALLOWER, directly in backend/ - so it only needs a single
# dirname() to land on the same folder. Using double dirname() here
# (like docgen.py does) would incorrectly point one level too high,
# at the repo root instead of backend/.
GENERATED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generated")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    steps: list[str] = []
    generated_file: str | None = None  # e.g. "/download/Notice_of_Disease_20260901_140212.docx"


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    text: str
    source: str
    distance: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


class KBStatusResponse(BaseModel):
    documentCount: int
    lastIndexed: str


@app.get("/health")
def health_check():
    """
    Quick sanity check: confirms FastAPI itself is running. Doesn't
    check Ollama - that's what /chat is for. Useful to hit first when
    debugging, so you know whether a problem is "FastAPI isn't running"
    vs "FastAPI is fine but Ollama isn't responding."
    """
    return {"status": "FastAPI is running"}


@app.get("/knowledge-base/status", response_model=KBStatusResponse)
def knowledge_base_status():
    """
    Returns total document/chunk count in local vector index.
    """
    count = get_kb_count()
    return KBStatusResponse(
        documentCount=count,
        lastIndexed="Active local index"
    )


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Day 3 update: this now runs the real agent loop instead of a bare
    Ollama call. The agent decides for itself whether it needs to
    search the knowledge base before answering - that decision, plus
    the search itself if it happens, is captured in `steps` for the
    reasoning-trace UI panel.

    Day 4/5 update: the agent may also decide to generate a Word or
    Excel file. If it does, `generated_file` is set to a relative
    download URL the frontend can point a link/button at directly -
    the raw local filesystem path is intentionally NOT sent to the
    frontend.
    """
    result = run_agent(request.message)

    generated_file_url = None
    if result.get("generated_file"):
        basename = os.path.basename(result["generated_file"])
        generated_file_url = f"/download/{basename}"

    return ChatResponse(
        reply=result["reply"],
        steps=result["steps"],
        generated_file=generated_file_url,
    )


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


@app.get("/download/{filename}")
def download_file(filename: str):
    """
    Serves a file the agent generated via generate_word_report or
    generate_excel_report.

    filename is attacker/model-controllable input (it comes from a
    URL path the frontend builds off whatever the agent returned), so
    this strips any directory components with os.path.basename and
    then verifies the resolved path is actually still inside
    GENERATED_DIR before serving anything - without that check, a
    filename like "../../etc/passwd" could walk outside the intended
    folder.
    """
    safe_name = os.path.basename(filename)
    filepath = os.path.join(GENERATED_DIR, safe_name)
    resolved = os.path.realpath(filepath)

    if not resolved.startswith(os.path.realpath(GENERATED_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.isfile(resolved):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(resolved, filename=safe_name)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)