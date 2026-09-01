"""
Day 3: the actual agent loop. This replaces /chat's "just forward to
Ollama" behavior with real ReAct-style reasoning: the model can now
DECIDE to search the knowledge base before answering, instead of
answering blind.

SETUP
--------
See requirements.txt in the backend/ folder (pip install -r requirements.txt).

WHY create_react_agent INSTEAD OF HAND-ROLLING THE LOOP
-------------------------------------------------------------
LangGraph ships a pre-built ReAct agent constructor that handles the
reason -> act -> observe -> repeat cycle for you, including the tricky
bits (parsing the model's tool-call intent, running the tool, feeding
the result back in the right format). Given the timeline, using this
instead of hand-writing the loop from scratch is the right call - it's
well-tested and does exactly what your agent needs.

If this fights you and eats too much time, the fallback is a simple
hand-rolled while-loop: ask the model to respond, check if it wants a
tool, call the tool, feed the result back, repeat until it gives a
final answer with no more tool requests. Less elegant, but you'd
understand every line if you need to debug it live during the demo.
"""

from langchain_ollama import ChatOllama
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "rag"))
from retrieve import search as rag_search

MODEL_NAME = "llama3.2:3b"  # must match what you pulled with ollama


@tool
def search_knowledge_base(query: str) -> str:
    """
    Search the organization's local safety regulations and SOPs.

    USE THIS TOOL ONLY when the user needs information that is
    specifically contained in the organization's regulations,
    SOPs, rules, or safety documentation.

    DO NOT use this tool for general knowledge, casual conversation,
    programming questions, greetings, or questions that can be
    answered without consulting the organization's documents.

    Examples requiring this tool:
    - "What is the notice of disease requirement?"
    - "What does Oil Mines Regulations say about ventilation?"
    - "What PPE does the SOP require?"

    Examples NOT requiring this tool:
    - "What is Python?"
    - "What is an API?"
    - "Hello"
    """
    # This docstring is NOT just documentation - the agent reads it to
    # decide WHEN to call this tool. Vague or missing docstrings are a
    # common reason agents fail to use a tool when they should.
    results = rag_search(query, n_results=3)
    if not results:
        return "NO_RELEVANT_KB_RESULTS"

    formatted = []
    for r in results:
        formatted.append(f"[Source: {r['source']}]\n{r['text']}")
    return "\n\n---\n\n".join(formatted)


llm = ChatOllama(model=MODEL_NAME, temperature=0)
SYSTEM_PROMPT = """
You are an assistant for a safety regulations and SOP system.

You have access to a knowledge-base search tool containing official
safety regulations and SOP documents.

IMPORTANT: Do NOT automatically use the knowledge-base tool for every
question.

Use the knowledge-base tool ONLY when the user's question requires
information from the stored regulations, SOPs, rules, or other
domain-specific documents.

Examples where you SHOULD use the knowledge base:
- "What is the notice of disease requirement?"
- "What does the Oil Mines Regulations say about ventilation?"
- "What PPE is required according to the SOP?"
- "What is the procedure for reporting an accident?"
- "What are the requirements under Petroleum Rules?"

Examples where you SHOULD NOT use the knowledge base:
- "Hello"
- "What can you do?"
- "What is Python?"
- "Explain what an API is."
- "What is 2 + 2?"
- Casual conversation or general knowledge questions.

If the question can be answered reliably without information from
the organization's regulations or SOPs, answer it directly.

When in doubt about whether the question requires the organization's
documents, prefer answering directly rather than searching.

After using the knowledge base, base your answer on the retrieved
information. Do not invent regulatory requirements that are not
supported by the retrieved documents.
"""

agent = create_react_agent(
    llm,
    tools=[search_knowledge_base],
    prompt=SYSTEM_PROMPT
)


def run_agent(message: str) -> dict:
    """
    Runs the agent on a single message.

    If RAG is used but returns no relevant information, the request
    falls back to the general LLM instead of stopping with a
    "no documents found" response.
    """

    result = agent.invoke({
        "messages": [
            {"role": "user", "content": message}
        ]
    })

    messages = result["messages"]

    steps = []
    final_reply = ""
    rag_failed = False

    for msg in messages:
        msg_type = type(msg).__name__

        if msg_type == "AIMessage":

            if getattr(msg, "tool_calls", None):
                for call in msg.tool_calls:
                    steps.append(
                        f"Deciding to use tool: {call['name']} "
                        f"(query: {call['args'].get('query', '')})"
                    )

            if msg.content:
                final_reply = msg.content

        elif msg_type == "ToolMessage":

            if "NO_RELEVANT_KB_RESULTS" in str(msg.content):
                rag_failed = True

                steps.append(
                    "No relevant information found in the knowledge base."
                )
            else:
                preview = str(msg.content)[:150]

                steps.append(
                    f"Tool result: {preview}..."
                )

    # ---------------------------------------------------------------
    # FALLBACK
    # ---------------------------------------------------------------

    if rag_failed:

        steps.append(
            "Falling back to general model because the knowledge base "
            "did not contain relevant information."
        )

        fallback_result = llm.invoke([
            (
                "system",
                "Answer the user's question using your general knowledge. "
                "Do not claim that the answer came from the local knowledge "
                "base. If the question requires specific regulations or "
                "SOP information that you cannot verify, make that clear."
            ),
            (
                "user",
                message
            )
        ])

        final_reply = fallback_result.content

    return {
        "reply": final_reply,
        "steps": steps
    }

if __name__ == "__main__":
    # Quick standalone test before wiring into FastAPI
    test_message = "what is prompt engineering?"
    result = run_agent(test_message)
    print("Steps:")
    for s in result["steps"]:
        print(f"  - {s}")
    print(f"\nFinal reply:\n{result['reply']}")