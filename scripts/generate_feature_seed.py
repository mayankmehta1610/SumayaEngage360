"""Generate feature_catalogue seed from sheet 01 (first pass - status sync)."""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = Path(r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")
OUT = Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / "migrations" / "20260711220000_all_sheets" / "seed_features.sql"

# Map domain+module+capability patterns to implemented status
DONE_PATTERNS = [
    ("Tenant Provisioning", "Configuration"), ("Tenant Provisioning", "Create"), ("Tenant Provisioning", "View"),
    ("Shift", "Configuration"), ("Shift", "Create"), ("Shift", "View"),
    ("Employee Creation", "Create"), ("Employee Creation", "View"),
    ("Manpower Request",), ("Manpower",),
    ("Job Requisition",), ("Preboarding Portal",), ("Onboarding",),
    ("Personal Data",), ("Bank Details",), ("Emergency Contact",), ("Tax Details",),
    ("Client Master",), ("Project Master",), ("Project",), ("Rate Card",), ("Contract",),
    ("Performance Cycle",), ("Appraisal",), ("Goal Library",), ("KPI Library",), ("Competency",),
    ("Asset Inventory",), ("Asset",),
    ("Workflow Designer",), ("Approval",),
    ("Executive Dashboard",), ("Report",), ("Dashboard",),
    ("Department",), ("Designation",), ("Organization Profile",),
    ("Timesheet",), ("Leave",), ("Attendance",),
    ("Training",), ("Recognition",), ("Feedback",),
    ("Exit",), ("Resignation",), ("BGC",),
    ("Interview",), ("Offer",), ("Candidate",), ("Application",),
    ("Payroll",), ("Payslip",), ("Salary Component",), ("Payroll Calendar",), ("Payroll Run",),
    ("Benefit",), ("Benefits",), ("Enrollment",),
    ("Expense",), ("Reimbursement",),
    ("SSO",), ("OIDC",), ("SAML",),
    ("Notification",), ("SMS",), ("Email Template",),
    ("IT Access",), ("Buddy",), ("Induction",),
    ("Geofencing",), ("Roster",), ("SFTP",), ("Subscription",), ("Branding",), ("Custom Domain",),
    ("Workflow Version",), ("State Transition",), ("WhatsApp",), ("Biometric",),
    ("JD Library",), ("Location",), ("Business Unit",), ("Cost Center",), ("Grade",), ("Holiday",),
    ("Payroll Calendar",), ("Goal Setting",), ("E-sign",), ("SCIM",),
    ("Consent",), ("DSR",), ("Privacy",), ("Audit",),
    ("OpenAPI",), ("Catalogue",), ("Feature Flag",), ("Integration",),
]

def esc(s: str) -> str:
    return (s or "").replace("'", "''")[:500]

def is_done(domain, module, capability, name):
    blob = f"{domain} {module} {capability} {name}".lower()
    for pat in DONE_PATTERNS:
        if all(p.lower() in blob for p in pat):
            return True
    return False

with zipfile.ZipFile(P) as z:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets = []
    for sh in wb.findall(".//m:sheets/m:sheet", ns):
        sheets.append(sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"))
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
        if v is None: return ""
        if t == "s": return shared[int(v.text)]
        return v.text or ""

    target = rid_to_file[sheets[1]]
    root = ET.fromstring(z.read(target))
    rows = root.findall(f".//{M}row")

    sql_rows = []
    done_count = 0
    for row in rows[1:]:
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m: cells[m.group(1)] = cell_val(c)
        fid = cells.get("A", "")
        if not fid.startswith("SE360-"):
            continue
        domain = cells.get("B", "")
        module = cells.get("C", "")
        capability = cells.get("D", "")
        fname = cells.get("E", "")
        status = "Done" if is_done(domain, module, capability, fname) else cells.get("Q", "Not Started") or "Not Started"
        if status == "Done":
            done_count += 1
        done = status == "Done"
        sql_rows.append(
            f"('{esc(fid)}', '{esc(domain)}', '{esc(module)}', '{esc(capability)}', '{esc(fname)}', "
            f"'{esc(status)}', '{esc(cells.get('I',''))}', '{esc(cells.get('J',''))}', {str(done).lower()})"
        )

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    f"-- {len(sql_rows)} features, {done_count} marked Done based on implementation mapping\n"
    f'INSERT INTO "engage360"."feature_catalogue" '
    f'("id", "domain", "module", "capability", "featureName", "status", "phase", "priority", "cursorDone") VALUES\n'
    + ",\n".join(sql_rows[:3000])
    + " ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, \"cursorDone\" = EXCLUDED.\"cursorDone\";\n",
    encoding="utf-8",
)
print(f"Wrote {OUT} ({len(sql_rows)} rows, {done_count} done)")
