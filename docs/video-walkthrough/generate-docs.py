"""Generate script.md and screenshot-index.md from chapters.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
chapters = json.loads((ROOT / "chapters.json").read_text(encoding="utf-8"))

script_lines = [
    "# SumayaEngage360 - Video Walkthrough Script",
    "",
    "**Tenant:** sumaya (demo)",
    "**Roles covered:** TENANT_ADMIN, HR, MANAGER, EMPLOYEE, BGC_VENDOR",
    "**Platform:** https://engage360-web.onrender.com",
    "",
]
for ch in chapters:
    script_lines += [
        f"## {ch['id']}: {ch['title']}",
        "",
        f"**Screenshot:** `screenshots/{ch['screenshot']}`",
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
