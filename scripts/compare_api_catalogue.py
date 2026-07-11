"""Compare API catalogue sheet vs implemented NestJS routes."""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = Path(r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")
API_SRC = Path(r"c:\Code\SumayaEngage360\apps\api\src")


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def read_sheet(z, sheet_index: int) -> list[dict[str, str]]:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets = []
    for sh in wb.findall(".//m:sheets/m:sheet", ns):
        sheets.append(
            sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        )
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_file = {r.attrib["Id"]: r.attrib["Target"].lstrip("/") for r in rels}
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

    target = rid_to_file[sheets[sheet_index]]
    root = ET.fromstring(z.read(target))
    rows = root.findall(f".//{M}row")
    header = {}
    for c in rows[0].findall(f"{M}c"):
        ref = c.attrib.get("r", "")
        m = re.match(r"([A-Z]+)", ref)
        if m:
            header[m.group(1)] = cell_val(c)
    out = []
    for row in rows[1:]:
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m:
                cells[m.group(1)] = cell_val(c)
        if any(cells.values()):
            out.append({header.get(k, k): v for k, v in cells.items()})
    return out


def collect_routes() -> set[str]:
    routes: set[str] = set()
    for f in API_SRC.rglob("*.controller.ts"):
        text = f.read_text(encoding="utf-8")
        prefix = ""
        m = re.search(r"@Controller\(['\"]([^'\"]*)['\"]\)", text)
        if m:
            prefix = m.group(1).strip("/")
        for dm in re.finditer(r"@(Get|Post|Put|Patch|Delete)\(['\"]([^'\"]*)['\"]\)", text):
            method, path = dm.group(1).upper(), dm.group(2).strip("/")
            full = "/".join(p for p in [prefix, path] if p)
            routes.add(f"{method} /{full}")
    return routes


with zipfile.ZipFile(P) as z:
    apis = read_sheet(z, 7)  # 07_API_Catalogue
    reports = read_sheet(z, 8)  # 08_Reports_KPIs

print("API CATALOGUE HEADER SAMPLE:", list(apis[0].keys()) if apis else [])
print(f"API rows: {len(apis)}")
routes = collect_routes()
print(f"Implemented route decorators: {len(routes)}")

# Print API catalogue first rows
for row in apis[:20]:
    print(row)

print("\n--- REPORTS/KPIs ---")
for row in reports[:20]:
    print(row)

# Try matching API paths
path_col = None
for key in apis[0].keys() if apis else []:
    if "path" in key.lower() or "endpoint" in key.lower() or key in ("C", "D", "E"):
        pass
print("\nAPI keys:", list(apis[0].keys()) if apis else [])
