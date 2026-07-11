"""Dump full rows from a spreadsheet sheet by index."""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx"
idx = int(sys.argv[1]) if len(sys.argv) > 1 else 8


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


with zipfile.ZipFile(P) as z:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets = []
    names = []
    for sh in wb.findall(".//m:sheets/m:sheet", ns):
        sheets.append(
            sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        )
        names.append(sh.attrib.get("name"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_file = {r.attrib["Id"]: r.attrib["Target"].lstrip("/") for r in rels}
    shared = []
    ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in ss.findall(f".//{M}si"):
        texts = [t.text or "" for t in si.iter(f"{M}t")]
        shared.append("".join(texts))

    def cell_val(c):
        t = c.attrib.get("t")
        v = c.find(f"{M}v")
        if v is None:
            return ""
        if t == "s":
            return shared[int(v.text)]
        return v.text or ""

    target = rid_to_file[sheets[idx]]
    root = ET.fromstring(z.read(target))
    rows = root.findall(f".//{M}row")
    print(f"SHEET: {names[idx]}")
    for row in rows[:40]:
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m:
                cells[m.group(1)] = cell_val(c)
        if not cells:
            continue
        max_col = max(ord(k[0]) - 64 for k in cells)
        line = " | ".join(cells.get(col_letter(j + 1), "") for j in range(max_col))
        print(line)
