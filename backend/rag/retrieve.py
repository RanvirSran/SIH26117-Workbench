"""
Day 2 part 2: retrieval - test that searching actually returns
relevant chunks, standalone, before wiring this into FastAPI or the
agent (that's Day 3). Run this AFTER ingest.py has populated Chroma.

Run with: python retrieve.py "your test question here"
"""

import sys
import chromadb
from sentence_transformers import SentenceTransformer

import os

CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")
COLLECTION_NAME = "sih26117_kb"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def search(query: str, n_results: int = 5):
    """
    Embeds the query with the SAME model used during ingestion (this
    has to match - you can't embed with one model and search with a
    different one, the vector spaces aren't compatible), then asks
    Chroma for the n_results closest chunks by embedding similarity.

    Returns a list of dicts: {"text": ..., "source": ..., "distance": ...}
    so this can be reused both by the CLI test below AND by the
    FastAPI /search endpoint - one function, two callers, no duplicated
    logic to keep in sync.
    """
    model = SentenceTransformer(EMBEDDING_MODEL)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_collection(COLLECTION_NAME)

    query_embedding = model.encode([query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results,
    )

    output = []
    for doc, meta, dist in zip(
        results["documents"][0], results["metadatas"][0], results["distances"][0]
    ):
        output.append({"text": doc, "source": meta["source"], "distance": dist})
    return output


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python retrieve.py \"your question here\"")
        sys.exit(1)
    query = " ".join(sys.argv[1:])
    results = search(query)

    print(f"\nQuery: {query}\n")
    for i, r in enumerate(results):
        print(f"--- Result {i+1} (source: {r['source']}, distance: {r['distance']:.4f}) ---")
        print(r["text"][:300] + ("..." if len(r["text"]) > 300 else ""))
        print()