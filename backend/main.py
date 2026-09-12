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

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import requests
import json
import sys
import os
import re
import uuid

# Makes rag/ and agent/ importable from here. main.py sits directly in
# backend/, so both are simple children of this file's own directory -
# unlike agent.py, which is one level deeper and needs an extra
# dirname() to reach the same folders (see agent/agent.py).
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(_THIS_DIR, "rag"))
sys.path.append(os.path.join(_THIS_DIR, "agent"))

from retrieve import search as rag_search, get_kb_count, get_document_count
from ingest import extract_text, strip_repeated_lines
from agent import run_agent, run_agent_stream

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

# Where the RAG knowledge-base source documents actually live (the same
# folder ingest.py reads from). Used by GET /kb-docs/{filename} so a
# citation in the UI can open the real source document, not just name it.
DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_docs"
)

# Where files the USER attaches to a chat message get saved. Separate
# from GENERATED_DIR (agent output) and DATA_DIR (knowledge base) since
# these are neither - just ephemeral chat attachments.
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_UPLOAD_EXTENSIONS = {".txt", ".md", ".xlsx", ".doc", ".docx", ".pdf"}


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    steps: list[str] = []
    generated_file: str | None = None  # e.g. "/download/Notice_of_Disease_20260901_140212.docx"
    evidence: dict | None = None  # sources/excerpt/etc - see agent.build_evidence()


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
    Returns the real, current count of DISTINCT source documents in
    the local vector index (not chunks - get_document_count() dedupes
    by source filename, see retrieve.py for why that distinction
    matters).
    """
    count = get_document_count()
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
        evidence=result.get("evidence"),
    )


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    """
    Same agent pipeline as POST /chat, but streamed as Server-Sent
    Events so the frontend can show each reasoning step the moment it
    actually happens instead of a canned loading placeholder.

    Each event is one line: `data: <json>\\n\\n`, matching the SSE
    spec so the browser's EventSource-style parsing (or a manual
    fetch + ReadableStream reader, which is what the frontend uses so
    it can POST a body) works without extra framing.

    Event shapes:
        {"type": "step", "text": "..."}
        {"type": "final", "reply": "...", "steps": [...],
         "generated_file": "/download/..." | null,
         "evidence": {...} | null}
    """

    def event_stream():
        for event in run_agent_stream(request.message):
            if event["type"] == "final" and event.get("generated_file"):
                basename = os.path.basename(event["generated_file"])
                event = {**event, "generated_file": f"/download/{basename}"}
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # nginx-specific, harmless elsewhere: stops a reverse proxy
            # from buffering the whole response before sending it on,
            # which would defeat the point of streaming.
            "X-Accel-Buffering": "no",
        },
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


@app.get("/kb-docs/{filename}")
def get_kb_document(filename: str):
    """
    Serves an original source document from the knowledge base
    (data/sample_docs/) so a citation/source card in the UI can open
    the actual regulation/SOP it's quoting, not just name it.

    Same path-traversal guard as /download/{filename} above - filename
    comes from a citation the model attached to its own answer, so
    it's model-controllable input and gets the same basename +
    resolved-path check before anything is served.
    """
    safe_name = os.path.basename(filename)
    filepath = os.path.join(DATA_DIR, safe_name)
    resolved = os.path.realpath(filepath)

    if not resolved.startswith(os.path.realpath(DATA_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.isfile(resolved):
        raise HTTPException(status_code=404, detail="Source document not found")

    return FileResponse(resolved, filename=safe_name)


class KbDocContent(BaseModel):
    filename: str
    text: str


@app.get("/kb-docs/{filename}/content", response_model=KbDocContent)
def get_kb_document_content(filename: str):
    """
    Returns extracted plain text for a knowledge-base source document,
    for the frontend's in-app preview panel (req: don't just force a
    file download when someone clicks a citation - show them the
    actual passage in place, themed like the rest of the app).

    Reuses ingest.py's own extract_text()/strip_repeated_lines() so
    what's shown here matches what was actually indexed as closely as
    possible - same path-traversal guard as the two endpoints above.
    """
    safe_name = os.path.basename(filename)
    filepath = os.path.join(DATA_DIR, safe_name)
    resolved = os.path.realpath(filepath)

    if not resolved.startswith(os.path.realpath(DATA_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.isfile(resolved):
        raise HTTPException(status_code=404, detail="Source document not found")

    try:
        text = extract_text(resolved)
        text = strip_repeated_lines(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to extract document text: {exc}")

    return KbDocContent(filename=safe_name, text=text)


class UploadResponse(BaseModel):
    filename: str
    url: str
    size: int


@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts a file attached to the composer (.txt/.md/.xlsx/.doc/
    .docx/.pdf) and saves it under UPLOAD_DIR so it can be linked back
    to and downloaded from the chat thread.

    NOTE - scope: this makes attachments uploadable and shareable in
    the thread, which is what was asked for. It does NOT yet feed the
    file's contents into the agent's RAG/reasoning pipeline - the
    agent still only searches the indexed knowledge base. Wiring an
    attachment into a single turn's context is a reasonable next step
    but a separate piece of work from "make the attach button work".
    """
    original_name = file.filename or "attachment"
    ext = os.path.splitext(original_name)[1].lower()

    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. Allowed: "
                f"{', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}"
            ),
        )

    # Prefix with a short random id so two people attaching
    # "checklist.pdf" on the same day don't clobber each other, while
    # keeping the original name (sanitized) visible/downloadable.
    safe_original = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(original_name))
    stored_name = f"{uuid.uuid4().hex[:8]}_{safe_original}"
    dest_path = os.path.join(UPLOAD_DIR, stored_name)

    contents = await file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    return UploadResponse(
        filename=original_name,
        url=f"/uploads/{stored_name}",
        size=len(contents),
    )


@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str):
    """Serves a file previously saved by POST /upload."""
    safe_name = os.path.basename(filename)
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    resolved = os.path.realpath(filepath)

    if not resolved.startswith(os.path.realpath(UPLOAD_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.isfile(resolved):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(resolved, filename=safe_name)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)