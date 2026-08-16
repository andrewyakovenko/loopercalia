# Quickstart: Video-to-GIF Trim Editor

Validates the feature end-to-end against the acceptance scenarios in [spec.md](./spec.md). See [data-model.md](./data-model.md) for entity shapes and [contracts/api.yaml](./contracts/api.yaml) for the exact request/response schemas referenced below.

## Prerequisites

- `ffmpeg` (and `ffprobe`) available on `PATH` (already confirmed present locally at `/usr/local/bin/ffmpeg`)
- JDK for the backend (Gradle toolchain via `./gradlew`)
- Node.js for the frontend (`frontend/package.json` — Vite 8, React 19)
- A short sample video file on disk (a few seconds, MP4/WebM/MOV) for manual testing
- `jq` installed if also running other `/speckit-*` scripts in this repo (unrelated to this feature but required repo-wide)

## Setup

```bash
# Backend
cd backend
./gradlew run          # starts Ktor on http://localhost:8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # starts Vite on http://localhost:5173, proxies /api -> :8080
```

Open the frontend dev URL in a browser.

## Scenario 1 — Trim a video into a GIF preview (User Story 1, P1)

1. In the editor, upload the sample video.
   - **Expect**: the video loads and plays in the editor; start/end markers default to the very beginning and very end of the video (FR-005a).
2. Drag the start and end markers to a shorter range (e.g., first 3 seconds).
   - **Expect**: both markers visibly move and reflect the new range; the control refuses to let start cross end or the range drop below 1 second (FR-008).
3. Click **Generate**.
   - **Expect**: `POST /api/videos/{videoId}/gif` fires with the selected range, returns a `jobId`; the UI shows a loading/progress state and disables **Generate** (FR-011, FR-011a) while selection controls remain usable.
   - **Expect**: the client polls `GET /api/jobs/{jobId}` until `status: succeeded`, then fetches `GET /api/gifs/{gifId}` and shows it as a preview next to the editor (FR-006), matching the selected range.

**Pass condition**: a GIF preview appears next to the editor without a page reload, visibly corresponding to the trimmed range.

## Scenario 2 — Download the generated GIF (User Story 2, P2)

1. With a GIF already generated from Scenario 1, click **Download**.
   - **Expect**: a `.gif` file is saved to the device, byte-identical to what `GET /api/gifs/{gifId}` returned for the current preview (FR-007, SC-003).
2. Reload the app fresh (new session, nothing generated yet) and check the Download control before generating anything.
   - **Expect**: Download is disabled/unavailable until a GIF exists (FR-009).

## Scenario 3 — Adjust the selection and regenerate (User Story 3, P3)

1. With a GIF already showing, drag the start or end marker to a different range.
2. Click **Generate** again (without re-uploading).
   - **Expect**: a new job starts; once it succeeds, the preview updates to the new range and Download now serves the updated GIF (SC-004).

## Scenario 4 — Select a different video (User Story 4, P3)

1. With a video already loaded (and optionally a GIF generated), choose a different video file from disk.
   - **Expect**: the new video replaces the old one in the editor; the selection resets to the new video's full range (FR-005a); any prior GIF preview/download state is cleared since it belonged to the old video.

## Edge cases to spot-check

- **Invalid file upload**: pick a non-video file (e.g., a `.txt`). Expect an inline error message and the editor stays empty (FR-001a).
- **Overlapping Generate clicks**: click Generate, then immediately try clicking it again before the job resolves. Expect it to be disabled/no-op the second time (FR-011a).
- **Generation failure**: point the backend at a corrupted/unsupported video (or simulate an FFmpeg failure) after already having a successful GIF showing. Expect an inline error banner and the *existing* GIF preview/download to remain untouched (FR-012, FR-012a) — this is the key regression check for the async-failure clarification.
- **Sub-1-second / inverted range**: try to drag end before start, or collapse the range below 1 second. Expect the control itself to prevent it (FR-008), not a post-hoc error.

## Automated test entry points

- Backend: `cd backend && ./gradlew test` — add contract tests for the four endpoints in `contracts/api.yaml` and a unit test for the FFmpeg command builder (see `research.md` §2).
- Frontend: `cd frontend && npx vitest run` (once Vitest is added per `research.md` §1) — cover the trim-range control's validation rules (FR-008) and the job-polling hook's state transitions (pending → processing → succeeded/failed).
