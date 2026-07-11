"""Sync api_catalogue_entries.implemented from controller files."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "apps" / "api" / "src" / "modules"

PREFIX_MAP = {
    "tenants": "/tenants", "auth": "/auth", "employees": "/employees", "jobs": "/jobs",
    "candidates": "/candidates", "applications": "/applications", "onboarding": "/onboarding",
    "bgc": "/bgc", "projects": "/projects", "timesheets": "/timesheets",
    "appraisals": "/appraisals", "engagement": "/engagement", "assets": "/assets",
    "trainings": "/trainings", "exit": "/exit", "approvals": "/approvals",
    "dashboard": "/dashboard", "attendance": "/attendance", "leave": "/leave",
    "reports": "/reports", "audit": "/audit", "files": "/files",
    "integrations": "/integrations", "notifications": "/notifications",
    "config": "/config", "org-masters": "/org-masters", "privacy": "/privacy",
    "exports": "/exports", "catalogue": "/v1", "requirements": "/requirements",
    "payroll": "/payroll", "benefits": "/benefits", "expenses": "/expenses",
    "goals": "/goals", "manpower": "/manpower", "preboarding": "/preboarding",
    "matching": "/matching", "careers": "/public/careers", "platform": "/v1",
}

def scan_controllers():
    found = set()
    for f in API_DIR.rglob("*.controller.ts"):
        text = f.read_text(encoding="utf-8")
        m = re.search(r"@Controller\(['\"]([^'\"]+)['\"]\)", text)
        if m:
            found.add(m.group(1))
    return found

def main():
    prefixes = scan_controllers()
    print(f"Found {len(prefixes)} controller prefixes")
    updates = []
    for prefix in prefixes:
        path = PREFIX_MAP.get(prefix, f"/{prefix}")
        updates.append((path, prefix))
    # Print SQL for manual run or use prisma
    lines = []
    for path, _ in updates:
        lines.append(
            f"UPDATE engage360.api_catalogue_entries SET implemented = true, \"actualPath\" = '{path}' "
            f"WHERE endpoint ILIKE '%{path.strip('/').split('/')[-1]}%' OR \"actualPath\" = '{path}';"
        )
    out = ROOT / "apps" / "api" / "prisma" / "migrations" / "20260711240000_sheets_complete" / "sync_api_catalogue.sql"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out} ({len(lines)} updates)")

if __name__ == "__main__":
    main()
