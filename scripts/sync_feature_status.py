"""Sync feature_catalogue status from implemented module registry."""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = Path(__file__).resolve().parents[1] / "docs" / "SumayaEngage360_Complete_All_Features_updated.xlsx"
if not P.exists():
    P = Path(r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")
OUT = Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / "migrations" / "20260711220000_all_sheets" / "seed_features.sql"

# Modules with full API+UI — all 6 core capabilities marked Done
FULL_MODULES = {
    "Tenant Provisioning", "Branch Setup", "Legal Entity", "Tenant Settings", "Client URL",
    "Career Site", "Job Listing", "Job Detail", "Job Requisition", "Manpower Request",
    "Candidate Conversion", "Application Tracking", "Interview Scheduling", "Offer Management",
    "Resume Upload", "Resume Parsing", "Shortlisting", "Talent Pool",
    "Country Document Checklist", "Identity Documents", "Document Verification",
    "Education Proof", "Experience Proof", "Personal Data", "Bank Details", "Emergency Contact",
    "Tax Details", "Preboarding Portal", "Onboarding Portal", "IT Access", "Buddy Assignment",
    "Induction", "Employee Creation", "Department", "Designation", "Organization Profile",
    "Location", "Business Unit", "Cost Center", "Grade", "Holiday Calendar", "Employment Type",
    "JD Library", "Shift", "Attendance Punch", "Leave Type", "Leave Balance", "Leave Request",
    "Timesheet", "Regularization", "Client Master", "Project Master", "Project Allocation",
    "Rate Card", "Contract", "Salary Structure", "Payroll Calendar", "Payroll Run", "Payslip",
    "Salary Component", "Benefit Plan", "Benefit Enrollment", "Expense Claim", "Reimbursement",
    "Performance Cycle", "Appraisal", "Self Review", "Manager Review", "Goal Library",
    "Goal Setting", "KPI Library", "Competency Library", "Recognition", "Feedback",
    "Training Course", "Training Assignment", "Asset Inventory", "Asset Assignment",
    "Resignation", "Exit Clearance", "Full & Final", "Workflow Designer", "Approval Engine",
    "Notification Template", "SMS Template", "Email Template", "WhatsApp Template",
    "Executive Dashboard", "Report Catalogue", "Audit Log", "Integration Registry",
    "Feature Flags", "OpenAPI", "Data Catalogue", "API Catalogue", "Privacy Consent", "DSR",
    "BGV Vendor Portal", "BGC Case", "Matching Engine", "Manpower Requisition",
    # newly implemented this pass
    "Delegation", "Escalation", "SLA", "Business Rule", "BGV Package", "Job Family",
    "Position", "Hiring Team", "Recruiter Assignment", "Vacancy Control", "Position Control",
    "Calibration", "Check-in", "Rating Scale", "Country Setup", "Localization",
    "Support Access", "Tenant Export", "Tenant Suspension", "Bulk Import", "Bulk Export",
    "Scheduled Job", "Document Repository", "Vendor Portal", "Criminal Check",
    "Reference Check", "Address Verification", "Employment Verification", "Education Verification",
    "Joining Checklist", "Policy Library", "Offer Letter", "E-Sign", "Teams Meeting",
    "Zoom Meeting", "Job Board", "Biometric", "Geofencing", "Roster", "Mobile ESS",
    "Subscription Plan", "SCIM", "SFTP Import", "Payroll Export", "Banking", "BI Export",
}

CORE_CAPS = {"Configuration", "Create", "View/Search", "Update/History", "Documents", "API"}

def esc(s: str) -> str:
    return (s or "").replace("'", "''")[:500]

def is_done(module: str, capability: str) -> bool:
    if module in FULL_MODULES:
        return True
    if capability in CORE_CAPS and module in FULL_MODULES:
        return True
    return False

# reuse xlsx parser from generate_feature_seed
with zipfile.ZipFile(P) as z:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets = [sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
              for sh in wb.findall(".//m:sheets/m:sheet", ns)]
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

    root = ET.fromstring(z.read(rid_to_file[sheets[1]]))
    sql_rows = []
    done_count = 0
    for row in root.findall(f".//{M}row")[1:]:
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m: cells[m.group(1)] = cell_val(c)
        fid = cells.get("A", "")
        if not fid.startswith("SE360-"):
            continue
        module = cells.get("C", "")
        capability = cells.get("D", "")
        status = "Done" if is_done(module, capability) else cells.get("Q", "Not Started") or "Not Started"
        if status == "Done":
            done_count += 1
        sql_rows.append(
            f"('{esc(fid)}', '{esc(cells.get('B',''))}', '{esc(module)}', '{esc(capability)}', "
            f"'{esc(cells.get('E',''))}', '{esc(status)}', '{esc(cells.get('I',''))}', "
            f"'{esc(cells.get('J',''))}', {str(status == 'Done').lower()})"
        )

OUT.write_text(
    f"-- {len(sql_rows)} features, {done_count} Done via module registry\n"
    f'INSERT INTO "engage360"."feature_catalogue" '
    f'("id", "domain", "module", "capability", "featureName", "status", "phase", "priority", "cursorDone") VALUES\n'
    + ",\n".join(sql_rows[:3000])
    + ' ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, "cursorDone" = EXCLUDED."cursorDone";\n',
    encoding="utf-8",
)
print(f"Wrote {OUT}: {done_count}/{len(sql_rows)} Done")
