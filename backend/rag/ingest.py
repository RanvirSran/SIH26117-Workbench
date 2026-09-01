"""
SETUP
--------
pip install chromadb sentence-transformers pypdf

WHY CHUNKING MATTERS FOR THESE SPECIFIC DOCUMENTS (potential question)
-----------------------------------------------------
Your regulatory PDFs (Petroleum Rules, MSIHC) are built around numbered
sub-rules that cross-reference each other - "clause (c)" gets referenced
again three clauses later, "these rules" refers back to something
defined earlier. A naive fixed-size chunker (just cut every 500 words)
WILL sometimes slice a chunk in half mid-cross-reference, and the
retrieved chunk becomes meaningless without the missing context.

This script chunks by numbered rule/section boundaries where it can
detect them (looking for patterns like "43." or "(3)" at the start of
a line), falling back to paragraph-based splitting for anything that
doesn't match that pattern (like your manually-converted markdown
table). It's not perfect - genuinely messy PDFs may still chunk
awkwardly - but it's a meaningfully better default than fixed-size
splitting for this specific kind of document.
"""

import os
import re
from collections import Counter
import chromadb
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
 
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "sample_docs")
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")
COLLECTION_NAME = "sih26117_kb"
 
# All-MiniLM-L6-v2: small (80MB), fast, runs fine on CPU even without
# using your GPU (embeddings are much cheaper than LLM generation) -
# good default for a hackathon timeline, no need for anything fancier
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
 
 
def extract_text(filepath: str) -> str:
    """
    Pulls raw text out of a PDF, .txt, or .md file. For PDFs, this
    reads whatever text layer exists in the file - if a PDF is a
    scanned image with no real text layer, this will return empty or
    garbage, which is exactly the OCR problem flagged earlier. Worth
    eyeballing the output for any new document before trusting it.
    """
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        reader = PdfReader(filepath)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    else:  # .txt, .md
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
 
 
def strip_repeated_lines(text: str, min_repeats: int = 4) -> str:
    """
    Removes lines that repeat many times across the document - this
    catches page headers/footers like "ONGC - SOP Workover Operations
    - Onshore | 3" that appear on nearly every page. These are
    PAGINATION ARTIFACTS, not real content, but if left in they become
    short, keyword-dense chunks that falsely match almost any query
    mentioning the document's own title - exactly the "title matches
    query too much" problem you ran into.
 
    Strategy: count how many times each line appears (after light
    normalization - page numbers change but the surrounding text
    doesn't, so we strip digits before counting). Any line whose
    normalized form repeats min_repeats+ times gets dropped entirely.
    Real content essentially never repeats verbatim that many times,
    so this is safe - it targets furniture, not substance.
    """
    lines = text.split("\n")
    normalized = [re.sub(r'\d+', '#', line.strip()) for line in lines]
    counts = Counter(normalized)
 
    kept_lines = [
        line for line, norm in zip(lines, normalized)
        if counts[norm] < min_repeats or not norm  # keep blank lines regardless
    ]
    return "\n".join(kept_lines)
 
 
def chunk_text(text: str, source_name: str, chunk_size: int = 1000,
                 chunk_overlap: int = 150) -> list:
    """
    Splits text into chunks using LangChain's RecursiveCharacterTextSplitter
    instead of a hand-rolled regex. WHY THIS IS BETTER: it doesn't assume
    any particular document structure. It tries splitting on the biggest
    natural boundary first (double newlines - paragraph breaks), and only
    falls back to smaller boundaries (single newlines, then sentences,
    then words) if a piece is still too big. This means it handles legal
    numbered-clause text AND markdown-headed manuals AND tables reasonably
    well, without needing format-specific rules for each one.
 
    chunk_overlap: consecutive chunks share this many characters at their
    boundary. This helps when something relevant gets cut near a chunk
    edge - the overlap gives it a second chance to appear fully within
    an adjacent chunk instead of being awkwardly split with no context.
 
    Returns a list of dicts: {"text": ..., "source": ...}
    """
    text = strip_repeated_lines(text)
 
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    pieces = splitter.split_text(text)
 
    # Drop very short chunks (under ~80 chars) - these are usually
    # leftover furniture (stray headers, page numbers, table fragments)
    # rather than substantive content, and short keyword-dense chunks
    # are exactly what was causing false-positive matches.
    pieces = [p.strip() for p in pieces if len(p.strip()) > 80]
 
    return [{"text": p, "source": source_name} for p in pieces]
 
 
def ingest_all_documents():
    """
    Walks DATA_DIR, extracts + chunks every document, embeds each
    chunk, and stores everything in a persistent Chroma collection.
    Safe to re-run - deletes and rebuilds the collection each time,
    so you don't end up with duplicate chunks after re-running this
    a few times while testing (which you will).
    """
    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)
 
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    # delete_collection is safe to call even if it doesn't exist yet -
    # wrapped in try/except since Chroma raises if the collection is
    # missing on first-ever run
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    
    collection = client.create_collection(
        COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
 
    all_chunks = []
    for filename in os.listdir(DATA_DIR):
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.isfile(filepath):
            continue
        print(f"Processing {filename}...")
        text = extract_text(filepath)
        if len(text.strip()) < 50:
            print(f"  WARNING: barely any text extracted from {filename} - "
                  f"possibly a scanned PDF with no text layer. Skipping.")
            continue
        chunks = chunk_text(text, source_name=filename)
        all_chunks.extend(chunks)
        print(f"  -> {len(chunks)} chunks")
 
    if not all_chunks:
        print("No usable documents found - check DATA_DIR path and that "
              "files were actually placed there.")
        return
 
    print(f"\nEmbedding {len(all_chunks)} total chunks...")
    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=True)
 
    collection.add(
        ids=[f"chunk_{i}" for i in range(len(all_chunks))],
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=[{"source": c["source"]} for c in all_chunks],
    )
    print(f"Done. {len(all_chunks)} chunks stored in Chroma at {CHROMA_DIR}")
 
 
if __name__ == "__main__":
    ingest_all_documents()