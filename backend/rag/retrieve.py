"""
Day 2 part 2: retrieval.

Searches the local Chroma knowledge base using the same embedding model
used during ingestion.

The search applies a relevance threshold so Chroma does not blindly
return unrelated chunks for every query.

Run with:
    python retrieve.py "your test question here"
"""

import sys
import os

import chromadb
from sentence_transformers import SentenceTransformer


# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

CHROMA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "chroma_db"
)

COLLECTION_NAME = "sih26117_kb"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Initial threshold for cosine distance.
#
# Lower distance = more semantically similar.
# This should be tuned using real queries from your knowledge base.
MAX_DISTANCE = 0.6


# -------------------------------------------------------------------
# Load models / database once
# -------------------------------------------------------------------
#
# These are intentionally loaded at module level rather than inside
# search(). This prevents the embedding model from being loaded again
# every time the agent performs a RAG search.
# -------------------------------------------------------------------

print("Loading embedding model...")
model = SentenceTransformer(EMBEDDING_MODEL)

client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_collection(COLLECTION_NAME)


# -------------------------------------------------------------------
# Search
# -------------------------------------------------------------------

def search(
    query: str,
    n_results: int = 5,
    max_distance: float = MAX_DISTANCE
) -> list:
    """
    Search the local knowledge base for chunks relevant to the query.

    Parameters:
        query:
            User's search query.

        n_results:
            Maximum number of candidate chunks to retrieve from Chroma.

        max_distance:
            Maximum allowed cosine distance.
            Results farther away than this are considered irrelevant
            and are discarded.

    Returns:
        A list of dictionaries:

        [
            {
                "text": "...",
                "source": "...",
                "distance": 0.32
            }
        ]

        Returns an empty list when no chunks pass the relevance
        threshold.
    """

    if not query or not query.strip():
        return []

    # Convert query into the same embedding space used during ingestion.
    query_embedding = model.encode([query]).tolist()

    # Retrieve candidate chunks.
    #
    # We retrieve n_results first and then apply our own relevance
    # threshold below.
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results,
    )

    output = []

    # Chroma returns nested lists because queries can contain multiple
    # embeddings. We only send one query, so use [0].
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, dist in zip(
        documents,
        metadatas,
        distances
    ):
        # Lower cosine distance means greater similarity.
        if dist <= max_distance:
            output.append({
                "text": doc,
                "source": meta["source"],
                "distance": dist,
            })

    return output


# -------------------------------------------------------------------
# Standalone CLI test
# -------------------------------------------------------------------

if __name__ == "__main__":

    if len(sys.argv) < 2:
        print('Usage: python retrieve.py "your question here"')
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    results = search(query)

    print(f"\nQuery: {query}")
    print(f"Relevant results: {len(results)}\n")

    if not results:
        print("No relevant documents found in the knowledge base.")
        sys.exit(0)

    for i, result in enumerate(results):

        print(
            f"--- Result {i + 1} "
            f"(source: {result['source']}, "
            f"distance: {result['distance']:.4f}) ---"
        )

        text = result["text"]

        print(
            text[:500] +
            ("..." if len(text) > 500 else "")
        )

        print()