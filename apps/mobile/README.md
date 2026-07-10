# Engage360 Mobile (Flutter)

Employee self-service app for iOS + Android:

- Profile & document upload (camera capture for identity documents)
- Timesheets: entry, submission, and manager approve/discard inbox
- Trainings: **locked video player** — mandatory videos have no seek/skip/close;
  progress heartbeats sent to the API, which is the source of truth for completion
- Quizzes attached to training videos
- Recognition feed, 360° feedback
- Salary/payslip view
- Resignation submission and exit-process tracking
- Push notifications for approvals and assignments

## Setup

```bash
flutter create . --org com.engage360 --project-name engage360_mobile
flutter pub get
flutter run
```

## Key packages (planned)

- `dio` — API client (JWT + x-tenant-id interceptors)
- `video_player` + custom chrome-less controls for no-skip playback
- `flutter_secure_storage` — token storage
- `firebase_messaging` — push notifications
