"""
Day 5: XLSX generation tool.

Takes structured workbook_data (a filename + a list of sheets, each
with columns and rows) and writes a real .xlsx file to disk using
openpyxl. Same "return a path, not the file" reasoning as docgen.py -
see that file's docstring for the full explanation.

EXPECTED INPUT SHAPE
---------------------
workbook_data = {
    "filename": "safety_requirements.xlsx",
    "sheets": [
        {
            "name": "Safety Requirements",
            "columns": ["Requirement", "Description", "Source"],
            "rows": [
                ["Ventilation", "Adequate ventilation must be maintained...", "Oil Mines Regulations"],
                ["Protective Equipment", "Workers must use appropriate protective equipment...", "Safety SOP"],
            ]
        }
    ]
}

Each row must have the same number of values as "columns". Multiple
sheets are supported.
"""

import os
import re
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated")

_INVALID_SHEET_CHARS = re.compile(r"[\\/\?\*\[\]:]")


def _safe_sheet_name(name: str, fallback: str) -> str:
    cleaned = _INVALID_SHEET_CHARS.sub("", name or fallback)[:31]
    return cleaned or fallback


def generate_xlsx(workbook_data: dict) -> str:
    """
    Build a .xlsx from workbook_data and return the path to the
    written file. Creates backend/generated/ if it doesn't exist yet.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    requested_filename = workbook_data.get("filename", "workbook.xlsx")
    sheets = workbook_data.get("sheets", [])

    wb = Workbook()
    default_sheet = wb.active
    wb.remove(default_sheet)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

    for i, sheet_data in enumerate(sheets):
        sheet_name = _safe_sheet_name(sheet_data.get("name", ""), f"Sheet{i + 1}")
        columns = sheet_data.get("columns", [])
        rows = sheet_data.get("rows", [])

        ws = wb.create_sheet(title=sheet_name)

        for col_idx, col_name in enumerate(columns, start=1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = header_font
            cell.fill = header_fill

        for row_idx, row_values in enumerate(rows, start=2):
            for col_idx, value in enumerate(row_values, start=1):
                ws.cell(row=row_idx, column=col_idx, value=value)

        for col_idx, col_name in enumerate(columns, start=1):
            max_len = len(str(col_name))
            for row_values in rows:
                if col_idx <= len(row_values):
                    max_len = max(max_len, len(str(row_values[col_idx - 1])))
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 60)

    if not sheets:
        wb.create_sheet(title="Sheet1")

    base_name = os.path.splitext(requested_filename)[0] or "workbook"
    safe_base = "".join(c if c.isalnum() or c in " -_" else "" for c in base_name).strip()
    safe_base = safe_base.replace(" ", "_") or "workbook"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_base}_{timestamp}.xlsx"
    filepath = os.path.join(OUTPUT_DIR, filename)

    wb.save(filepath)
    return filepath


if __name__ == "__main__":
    test_data = {
        "filename": "safety_requirements.xlsx",
        "sheets": [
            {
                "name": "Safety Requirements",
                "columns": ["Requirement", "Description", "Source"],
                "rows": [
                    ["Ventilation", "Adequate ventilation must be maintained...", "Oil Mines Regulations"],
                    ["Protective Equipment", "Workers must use appropriate protective equipment...", "Safety SOP"],
                    ["Notice of Disease", "Notify authorities within 3 days of diagnosis...", "Oil Mines Regulations 1984"],
                ],
            }
        ],
    }

    path = generate_xlsx(test_data)
    print(f"Generated: {path}")
    print(f"Exists on disk: {os.path.exists(path)}")
    print(f"File size: {os.path.getsize(path)} bytes")
