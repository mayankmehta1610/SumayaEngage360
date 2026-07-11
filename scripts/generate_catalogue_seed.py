"""Generate SQL seed for data entities and API catalogue from spreadsheet."""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
P = Path(r"C:\Users\Admin\AppData\Local\Temp\SumayaEngage360.xlsx")
OUT = Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / "migrations" / "20260711200000_sheets_5_12" / "seed_catalogue.sql"

# Map spreadsheet entity names to implemented Prisma @@map table names
ENTITY_MAP = {
    "Tenant Provisioning": ("tenants", True),
    "Department": ("departments", True),
    "Designation": ("designations", True),
    "Job Requisition": ("jobs", True),
    "Manpower Request": ("manpower_requests", True),
    "Candidate Conversion": ("candidates", True),
    "Employee Creation": ("employees", True),
    "Shift": ("shifts", True),
    "Attendance Punch": ("attendance_punches", True),
    "Attendance Regularization": ("attendance_regularizations", True),
    "Client Master": ("hiring_clients", True),
    "Project Master": ("projects", True),
    "Salary Structure": ("salary_structures", True),
    "Performance Cycle": ("appraisal_cycles", True),
    "Asset Inventory": ("assets", True),
    "Asset Assignment": ("asset_assignments", True),
    "Workflow Designer": ("approval_workflows", True),
    "Feature Flags": ("feature_flags", True),
    "Branch Setup": ("branches", True),
    "Legal Entity": ("legal_entities", True),
    "Location": ("locations", True),
    "Business Unit": ("business_units", True),
    "Cost Center": ("cost_centers", True),
    "Grade": ("grades", True),
    "Holiday Calendar": ("holiday_calendars", True),
    "Benefit Plan": ("benefit_plans", True),
    "Payroll Calendar": ("payroll_calendars", True),
    "Payroll Run": ("payroll_runs", True),
    "Payslip": ("payslips", True),
    "Expense Claim": ("expense_claims", True),
    "Goal Library": ("goal_library", True),
    "KPI Library": ("kpi_library", True),
    "Geofence": ("geofence_zones", True),
    "Roster": ("roster_shifts", True),
    "SFTP Import": ("sftp_import_jobs", True),
    "Notification Template": ("notification_templates", True),
    "SSO Provider": ("sso_providers", True),
    "Subscription Plan": ("subscription_plans", True),
    "Workflow Version": ("workflow_versions", True),
    "Personal Data": ("employee_personal_data", True),
    "Onboarding Task": ("onboarding_tasks", True),
    "Country Document Checklist": ("document_requirements", True),
    "Policy Acknowledgement": ("policy_acknowledgements", True),
    "Executive Dashboard": ("report_definitions", True),
}

# Map API resources to actual implemented paths
API_MAP = {
    "Tenant Provisioning": "/tenants",
    "Department": "/departments",
    "Designation": "/designations",
    "Job Requisition": "/jobs",
    "Manpower Request": "/jobs",
    "Employee Creation": "/employees",
    "Shift": "/shifts",
    "Client Master": "/hiring-clients",
    "Project Master": "/projects",
    "Salary Structure": "/employees",
    "Performance Cycle": "/appraisals/cycles",
    "Asset Inventory": "/assets",
    "Workflow Designer": "/approvals/workflows",
    "Feature Flags": "/config/feature-flags",
    "Branch Setup": "/config/branches",
    "Reports": "/reports",
    "Audit": "/audit",
    "Integrations": "/integrations",
    "OpenAPI": "/v1/openapi.json",
    "Payroll": "/payroll",
    "Benefits": "/benefits",
    "Expenses": "/expenses",
    "Goals": "/goals",
    "Manpower": "/manpower",
    "Preboarding": "/preboarding",
    "Privacy": "/privacy",
    "Notifications": "/notifications",
    "Org Masters": "/org-masters",
    "Requirements": "/requirements",
    "Subscription": "/v1/subscription-plans",
}


def read_sheet(z, idx: int) -> list[list[str]]:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    sheets, names = [], []
    for sh in wb.findall(".//m:sheets/m:sheet", ns):
        sheets.append(sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"))
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
    rows = []
    for row in root.findall(f".//{M}row"):
        cells = {}
        for c in row.findall(f"{M}c"):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)", ref)
            if m:
                cells[m.group(1)] = cell_val(c)
        if cells:
            max_col = max(ord(k[0]) - 64 for k in cells)
            rows.append([cells.get(chr(64 + j), "") for j in range(1, max_col + 1)])
    return rows


def esc(s: str) -> str:
    return s.replace("'", "''")


with zipfile.ZipFile(P) as z:
    ent_rows = read_sheet(z, 6)[2:]  # skip headers
    api_rows = read_sheet(z, 7)[2:]

entity_sql = []
for i, row in enumerate(ent_rows):
    if len(row) < 7 or not row[1]:
        continue
    domain, entity = row[0], row[1]
    prisma_model, implemented = ENTITY_MAP.get(entity, (None, False))
    eid = f"ent{i+1:04d}"
    prisma_sql = f"'{esc(prisma_model)}'" if prisma_model else 'NULL'
    entity_sql.append(
        f"('{eid}', '{esc(domain)}', '{esc(entity)}', '{esc(row[2])}', "
        f"{'true' if row[3] == 'Yes' else 'false'}, {'true' if row[4] == 'Yes' else 'false'}, "
        f"'{esc(row[5])}', '{esc(row[6])}', '{esc(row[7] if len(row) > 7 else '')}', "
        f"{'true' if implemented else 'false'}, {prisma_sql})"
    )

api_sql = []
for i, row in enumerate(api_rows):
    if len(row) < 7 or not row[0].startswith("API-"):
        continue
    api_id, domain, resource = row[0], row[1], row[2]
    actual = API_MAP.get(resource)
    implemented = actual is not None
    path_sql = f"'{esc(actual)}'" if actual else 'NULL'
    api_sql.append(
        f"('{esc(api_id)}', '{esc(domain)}', '{esc(resource)}', '{esc(row[3])}', "
        f"'{esc(row[4])}', '{esc(row[5])}', '{esc(row[6])}', '{esc(row[7] if len(row) > 7 else '')}', "
        f"{'true' if implemented else 'false'}, {path_sql})"
    )

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    f"-- Auto-generated catalogue seed ({len(entity_sql)} entities, {len(api_sql)} APIs)\n"
    f"INSERT INTO \"engage360\".\"data_entity_catalogue\" "
    f"(\"id\", \"domain\", \"entity\", \"purpose\", \"tenantScoped\", \"branchScoped\", \"pii\", \"mandatoryColumns\", \"notes\", \"implemented\", \"prismaModel\") VALUES\n"
    + ",\n".join(entity_sql)
    + ";\n\n"
    f"INSERT INTO \"engage360\".\"api_catalogue_entries\" "
    f"(\"id\", \"domain\", \"resource\", \"endpoint\", \"methods\", \"security\", \"contractRequirements\", \"documentation\", \"implemented\", \"actualPath\") VALUES\n"
    + ",\n".join(api_sql[:301])
    + ";\n",
    encoding="utf-8",
)
print(f"Wrote {OUT} ({len(entity_sql)} entities, {len(api_sql)} APIs)")
