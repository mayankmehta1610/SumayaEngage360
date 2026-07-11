"""Parse Feature Catalogue sheet for implementation status."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = Path(r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def letter_to_num(s: str) -> int:
    n = 0
    for ch in s:
        n = n * 26 + (ord(ch) - 64)
    return n


with zipfile.ZipFile(P) as z:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    sheets = []
    for sh in wb.findall(".//m:sheets/m:sheet", NS):
        sheets.append(
            {
                "name": sh.attrib.get("name"),
                "rid": sh.attrib.get(
                    "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                ),
            }
        )
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_file = {r.attrib["Id"]: r.attrib["Target"] for r in rels}

    shared: list[str] = []
    ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in ss.findall(f".//{M}si"):
        texts = [t.text or "" for t in si.iter(f"{M}t")]
        shared.append("".join(texts))

    def cell_val(c: ET.Element) -> str:
        t = c.attrib.get("t")
        v = c.find(f"{M}v")
        if v is None:
            return ""
        if t == "s":
            return shared[int(v.text)]
        return v.text or ""

    # Feature catalogue = sheet index 1
    sh = sheets[1]
    target = rid_to_file[sh["rid"]].lstrip("/")
    root = ET.fromstring(z.read(target))
    rows = root.findall(f".//{M}row")

    # Header
    header = {}
    for c in rows[0].findall(f"{M}c"):
        ref = c.attrib.get("r", "")
        m = re.match(r"([A-Z]+)", ref)
        if m:
            header[m.group(1)] = cell_val(c)
    print("HEADER:")
    for col in sorted(header.keys(), key=letter_to_num):
        print(f"  {col}: {header[col]}")

    status_cols = [c for c in header if re.search(r"done|status|cursor|codex|complete", header[c], re.I)]
    print("\nStatus-like columns:", status_cols)

    incomplete = []
    done_by_col = {c: 0 for c in header}
    total = 0
    for row in rows[1:]:
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m:
                cells[m.group(1)] = cell_val(c)
        fid = cells.get("A") or cells.get("B")
        if not fid:
            continue
        total += 1
        for col, val in cells.items():
            if val.strip().lower() in ("done", "yes", "complete", "implemented", "✓", "y"):
                done_by_col[col] = done_by_col.get(col, 0) + 1
        # incomplete if no done in any status col
        any_done = any(
            cells.get(c, "").strip().lower() in ("done", "yes", "complete", "implemented", "✓", "y")
            for c in status_cols
        )
        if not any_done and len(incomplete) < 30:
            incomplete.append(cells)

    print(f"\nTotal feature rows: {total}")
    print("Done counts by column (sample):")
    for col in sorted(header.keys(), key=letter_to_num):
        if done_by_col.get(col, 0):
            print(f"  {col} ({header[col]}): {done_by_col[col]}")

    print("\nFirst 20 incomplete rows:")
    for cells in incomplete[:20]:
        parts = []
        for col in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]:
            if cells.get(col):
                parts.append(f"{col}={cells[col][:40]}")
        print(" | ".join(parts))
