"""Parse SumayaEngage360 requirements spreadsheet (sheets 5-12)."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def main() -> None:
    p = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")
    with zipfile.ZipFile(p) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = []
        for sh in wb.findall(".//m:sheets/m:sheet", NS):
            sheets.append(
                {
                    "name": sh.attrib.get("name"),
                    "id": sh.attrib.get("sheetId"),
                    "rid": sh.attrib.get(
                        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                    ),
                }
            )
        print("SHEETS:", json.dumps(sheets, indent=2))

        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_file = {r.attrib["Id"]: r.attrib["Target"] for r in rels}

        shared: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
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

        for i, sh in enumerate(sheets):
            # Sheets 05_NFR through 12_AI_Execution (indices 5-12)
            if i < 5 or i > 12:
                continue
            target = rid_to_file[sh["rid"]].lstrip("/")
            root = ET.fromstring(z.read(target))
            rows = root.findall(f".//{M}row")
            print(f"\n=== SHEET {i + 1}: {sh['name']} ===")
            print("HEADER ROW:")
            for row in rows[:3]:
                cells = {}
                for c in row.findall(f"{M}c"):
                    ref = c.attrib.get("r", "")
                    m = re.match(r"([A-Z]+)", ref)
                    if m:
                        cells[m.group(1)] = cell_val(c)
                line = " | ".join(cells.get(col_letter(j + 1), "")[:50] for j in range(15))
                if line.strip(" |"):
                    print(line)

            # Count rows with feature data and status columns
            data_rows = 0
            done_counts: dict[str, int] = {}
            for row in rows[1:]:
                cells = {}
                for c in row.findall(f"{M}c"):
                    ref = c.attrib.get("r", "")
                    m = re.match(r"([A-Z]+)", ref)
                    if m:
                        cells[m.group(1)] = cell_val(c)
                if cells.get("A") or cells.get("B"):
                    data_rows += 1
                    for col in ["G", "H", "I", "J", "K", "L", "M", "N"]:
                        val = cells.get(col, "").strip().lower()
                        if val:
                            done_counts[col] = done_counts.get(col, 0) + 1

            print(f"Data rows (approx): {data_rows}")
            print(f"Status column fill counts: {done_counts}")

            # Show first 10 incomplete-looking rows (no Done in any status col)
            print("SAMPLE ROWS (first 15 data):")
            shown = 0
            for row in rows[1:]:
                cells = {}
                for c in row.findall(f"{M}c"):
                    ref = c.attrib.get("r", "")
                    m = re.match(r"([A-Z]+)", ref)
                    if m:
                        cells[m.group(1)] = cell_val(c)
                if not (cells.get("A") or cells.get("B") or cells.get("C")):
                    continue
                line = " | ".join(cells.get(col_letter(j + 1), "")[:35] for j in range(10))
                print(line)
                shown += 1
                if shown >= 15:
                    break


if __name__ == "__main__":
    main()
