# Video Walkthrough — Regeneration Guide

## Deliverables

| File | Description |
|------|-------------|
| `SumayaEngage360-Walkthrough.mp4` | Final narrated video |
| `script.md` | Full narration script (80 chapters + appendix) |
| `screenshot-index.md` | Screenshot catalogue |
| `screenshots/` | Raw Playwright captures |
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
python normalize-screenshots.py
powershell -File assemble-video.ps1
```

## Demo credentials

- **Tenant admin:** owner@sumaya.com / Owner@12345 (tenant: sumaya)
- **Walkthrough roles:** walk-hr@sumaya.com, walk-mgr@sumaya.com, walk-emp@sumaya.com, walk-bgc@sumaya.com / Walk@12345
