"""
Agent for the safety regulations / SOP system.

There are two execution paths:

1. Normal conversational questions
   --------------------------------
   Uses a LangChain ReAct-style agent with the knowledge-base search
   tool.

2. File-generation requests
   -------------------------
   File generation is handled deterministically:

       user request
           ↓
       detect file type
           ↓
       RAG search
           ↓
       LLM produces grounded summary
           ↓
       Python builds document data
           ↓
       docgen.py / xlsxgen.py
           ↓
       generated file

This intentionally avoids asking llama3.2:3b to generate deeply nested
Pydantic tool arguments. Small local models are significantly less
reliable at that task.

The actual file-generation functions live in docgen.py and xlsxgen.py.
"""

import os
import sys
import time

from langchain_ollama import ChatOllama
from langchain_core.tools import tool
from langchain.agents import create_agent


# ---------------------------------------------------------------------
# Local imports
# ---------------------------------------------------------------------

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

sys.path.append(os.path.join(_BACKEND_DIR, "rag"))
sys.path.append(os.path.join(_BACKEND_DIR, "tools"))

from retrieve import search as rag_search, get_document_count
from docgen import generate_docx
from xlsxgen import generate_xlsx


# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

MODEL_NAME = "llama3.2:3b"

# num_predict caps how many tokens a single generation can produce.
# Kept as a hard ceiling against runaway/repetitive generations - even
# though the specific failure mode that first triggered this (nested
# tool-call JSON going off the rails) no longer applies to this
# deterministic-pipeline design, an unbounded generation is still a
# bad thing to leave possible in front of judges. 800 is a generous
# guess for how long a legitimate answer/summary should run, not a
# tuned value - raise it if real answers are getting cut off.
llm = ChatOllama(
    model=MODEL_NAME,
    temperature=0,
    num_predict=500,
    timeout=120.0,
)


# =====================================================================
# KNOWLEDGE BASE TOOL
# =====================================================================

def build_evidence(results: list, retrieval_ms: float) -> dict | None:
    """
    Turn raw retrieve.py results into the evidence-card shape the
    frontend renders (source list, excerpt, relevance, etc).

    Returns None when there's nothing to show (no retrieval happened,
    or it came back empty) so callers can just omit the evidence
    block instead of rendering an empty one.
    """
    if not results:
        return None

    sources = []
    seen_titles = set()

    for r in results:
        title = r.get("source", "Unknown source")
        if title in seen_titles:
            continue
        seen_titles.add(title)

        distance = r.get("distance", 0) or 0
        relevance_pct = max(0, min(100, round((1 - distance) * 100)))

        sources.append({
            "title": title,
            "location": f"Relevance {relevance_pct}%",
            # Frontend resolves this against API_URL and opens it directly -
            # see GET /kb-docs/{filename} in main.py.
            "url": f"/kb-docs/{title}",
        })

    excerpt = (results[0].get("text", "") or "").strip()
    if len(excerpt) > 320:
        excerpt = excerpt[:320].rstrip() + "..."

    return {
        "sourceCount": len(sources),
        "chunkCount": len(results),
        "retrievalMs": round(retrieval_ms),
        "documentsInIndex": get_document_count(),
        "sources": sources,
        "excerpt": excerpt,
    }


# Set by search_knowledge_base each time it runs, read back by
# run_agent_stream() right after the agent finishes so the final
# response can carry a real evidence card (sources, excerpt, timing)
# instead of just the "steps" trace. This is only safe because this
# backend serves one request at a time in local dev, per the
# single-user design called out in README.md - a multi-worker/
# concurrent deployment would need this threaded through properly
# (e.g. as agent state) instead of a module global.
_last_kb_results: list = []
_last_kb_retrieval_ms: float = 0.0


@tool
def search_knowledge_base(query: str) -> str:
    """
    Search the organization's local safety regulations and SOPs.

    Use this tool ONLY when the user's question requires information
    from the organization's regulations, SOPs, rules, or safety
    documentation.

    Do NOT use this tool for:
    - greetings
    - casual conversation
    - general knowledge
    - programming questions
    - unrelated questions
    """
    global _last_kb_results, _last_kb_retrieval_ms

    start = time.perf_counter()
    try:
        results = rag_search(query, n_results=3)
    except Exception as exc:
        return f"ERROR: knowledge base search failed: {exc}"
    _last_kb_retrieval_ms = (time.perf_counter() - start) * 1000

    if not results:
        _last_kb_results = []
        return "NO_RELEVANT_KB_RESULTS"

    _last_kb_results = results

    formatted = []

    for result in results:
        source = result.get("source", "Unknown source")
        text = result.get("text", "")

        formatted.append(
            f"[Source: {source}]\n{text}"
        )

    return "\n\n---\n\n".join(formatted)


# =====================================================================
# FILE INTENT DETECTION
# =====================================================================

def detect_file_intent(message: str) -> str | None:
    """
    Detect explicit requests for a Word or Excel file.

    This is deliberately deterministic. We do not ask the LLM whether
    a file should be generated.
    """

    text = message.lower().strip()

    # ---------------------------------------------------------------
    # Excel
    # ---------------------------------------------------------------

    excel_terms = [
        "excel",
        "xlsx",
        "spreadsheet",
        "workbook",
        "excel file",
        "excel spreadsheet",
        "xlsx file",
        "spreadsheet file",
        "downloadable spreadsheet",
        "export as excel",
        "export to excel",
        "export this to excel",
        "put this in excel",
        "put this into excel",
        "give me an excel",
        "create an excel",
        "generate an excel",
        "make an excel",
    ]

    if any(term in text for term in excel_terms):
        return "excel"

    # ---------------------------------------------------------------
    # Word
    # ---------------------------------------------------------------
    #
    # "document" and "report" were added as bare terms after noticing
    # that natural phrasing like "generate a document summarizing
    # this" or "give me a report on X" - without the word "word" or
    # "docx" anywhere in it - matched nothing in the original list and
    # silently fell through to the normal chat path instead of
    # generating a file. This trades a small false-positive risk
    # (someone asking "what is a document") for not missing an
    # explicit, naturally-phrased request, which is the worse failure
    # of the two live.

    word_terms = [
        "word document",
        "word doc",
        "word file",
        "docx",
        ".docx",
        "document file",
        "downloadable document",
        "downloadable doc",
        "downloadable word document",
        "export as word",
        "export to word",
        "export this to word",
        "create a word document",
        "create a word doc",
        "generate a word document",
        "generate a word doc",
        "make a word document",
        "make a word doc",
        "create a docx",
        "generate a docx",
        "make a docx",
        "document",
        "report",
    ]

    if any(term in text for term in word_terms):
        return "word"

    return None


# =====================================================================
# NORMAL AGENT
# =====================================================================

SYSTEM_PROMPT = """
You are an assistant for a safety regulations and SOP system.

You have access to the organization's local safety regulations,
SOPs, rules, and safety documentation.

Use search_knowledge_base when the user's question requires
information from those documents.

Do NOT use the knowledge base for:
- greetings
- casual conversation
- general knowledge
- programming questions
- unrelated questions

When using the knowledge base:

- Base your answer on the retrieved information.
- Do not invent regulatory requirements.
- If the documents do not contain the answer, say so clearly.
- Do not pretend general knowledge came from the organization's
  documents.

When no tool is required, answer directly.
"""


def build_normal_agent():
    """
    Create the normal conversational agent.

    Only the RAG tool is exposed here.
    File-generation tools are never exposed to the normal agent.
    """

    return create_agent(
        model=llm,
        tools=[search_knowledge_base],
        system_prompt=SYSTEM_PROMPT,
    )


# Built once at module load, not per-request. The original version
# called build_normal_agent() fresh inside run_agent() on every single
# chat turn, rebuilding the LangGraph state machine each time for no
# benefit - the underlying llm object was already module-level and
# reused, so this was pure overhead. Reused across requests here
# instead, same pattern as the original create_react_agent() setup.
_normal_agent = build_normal_agent()


# =====================================================================
# DIRECT RAG
# =====================================================================

def clean_search_query(message: str) -> str:
    stop_phrases = [
        "generate a word document summarizing",
        "generate a word document on",
        "generate a word doc summarizing",
        "generate a word doc on",
        "create a word document on",
        "make a word document on",
        "export as word",
        "put this in excel",
        "put this into excel",
        "generate an excel spreadsheet on",
        "generate an excel on",
        "create an excel spreadsheet on",
        "give me a document summarizing",
        "give me a report on",
        "generate a word document",
        "generate a docx",
        "generate an excel",
        "summarizing",
        "summarize",
    ]
    cleaned = message.lower()
    for phrase in stop_phrases:
        cleaned = cleaned.replace(phrase, "")
    cleaned = cleaned.strip(" :.-")
    return cleaned if len(cleaned) > 2 else message


def retrieve_for_file(message: str) -> tuple[str, list]:
    """
    Retrieve source material directly for a file-generation request.

    Returns:
        formatted_context
        raw_results
    """
    search_term = clean_search_query(message)

    try:
        results = rag_search(search_term, n_results=5, max_distance=0.8)
        if not results and search_term != message:
            results = rag_search(message, n_results=5, max_distance=0.8)
    except Exception as exc:
        raise RuntimeError(
            f"Knowledge base search failed: {exc}"
        ) from exc

    if not results:
        return "", []

    formatted = []

    for result in results:

        source = result.get(
            "source",
            "Unknown source"
        )

        text = result.get(
            "text",
            ""
        )

        formatted.append(
            f"[Source: {source}]\n{text}"
        )

    return "\n\n---\n\n".join(formatted), results


# =====================================================================
# GROUNDED SUMMARY
# =====================================================================

def generate_grounded_summary(
    user_message: str,
    context: str,
) -> str:
    """
    Generate clean prose for a DOCX.

    The model is explicitly instructed to produce document-ready
    prose rather than Markdown or conversational filler.
    """

    prompt = f"""
You are preparing a professional regulatory summary for a
downloadable document.

USER REQUEST:
{user_message}

OFFICIAL KNOWLEDGE BASE MATERIAL:
{context}

Write a concise, professional summary answering the user's request.

STRICT RULES:

1. Use ONLY information supported by the supplied knowledge-base
   material.

2. Do NOT invent facts.

3. Do NOT contradict the supplied material.

4. If the source states a deadline, state that deadline clearly.
   Do not later say that no deadline exists.

5. Preserve important regulatory details exactly:
   - time periods
   - forms
   - authorities
   - duties
   - conditions
   - names of regulations

6. Do NOT use Markdown.

7. Do NOT use bullet-point symbols such as *, -, or •.

8. Do NOT create another title.

9. Do NOT repeat the same requirement.

10. Do NOT add generic safety advice.

11. Write only the actual summary content.

12. If the supplied material is insufficient to establish something,
    say that it is not specified in the supplied material instead of
    guessing.

Return clean professional prose suitable for placing directly into
a Word document.
"""

    result = llm.invoke(prompt)

    content = getattr(result, "content", "")

    if not content:
        raise RuntimeError(
            "The model returned an empty summary."
        )

    return str(content).strip()

# =====================================================================
# DOCUMENT DATA BUILDERS
# =====================================================================

def build_docx_data(
    user_message: str,
    summary: str,
    results: list,
) -> dict:

    message_lower = user_message.lower()

    if "notice of disease" in message_lower:
        title = "Notice of Disease Requirements"

    elif "ventilation" in message_lower:
        title = "Ventilation Requirements"

    elif "ppe" in message_lower:
        title = "Personal Protective Equipment Requirements"

    else:
        title = "Safety Regulations Summary"

    sources = []

    for result in results:

        source = result.get(
            "source",
            "Unknown source"
        )

        if source and source not in sources:
            sources.append(source)

    sections = [
        {
            "heading": "Requirements",
            "content": summary,
        }
    ]

    if sources:

        sections.append(
            {
                "heading": "Source",
                "content": "; ".join(sources),
            }
        )

    return {
        "title": title,
        "sections": sections,
    }

def generate_excel_rows(
    user_message: str,
    context: str,
) -> list[list[str]]:
    """
    Ask the LLM to extract useful spreadsheet rows.

    IMPORTANT:
    The model does NOT generate JSON, Python lists, or Pydantic
    structures.

    It generates a deliberately simple tagged text format which
    Python parses and validates.
    """

    prompt = f"""
You are extracting regulatory requirements into spreadsheet rows.

USER REQUEST:
{user_message}

OFFICIAL KNOWLEDGE BASE MATERIAL:
{context}

Extract the important requirements that directly answer the user's
request.

For each requirement, produce exactly this format:

ROW
Requirement: <short name>
Details: <accurate description supported by the source>
END

Example:

ROW
Requirement: Time limit
Details: Notice must be given within three days of being informed of the disease.
END

ROW
Requirement: Required form
Details: The notice must be given in Form V.
END

STRICT RULES:

1. Use ONLY information contained in the supplied knowledge-base
   material.

2. Do NOT invent information.

3. Do NOT add generic safety advice.

4. Include important:
   - duties
   - deadlines
   - forms
   - authorities
   - conditions
   - required actions

5. Do not repeat the same requirement.

6. Do not include a title.

7. Do not use Markdown.

8. Do not put extra text before the first ROW.

9. Do not put extra text after the last END.

10. Keep each Details value concise.

Return only the ROW blocks.
"""

    result = llm.invoke(prompt)

    content = str(
        getattr(result, "content", "")
    ).strip()

    if not content:
        raise RuntimeError(
            "The model returned no spreadsheet rows."
        )

    rows = []

    current_requirement = None
    current_details = None

    for raw_line in content.splitlines():

        line = raw_line.strip()

        if not line:
            continue

        # -----------------------------------------------------------
        # Start row
        # -----------------------------------------------------------

        if line.upper() == "ROW":

            # If the model forgot END but starts another ROW,
            # save the previous row if it is usable.
            if current_requirement and current_details:

                rows.append(
                    [
                        current_requirement,
                        current_details,
                    ]
                )

            current_requirement = None
            current_details = None

            continue

        # -----------------------------------------------------------
        # End row
        # -----------------------------------------------------------

        if line.upper() == "END":

            if current_requirement and current_details:

                rows.append(
                    [
                        current_requirement,
                        current_details,
                    ]
                )

            current_requirement = None
            current_details = None

            continue

        # -----------------------------------------------------------
        # Requirement
        # -----------------------------------------------------------

        if line.lower().startswith("requirement:"):

            current_requirement = (
                line.split(
                    ":",
                    1
                )[1]
                .strip()
            )

            continue

        # -----------------------------------------------------------
        # Details
        # -----------------------------------------------------------

        if line.lower().startswith("details:"):

            current_details = (
                line.split(
                    ":",
                    1
                )[1]
                .strip()
            )

            continue

    # Handle a final row where END was omitted.
    if current_requirement and current_details:

        rows.append(
            [
                current_requirement,
                current_details,
            ]
        )

    # ---------------------------------------------------------------
    # Remove duplicates.
    # ---------------------------------------------------------------

    unique_rows = []
    seen = set()

    for requirement, details in rows:

        key = (
            requirement.lower().strip(),
            details.lower().strip(),
        )

        if key not in seen:

            seen.add(key)

            unique_rows.append(
                [
                    requirement,
                    details,
                ]
            )

    if not unique_rows:

        raise RuntimeError(
            "The model did not produce any valid spreadsheet rows."
        )

    return unique_rows

def build_xlsx_data(
        rows: list[list[str]],
        results: list,
    ) -> dict:
    """
    Build a clean regulatory-requirements workbook.

    Python controls the spreadsheet structure completely.
    """

    source_names = []

    for result in results:

        source = result.get(
            "source",
            "Unknown source"
        )

        if source and source not in source_names:

            source_names.append(
                source
            )

    source = "; ".join(
        source_names
    ) or "Knowledge Base"

    final_rows = []

    for requirement, details in rows:

        final_rows.append(
            [
                requirement,
                details,
                source,
            ]
        )

    return {
        "filename": "safety_requirements.xlsx",

        "sheets": [
            {
                "name": "Requirements",

                "columns": [
                    "Requirement",
                    "Details",
                    "Source",
                ],

                "rows": final_rows,
            }
        ],
    }

# =====================================================================
# FILE REQUEST HANDLER (streaming)
# =====================================================================
#
# This is a generator: it `yield`s a {"type": "step", "text": ...}
# event the moment each stage of the pipeline actually starts/finishes,
# instead of only being knowable after the whole request completes.
# main.py's /chat/stream endpoint forwards each yielded event to the
# browser as it happens (Server-Sent Events), which is what lets the
# frontend's loading state show real, current progress instead of a
# canned "Searching... Generating..." placeholder. It always ends by
# yielding exactly one {"type": "final", ...} event.

def handle_file_request_stream(message: str, file_type: str):
    steps: list[str] = []

    def step(text: str):
        steps.append(text)
        return {"type": "step", "text": text}

    # ---------------------------------------------------------------
    # RAG
    # ---------------------------------------------------------------

    yield step(
        "Searching the knowledge base for information "
        "needed by the requested file."
    )

    context, results = retrieve_for_file(message)

    if not results:
        yield step("No relevant information found in the knowledge base.")
        yield {
            "type": "final",
            "reply": (
                "I couldn't find relevant information in the "
                "organization's knowledge base, so I didn't generate "
                "a file containing potentially unsupported "
                "regulatory information."
            ),
            "steps": steps,
            "generated_file": None,
            "evidence": None,
        }
        return

    yield step(f"Retrieved {len(results)} relevant knowledge-base result(s).")
    evidence = build_evidence(results, retrieval_ms=0)

    # ---------------------------------------------------------------
    # Grounded summary
    # ---------------------------------------------------------------

    yield step("Generating a grounded summary from the retrieved material.")

    try:
        summary = generate_grounded_summary(message, context)
    except Exception as exc:
        yield step(f"Summary generation failed: {exc}")
        yield {
            "type": "final",
            "reply": (
                "I found relevant information, but the local model "
                "was unable to prepare the requested file."
            ),
            "steps": steps,
            "generated_file": None,
            "evidence": evidence,
        }
        return

    # ---------------------------------------------------------------
    # Word
    # ---------------------------------------------------------------

    if file_type == "word":
        document_data = build_docx_data(message, summary, results)

        try:
            filepath = generate_docx(document_data)
        except Exception as exc:
            yield step(f"Word generation failed: {exc}")
            yield {
                "type": "final",
                "reply": (
                    "I prepared the content but could not create "
                    "the Word document."
                ),
                "steps": steps,
                "generated_file": None,
                "evidence": evidence,
            }
            return

        yield step(f"Generated Word document: {filepath}")
        yield {
            "type": "final",
            "reply": (
                "I've generated the Word document based on the "
                "information retrieved from the organization's "
                "knowledge base."
            ),
            "steps": steps,
            "generated_file": filepath,
            "evidence": evidence,
        }
        return

    # ---------------------------------------------------------------
    # Excel
    # ---------------------------------------------------------------

    if file_type == "excel":
        yield step("Extracting structured requirements for the spreadsheet.")

        try:
            excel_rows = generate_excel_rows(message, context)
        except Exception as exc:
            yield step(f"Spreadsheet content extraction failed: {exc}")
            yield {
                "type": "final",
                "reply": (
                    "I found the relevant regulations, but the "
                    "local model was unable to structure them into "
                    "a spreadsheet."
                ),
                "steps": steps,
                "generated_file": None,
                "evidence": evidence,
            }
            return

        workbook_data = build_xlsx_data(excel_rows, results)

        try:
            filepath = generate_xlsx(workbook_data)
        except Exception as exc:
            yield step(f"Excel generation failed: {exc}")
            yield {
                "type": "final",
                "reply": (
                    "I prepared the content but could not create "
                    "the Excel workbook."
                ),
                "steps": steps,
                "generated_file": None,
                "evidence": evidence,
            }
            return

        yield step(f"Generated Excel workbook: {filepath}")
        yield {
            "type": "final",
            "reply": (
                "I've generated the Excel workbook using the "
                "information retrieved from the organization's "
                "knowledge base."
            ),
            "steps": steps,
            "generated_file": filepath,
            "evidence": evidence,
        }
        return

    raise ValueError(f"Unsupported file type: {file_type}")


# =====================================================================
# MAIN ENTRY POINT (streaming)
# =====================================================================

def run_agent_stream(message: str):
    """
    Run the appropriate processing pipeline, yielding progress as it
    actually happens.

    Yields a sequence of:
        {"type": "step", "text": str}
    followed by exactly one:
        {"type": "final", "reply": str, "steps": list[str],
         "generated_file": str | None, "evidence": dict | None}
    """
    global _last_kb_results, _last_kb_retrieval_ms

    message = message.strip()

    if not message:
        yield {
            "type": "final",
            "reply": "Please provide a question or request.",
            "steps": [],
            "generated_file": None,
            "evidence": None,
        }
        return

    # ---------------------------------------------------------------
    # Check file intent FIRST.
    # ---------------------------------------------------------------

    file_type = detect_file_intent(message)

    if file_type:
        yield from handle_file_request_stream(message, file_type)
        return

    # ---------------------------------------------------------------
    # Normal conversational agent
    # ---------------------------------------------------------------

    steps: list[str] = []
    _last_kb_results = []
    _last_kb_retrieval_ms = 0.0

    try:
        seen = 0
        result_messages: list = []

        # stream_mode="values" yields the full accumulated
        # {"messages": [...]} state after every graph step, so we only
        # need to look at whatever is new since the last chunk to know
        # what just happened - that's what makes this genuinely live
        # rather than replayed after the fact.
        for chunk in _normal_agent.stream(
            {"messages": [{"role": "user", "content": message}]},
            stream_mode="values",
        ):
            result_messages = chunk.get("messages", [])

            for msg in result_messages[seen:]:
                msg_type = type(msg).__name__

                if msg_type == "AIMessage":
                    tool_calls = getattr(msg, "tool_calls", None)
                    if tool_calls:
                        for call in tool_calls:
                            yield {
                                "type": "step",
                                "text": (
                                    f"Deciding to use tool: "
                                    f"{call.get('name', 'unknown')} "
                                    f"(args: {call.get('args', {})})"
                                ),
                            }
                            steps.append(
                                f"Deciding to use tool: "
                                f"{call.get('name', 'unknown')} "
                                f"(args: {call.get('args', {})})"
                            )

                elif msg_type == "ToolMessage":
                    tool_name = getattr(msg, "name", "")
                    content = str(getattr(msg, "content", ""))

                    if tool_name == "search_knowledge_base":
                        if "NO_RELEVANT_KB_RESULTS" in content:
                            text = "No relevant information found in the knowledge base."
                        elif content.startswith("ERROR:"):
                            text = f"Knowledge base error: {content}"
                        else:
                            text = "Knowledge base returned relevant information."
                        yield {"type": "step", "text": text}
                        steps.append(text)

            seen = len(result_messages)

    except Exception as exc:
        text = f"Agent execution failed: {exc}"
        yield {"type": "step", "text": text}
        steps.append(text)
        yield {
            "type": "final",
            "reply": (
                "I wasn't able to complete that request because "
                "the local AI model failed to produce a response."
            ),
            "steps": steps,
            "generated_file": None,
            "evidence": None,
        }
        return

    final_reply = ""
    for msg in result_messages:
        if type(msg).__name__ == "AIMessage":
            content = getattr(msg, "content", "")
            if isinstance(content, str) and content.strip():
                final_reply = content.strip()

    if not final_reply:
        final_reply = "I wasn't able to produce a final answer."

    evidence = build_evidence(_last_kb_results, _last_kb_retrieval_ms)

    yield {
        "type": "final",
        "reply": final_reply,
        "steps": steps,
        "generated_file": None,
        "evidence": evidence,
    }


def run_agent(message: str) -> dict:
    """
    Non-streaming convenience wrapper around run_agent_stream(), kept
    for callers that just want the end result (the __main__ test
    block below, and any script that doesn't need live progress).
    Drains the generator and returns only its final event.
    """
    final: dict = {
        "reply": "I wasn't able to produce a final answer.",
        "steps": [],
        "generated_file": None,
        "evidence": None,
    }
    for event in run_agent_stream(message):
        if event["type"] == "final":
            final = {k: v for k, v in event.items() if k != "type"}
    return final


# =====================================================================
# TESTS
# =====================================================================

if __name__ == "__main__":

    test_messages = [

        # Should NOT use RAG or file generation.
        "what is prompt engineering?",

        # Should use RAG.
        "what is the notice of disease requirement?",

        # Should use direct RAG -> summary -> DOCX.
        "generate a word document summarizing the notice of disease requirement",

        # Should use direct RAG -> summary -> XLSX.
        "put the notice of disease requirements into an Excel spreadsheet",

        # Bare "document" phrasing - previously fell through to the
        # normal chat path since nothing in word_terms matched it.
        "give me a document summarizing the notice of disease requirement",
    ]

    for test_message in test_messages:

        print("\n" + "=" * 70)
        print(
            f"Query: {test_message}"
        )
        print("=" * 70)

        result = run_agent(
            test_message
        )

        print("\nSteps:")

        for step in result["steps"]:
            print(
                f"  - {step}"
            )

        print(
            f"\nFinal reply:\n"
            f"{result['reply']}"
        )

        if result["generated_file"]:

            print(
                f"\nGenerated file: "
                f"{result['generated_file']}"
            )