"""Build chapters.json narration manifest from captured screenshots."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "screenshots"
OUT = ROOT / "chapters.json"

NARRATION: dict[str, str] = {
    "01-landing": (
        "Welcome to Sumaya Engage 360, an enterprise platform for hiring, onboarding, and managing "
        "the full employee lifecycle. This multi-tenant SaaS gives each company an isolated workspace. "
        "The landing page introduces the product and links to login and public careers."
    ),
    "02-careers-public": (
        "Candidates apply through public careers pages, one per hiring client. Each job card shows "
        "title, location, skills, and an Apply Now form. Applications flow directly into HR's pipeline "
        "without requiring a login."
    ),
    "03-login": (
        "Staff sign in with tenant subdomain, email, and password. Platform administrators leave the "
        "tenant field empty. After authentication, users land in the application shell with modules "
        "filtered by their assigned roles."
    ),
}

ROUTE_BLURBS: dict[str, str] = {
    "dashboard": "The dashboard aggregates live KPIs—open jobs, applications, headcount, and pending approvals—with tiles that drill into underlying data.",
    "reports": "Reports provides a catalogue of KPI definitions. Select a report code, set filters, and run to generate on-screen analytics with export options.",
    "settings": "Settings configures tenant-wide options: branding, approval thresholds, integrations, and feature toggles managed by tenant admins and HR.",
    "catalogues": "Catalogues hold reference data seeded for the tenant—skills, document types, policy templates, and other master lists used across modules.",
    "requirements": "Requirements tracks implementation coverage against the product specification, useful during rollout and compliance reviews.",
    "audit": "The audit trail records privileged actions across the tenant—who changed what and when—for governance and security reviews.",
    "execution": "Execution evidence captures proof that configured workflows and controls were exercised, supporting audits and go-live checklists.",
    "users": "User accounts creates staff logins for HR, managers, interviewers, and BGC vendors—separate from employee records created through hiring.",
    "clients": "Hiring clients represent who you recruit for—internal business units or external staffing clients—each with its own public careers URL.",
    "jobs": "Jobs lets HR create requisitions, define skills and interview rounds, and publish openings to the careers site when ready.",
    "candidates": "The talent pool stores all candidates and parsed resume data, enabling reuse and matching when new jobs are published.",
    "applications": "Applications is the ATS pipeline—track status from applied through interview, offer, onboarding, and hired, with interview evidence.",
    "employees": "The employee directory lists active staff with export options. HR and admins maintain records; managers get read access to their teams.",
    "onboarding": "Onboarding manages new-joiner cases after offer acceptance, coordinating documents, policies, and conversion to employee records.",
    "preboarding-admin": "Preboarding configures the new-hire portal checklist—required documents and policies candidates complete before day one.",
    "org": "Departments shows the org structure, headcount per unit, and department head assignments used in approvals and exit workflows.",
    "exit": "Exit management handles resignations and offboarding—clearance, NOC sign-offs, and separation tasks through the employee lifecycle end.",
    "projects": "Projects tracks client engagements and staffing—link employees to billable work for timesheets and manpower planning.",
    "manpower": "Manpower planning views allocation across projects, highlighting bench, utilization, and demand versus supply.",
    "assets": "Assets registers laptops, phones, and equipment issued to employees, with assignment and return tracking.",
    "leave": "Attendance and leave covers holiday calendars, leave balances, requests, and manager approvals in one module.",
    "timesheets": "Timesheets capture weekly hours against projects. Employees submit; managers review and approve before payroll consumption.",
    "payroll": "Payroll runs salary processing and payslip distribution. HR initiates runs; employees view their own payslips securely.",
    "benefits": "Benefits manages enrollment in health, insurance, and perk programmes with eligibility rules and employee self-service.",
    "expenses": "Expenses handles reimbursement claims—submit receipts, route for approval, and track settlement status.",
    "goals": "Goals supports OKRs and targets aligned to appraisal cycles, visible to employees and their reporting managers.",
    "appraisals": "Appraisals runs performance review cycles with ratings, feedback, and calibration across the organisation.",
    "trainings": "Trainings catalogues courses, schedules sessions, and tracks completion for compliance and skill development.",
    "recognition": "Recognition enables peer and manager appreciation, badges, and 360-degree feedback to drive engagement.",
    "approvals": "The approvals inbox is a unified queue for leave, timesheets, expenses, and workflow tasks awaiting action.",
    "workflows": "Workflows defines approval chains and automation rules that route requests to the right approvers by designation.",
    "notifications": "Notifications configures email and in-app alerts for key events—offers, approvals, and policy updates.",
    "org-masters": "Org masters maintains locations, grades, cost centres, and other structural reference data for HR operations.",
    "masters": "Masters provides additional lookup tables—leave types, expense categories, and module-specific enumerations.",
    "privacy": "Privacy and consent handles data-subject requests, policy acknowledgements, and GDPR-style rights for employees.",
    "profile": "My profile shows the signed-in user's account details, linked employee record, and password preferences.",
    "reports-run": "Running a report executes the query against live data and displays generated results with timestamps for auditability.",
    "bgc-vendor-portal": "BGC vendor users see only assigned background verification cases. They upload reports without access to broader HR data.",
    "bgc-vendor-profile": "Vendors can update their profile and sign out from the minimal sidebar tailored to the BGC_VENDOR role.",
}

SHELL = (
    "Notice the application shell: grouped navigation on the left, module header with breadcrumbs and tabs, "
    "and the signed-in user with role badges at the bottom."
)


def title_for(name: str) -> str:
    base = name.replace(".png", "")
    m = re.match(r"^\d+-(.+)$", base)
    label = m.group(1) if m else base
    return label.replace("-", " ").title()


def narration_for(filename: str) -> str:
    stem = filename.replace(".png", "")
    if stem in NARRATION:
        return NARRATION[stem]

  # role-prefixed: 04-tenant-admin-dashboard
    m = re.match(r"^\d+-(?:tenant-admin|hr|manager|employee|bgc-vendor)-(.+)$", stem)
    if m:
        route = m.group(1)
        role = "tenant admin"
        if "-hr-" in stem or stem.startswith(tuple(f"{i:02d}-hr-" for i in range(41, 50))):
            role = "HR"
        elif "manager-" in stem:
            role = "manager"
        elif "employee-" in stem:
            role = "employee"
        elif "bgc-vendor" in stem:
            role = "BGC vendor"
        blurb = ROUTE_BLURBS.get(route, f"This screen covers the {route.replace('-', ' ')} module.")
        if route in ("dashboard", "profile", "approvals"):
            return f"As a {role}, {blurb} {SHELL}"
        return f"From the {role} perspective: {blurb} {SHELL}"

    return f"This screen shows {title_for(filename)} in Sumaya Engage 360. {SHELL}"


def main() -> None:
    shots = sorted(SHOTS.glob("*.png"))
    chapters = []
    for p in shots:
        stem = p.stem
        num = stem.split("-", 1)[0]
        chapters.append(
            {
                "id": f"ch{num}",
                "screenshot": p.name,
                "title": title_for(p.name),
                "narration": narration_for(p.name),
            }
        )
    OUT.write_text(json.dumps(chapters, indent=2), encoding="utf-8")
    print(f"Wrote {len(chapters)} chapters to {OUT}")


if __name__ == "__main__":
    main()
