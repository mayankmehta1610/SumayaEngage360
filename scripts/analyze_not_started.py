"""Analyze Not Started features from seed SQL."""
import re
from collections import Counter
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "apps/api/prisma/migrations/20260711220000_all_sheets/seed_features.sql"
text = p.read_text(encoding="utf-8")
rows = []
for line in text.splitlines():
    if "'Not Started'" not in line:
        continue
    parts = line.split("', '")
    if len(parts) >= 5:
        domain = parts[1]
        module = parts[2]
        cap = parts[3]
        rows.append((domain, module, cap))
print(f"Not Started: {len(rows)}")
for (d, m), c in Counter((r[0], r[1]) for r in rows).most_common(25):
    print(f"  {d} / {m}: {c}")
