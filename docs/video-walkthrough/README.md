# Video Walkthrough — Regeneration Guide

## Deliverables

| File | Description |
|------|-------------|
| `SumayaEngage360-Verified-Audit-Walkthrough.mp4` | Complete 92-screen narrated verification video |
| `SumayaEngage360-Walkthrough.mp4` | Original 80-screen narrated tour |
| `script.md` | Full narration script (92 screen-level chapters) |
| `screenshot-index.md` | Screenshot catalogue |
| `screenshots/` | Raw Playwright captures |
| `screenshots-audit/` | Verified role, workflow, and tenant-isolation captures |
| `screenshots-normalized/` | 1440×1080 frames for video |
| `audio/` | edge-tts MP3 per chapter |
| `chapters.json` | Manifest driving audio + video |

## Capture screenshots

From `apps/web`:

```bash
WEB_URL=https://engage360-web.onrender.com npx playwright test walkthrough-capture.spec.ts
```

Resume scripts: `walkthrough-capture-resume.spec.ts`, `walkthrough-capture-bgc.spec.ts`

## Build pipeline

```powershell
cd docs/video-walkthrough
python build-chapters.py      # chapters.json from screenshots
python generate-docs.py         # script.md + screenshot-index.md
powershell -File generate-audio.ps1
powershell -File generate-audio.ps1 -Manifest audit-chapters.json
python normalize-screenshots.py
powershell -File assemble-verified-video.ps1
```

## Demo credentials

- **Tenant admin:** owner@sumaya.com / Owner@12345 (tenant: sumaya)
- **Walkthrough roles:** use environment-specific seeded accounts; automated captures create isolated tenants and role users.
