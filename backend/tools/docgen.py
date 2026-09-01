"""
Day 4: DOCX generation tool.

Takes structured document_data (a title + a list of heading/content
sections) and writes a real .docx file to disk using python-docx.

WHY RETURN A PATH, NOT THE FILE ITSELF
---------------------------------------
The agent tool-calling loop passes string results back into the LLM's
context window. A raw .docx (binary, base64, whatever) would blow up
that context and the model can't do anything useful with file bytes
anyway. Returning a path lets the agent report "here's your file at
<path>" and lets FastAPI serve it separately (e.g. a download
endpoint that reads the path and streams the file) without ever
routing the binary through the LLM.

EXPECTED INPUT SHAPE
---------------------
document_data = {
    "title": "Notice of Disease Requirements",
    "sections": [
        {"heading": "Requirement", "content": "The relevant requirement..."},
        {"heading": "Procedure", "content": "The procedure that must be followed..."},
    ]
}

Every section needs "heading" and "content" as plain strings. Content
is written as a single paragraph per section (no nested formatting) -
that's enough for the generated compliance summaries this tool is
for. If sections ever need multiple paragraphs, content could become
a list of strings; not needed yet, so keeping this simple per Day 4
scope.
"""

import os
from datetime import datetime

from docx import Document
from docx.shared import Pt


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated")


def generate_docx(document_data: dict) -> str:
    """
    Build a .docx from document_data and return the path to the
    written file. Creates backend/generated/ if it doesn't exist yet.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    title = document_data.get("title", "Untitled Document")
    sections = document_data.get("sections", [])

    doc = Document()

    doc.add_heading(title, level=0)

    for section in sections:
        heading = section.get("heading", "")
        content = section.get("content", "")

        if heading:
            doc.add_heading(heading, level=1)
        if content:
            para = doc.add_paragraph(content)
            para.style.font.size = Pt(11)

    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in title).strip()
    safe_title = safe_title.replace(" ", "_") or "document"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_title}_{timestamp}.docx"
    filepath = os.path.join(OUTPUT_DIR, filename)

    doc.save(filepath)
    return filepath


if __name__ == "__main__":
    test_data = {
        "title": "Notice of Disease Requirements",
        "sections": [
            {
                "heading": "Requirement",
                "content": (
                    "Where any person employed in a mine contracts any disease "
                    "notified by the Central Government in the Official Gazette, "
                    "the owner, agent or manager shall within three days of his "
                    "being informed of the disease give notice thereof in Form V "
                    "to the District Magistrate, the Chief Inspector, the "
                    "Regional Inspector and Inspector of Mines (Medical)."
                ),
            },
            {
                "heading": "Procedure",
                "content": (
                    "The owner, agent or manager must complete Form V with "
                    "particulars of the mine, the affected person, and the "
                    "nature of the disease, and submit it to all four "
                    "authorities listed above within the three-day window."
                ),
            },
        ],
    }

    path = generate_docx(test_data)
    print(f"Generated: {path}")
    print(f"Exists on disk: {os.path.exists(path)}")
    print(f"File size: {os.path.getsize(path)} bytes")
