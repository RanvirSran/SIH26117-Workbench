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

from retrieve import search as rag_search
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

    try:
        results = rag_search(query, n_results=3)
    except Exception as exc:
        return f"ERROR: knowledge base search failed: {exc}"

    if not results:
        return "NO_RELEVANT_KB_RESULTS"

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
# FILE REQUEST HANDLER
# =====================================================================

def handle_file_request(
    message: str,
    file_type: str,
) -> dict:
    """
    Handle Word/Excel generation without model tool calling.
    """

    steps = []

    # ---------------------------------------------------------------
    # RAG
    # ---------------------------------------------------------------

    steps.append(
        "Searching the knowledge base for information "
        "needed by the requested file."
    )

    context, results = retrieve_for_file(
        message
    )

    if not results:

        steps.append(
            "No relevant information found in the knowledge base."
        )

        return {
            "reply": (
                "I couldn't find relevant information in the "
                "organization's knowledge base, so I didn't generate "
                "a file containing potentially unsupported "
                "regulatory information."
            ),
            "steps": steps,
            "generated_file": None,
        }

    steps.append(
        f"Retrieved {len(results)} relevant knowledge-base result(s)."
    )

    # ---------------------------------------------------------------
    # Grounded summary
    # ---------------------------------------------------------------

    steps.append(
        "Generating a grounded summary from the retrieved material."
    )

    try:
        summary = generate_grounded_summary(
            message,
            context,
        )

    except Exception as exc:

        steps.append(
            f"Summary generation failed: {exc}"
        )

        return {
            "reply": (
                "I found relevant information, but the local model "
                "was unable to prepare the requested file."
            ),
            "steps": steps,
            "generated_file": None,
        }

    # ---------------------------------------------------------------
    # Word
    # ---------------------------------------------------------------

    if file_type == "word":

        document_data = build_docx_data(
            message,
            summary,
            results,
        )

        try:
            filepath = generate_docx(
                document_data
            )

        except Exception as exc:

            steps.append(
                f"Word generation failed: {exc}"
            )

            return {
                "reply": (
                    "I prepared the content but could not create "
                    "the Word document."
                ),
                "steps": steps,
                "generated_file": None,
            }

        steps.append(
            f"Generated Word document: {filepath}"
        )

        return {
            "reply": (
                "I've generated the Word document based on the "
                "information retrieved from the organization's "
                "knowledge base."
            ),
            "steps": steps,
            "generated_file": filepath,
        }

    # ---------------------------------------------------------------
    # Excel
    # ---------------------------------------------------------------

    if file_type == "excel":

        steps.append(
            "Extracting structured requirements for the spreadsheet."
        )

        try:

            excel_rows = generate_excel_rows(
                message,
                context,
            )

        except Exception as exc:

            steps.append(
                f"Spreadsheet content extraction failed: {exc}"
            )

            return {
                "reply": (
                    "I found the relevant regulations, but the "
                    "local model was unable to structure them into "
                    "a spreadsheet."
                ),
                "steps": steps,
                "generated_file": None,
            }

        workbook_data = build_xlsx_data(
            excel_rows,
            results,
        )

        try:
            filepath = generate_xlsx(
                workbook_data
            )

        except Exception as exc:

            steps.append(
                f"Excel generation failed: {exc}"
            )

            return {
                "reply": (
                    "I prepared the content but could not create "
                    "the Excel workbook."
                ),
                "steps": steps,
                "generated_file": None,
            }

        steps.append(
            f"Generated Excel workbook: {filepath}"
        )

        return {
            "reply": (
                "I've generated the Excel workbook using the "
                "information retrieved from the organization's "
                "knowledge base."
            ),
            "steps": steps,
            "generated_file": filepath,
        }

    raise ValueError(
        f"Unsupported file type: {file_type}"
    )


# =====================================================================
# MAIN ENTRY POINT
# =====================================================================

def run_agent(message: str) -> dict:
    """
    Run the appropriate processing pipeline.

    Returns:

    {
        "reply": str,
        "steps": list[str],
        "generated_file": str | None
    }
    """

    message = message.strip()

    if not message:

        return {
            "reply": "Please provide a question or request.",
            "steps": [],
            "generated_file": None,
        }

    # ---------------------------------------------------------------
    # Check file intent FIRST.
    # ---------------------------------------------------------------

    file_type = detect_file_intent(
        message
    )

    if file_type:

        return handle_file_request(
            message,
            file_type,
        )

    # ---------------------------------------------------------------
    # Normal conversational agent
    # ---------------------------------------------------------------

    steps = []

    try:

        result = _normal_agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": message,
                    }
                ]
            }
        )

    except Exception as exc:

        steps.append(
            f"Agent execution failed: {exc}"
        )

        return {
            "reply": (
                "I wasn't able to complete that request because "
                "the local AI model failed to produce a response."
            ),
            "steps": steps,
            "generated_file": None,
        }

    messages = result.get(
        "messages",
        []
    )

    final_reply = ""

    for msg in messages:

        msg_type = type(msg).__name__

        if msg_type == "AIMessage":

            tool_calls = getattr(
                msg,
                "tool_calls",
                None
            )

            if tool_calls:

                for call in tool_calls:

                    steps.append(
                        f"Deciding to use tool: "
                        f"{call.get('name', 'unknown')} "
                        f"(args: {call.get('args', {})})"
                    )

            content = getattr(
                msg,
                "content",
                ""
            )

            if isinstance(content, str) and content.strip():
                final_reply = content.strip()

        elif msg_type == "ToolMessage":

            tool_name = getattr(
                msg,
                "name",
                ""
            )

            content = str(
                getattr(
                    msg,
                    "content",
                    ""
                )
            )

            if tool_name == "search_knowledge_base":

                if "NO_RELEVANT_KB_RESULTS" in content:

                    steps.append(
                        "No relevant information found "
                        "in the knowledge base."
                    )

                elif content.startswith("ERROR:"):

                    steps.append(
                        f"Knowledge base error: {content}"
                    )

                else:

                    steps.append(
                        "Knowledge base returned relevant information."
                    )

    if not final_reply:

        final_reply = (
            "I wasn't able to produce a final answer."
        )

    return {
        "reply": final_reply,
        "steps": steps,
        "generated_file": None,
    }


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