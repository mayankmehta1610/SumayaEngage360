"""Normalize walkthrough screenshots to 1440x1080 for video encoding."""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "screenshots"
DST = ROOT / "screenshots-normalized"
DST.mkdir(exist_ok=True)

VF = (
    "scale=1440:1080:force_original_aspect_ratio=decrease,"
    "pad=1440:1080:(ow-iw)/2:(oh-ih)/2:color=0xF4F6FA"
)

for src in sorted(SRC.glob("*.png")):
    dst = DST / src.name
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        continue
    print(f"Normalize {src.name}")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(src),
            "-vf", VF,
            str(dst),
        ],
        check=True,
        capture_output=True,
    )

print(f"Done -> {DST}")
