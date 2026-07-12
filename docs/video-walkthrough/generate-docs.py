"""Generate script.md and screenshot-index.md from chapters.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
chapters = json.loads((ROOT / "chapters.json").read_text(encoding="utf-8"))
chapters += json.loads((ROOT / "audit-chapters.json").read_text(encoding="utf-8"))

script_lines = [
    "# SumayaEngage360 - Video Walkthrough Script",
    "",
    "**Tenant:** sumaya (demo)",
    "**Roles covered:** PLATFORM_ADMIN, TENANT_ADMIN, HR, MANAGER, EMPLOYEE, INTERVIEWER, BGC_VENDOR, DEPARTMENT_HEAD",
    "**Verification:** 839 of 3,000 workbook features are marked Done from executable evidence; unverified rows remain Not Started.",
    "",
]
for ch in chapters:
    script_lines += [
        f"## {ch['id']}: {ch['title']}",
        "",
        f"**Screenshot:** `{'screenshots-audit' if int(ch['id'][2:]) > 80 else 'screenshots'}/{ch['screenshot']}`",
        "",
        ch["narration"],
        "",
    ]
(ROOT / "script.md").write_text("\n".join(script_lines), encoding="utf-8")

index_lines = [
    "# Screenshot Index",
    "",
    "| # | Chapter | Screenshot | Title |",
    "|---|---------|------------|-------|",
]
for i, ch in enumerate(chapters, 1):
    index_lines.append(f"| {i} | {ch['id']} | `{ch['screenshot']}` | {ch['title']} |")
(ROOT / "screenshot-index.md").write_text("\n".join(index_lines), encoding="utf-8")
print(f"Wrote script.md and screenshot-index.md ({len(chapters)} entries)")
