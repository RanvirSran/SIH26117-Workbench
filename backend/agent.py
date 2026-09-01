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
    Search the local knowledge base of safety regulations and SOPs
    (Oil Mines Regulations, Petroleum Rules, Hazardous Chemicals
    Rules, etc.) for information relevant to the query. Use this when
    the user asks about a specific regulation, procedure, or safety
    requirement.
    """
    # This docstring is NOT just documentation - the agent reads it to
    # decide WHEN to call this tool. Vague or missing docstrings are a
    # common reason agents fail to use a tool when they should.
    results = rag_search(query, n_results=3)
    if not results:
        return "No relevant documents found in the knowledge base."

    formatted = []
    for r in results:
        formatted.append(f"[Source: {r['source']}]\n{r['text']}")
    return "\n\n---\n\n".join(formatted)


llm = ChatOllama(model=MODEL_NAME, temperature=0)
agent = create_react_agent(llm, tools=[search_knowledge_base])


def run_agent(message: str) -> dict:
    """
    Runs the agent on a single message and returns both the final
    answer AND a human-readable list of reasoning steps - the second
    part is specifically for the "reasoning trace" UI panel your
    frontend teammates are building. Without this, the frontend would
    only ever see the final answer with no visibility into what the
    agent actually did to get there.
    """
    result = agent.invoke({"messages": [{"role": "user", "content": message}]})
    messages = result["messages"]

    steps = []
    final_reply = ""

    for msg in messages:
        msg_type = type(msg).__name__
        if msg_type == "AIMessage":
            if getattr(msg, "tool_calls", None):
                for call in msg.tool_calls:
                    steps.append(f"Deciding to use tool: {call['name']} "
                                 f"(query: {call['args'].get('query', '')})")
            if msg.content:
                final_reply = msg.content
        elif msg_type == "ToolMessage":
            preview = str(msg.content)[:150]
            steps.append(f"Tool result: {preview}...")

    return {"reply": final_reply, "steps": steps}


if __name__ == "__main__":
    # Quick standalone test before wiring into FastAPI
    test_message = "What is the notice of disease requirement?"
    result = run_agent(test_message)
    print("Steps:")
    for s in result["steps"]:
        print(f"  - {s}")
    print(f"\nFinal reply:\n{result['reply']}")