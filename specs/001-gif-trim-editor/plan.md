# Implementation Plan: Video-to-GIF Trim Editor

**Branch**: `001-gif-trim-editor` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-gif-trim-editor/spec.md`

## Summary

Users upload a video into a browser editor, drag start/end markers to trim a range, and generate a GIF preview shown side by side with the editor; a Download action saves the currently generated GIF. GIF generation runs server-side via ffmpeg as an asynchronous job (client polls for status) so the UI stays responsive; a failed regeneration never destroys the last successful preview.

Technical approach: the existing React 19 + TypeScript (Vite) frontend gets a video editor view (native `<video>` element plus a custom drag-based dual-handle range control) that talks to the existing Kotlin/Ktor backend over a small REST API. The backend accepts a multipart video upload, stores it as a temp file, and on "Generate" starts an async job that shells out to ffmpeg (palette-based two-pass encode for reasonable GIF quality/size) to produce the trimmed GIF; job status and file locations are tracked in an in-memory store keyed by job/video id. The client polls the job endpoint until it resolves, then fetches the GIF for preview and download.

## Technical Context

**Language/Version**: Kotlin 2.0.20 (JVM, backend) / TypeScript ~6.0 + React 19 (frontend, via Vite 8)

**Primary Dependencies**: Backend: Ktor 3.0.1 (`server-core`, `server-netty`, `content-negotiation`, `serialization-kotlinx-json`, `cors`, `call-logging`), kotlinx.coroutines (async job execution), system `ffmpeg` binary invoked as a subprocess. Frontend: React 19, Vite 8, native HTML5 `<video>` element (no video-editing library) — decision recorded in [research.md](./research.md).

**Storage**: No database. Uploaded videos and generated GIFs are held as temp files on the backend's local filesystem for the lifetime of the session/process; job status and file-path metadata live in an in-memory map (`ConcurrentHashMap`). Nothing is expected to survive a backend restart, matching the spec's session-only persistence assumption.

**Testing**: Backend: `kotlin.test` + `ktor-server-test-host` (already present in `build.gradle.kts`). Frontend: Vitest + React Testing Library, newly added — decision recorded in [research.md](./research.md).

**Target Platform**: Backend: JVM process (Netty engine) on a Linux/macOS dev or server host with `ffmpeg` on `PATH`. Frontend: modern evergreen desktop browsers (Chrome/Firefox/Safari/Edge, last 2 versions).

**Project Type**: Web application (existing `backend/` Ktor service + `frontend/` Vite/React app, matching the repo's current scaffold — Option 2 structure below).

**Performance Goals**: No hard SLA is defined by the spec. Working target from research: polling interval of ~1s gives perceived responsiveness without hammering the backend; typical short clips (a few seconds to ~30s) should complete GIF generation within tens of seconds on ffmpeg's palette-based pipeline. Not a contractual constraint — implementation detail only.

**Constraints**: No enforced max upload size/duration (per spec Assumptions); one generation job per video may run at a time (FR-011a disables "Generate" while in progress), so the backend does not need to handle overlapping jobs for the same video. In-memory job/file state means horizontal scaling or backend restarts mid-job are out of scope for this MVP.

**Scale/Scope**: Single-user, single-session demo scale — one video, one active job, one GIF preview at a time per browser session. No concurrent multi-user load targets defined.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (placeholder principle names/descriptions, no ratified version) — the project has not adopted concrete constitutional principles yet. There is nothing to check compliance against, so this gate is treated as **PASS (no applicable gates)** by default. No violations to justify in Complexity Tracking.

*Recommendation (non-blocking): run `/speckit-constitution` at some point to establish real principles; until then this section will keep passing vacuously.*

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/api.yaml, quickstart.md) introduce no new projects, services, or infrastructure beyond the existing `backend/`+`frontend/` scaffold and add only in-process/in-memory state — still **PASS (no applicable gates)**, no changes to this conclusion.

## Project Structure

### Documentation (this feature)

```text
specs/001-gif-trim-editor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.yaml
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/main/kotlin/com/loopercalia/backend/
│   ├── Application.kt          # existing entrypoint/module wiring — add new routes here
│   ├── videos/
│   │   ├── VideoUploadRoutes.kt    # POST /videos (multipart upload)
│   │   └── VideoStore.kt           # in-memory registry of uploaded videos -> temp file paths
│   ├── gif/
│   │   ├── GifJobRoutes.kt         # POST /videos/{id}/gif, GET /jobs/{id}
│   │   ├── GifJobService.kt        # launches coroutine job, invokes FFmpeg, updates job state
│   │   └── FfmpegGifEncoder.kt     # builds/runs the ffmpeg trim+palette command
│   └── files/
│       └── FileDownloadRoutes.kt   # GET /gifs/{id} (preview + download)
└── src/test/kotlin/com/loopercalia/backend/
    ├── ApplicationTest.kt          # existing
    └── (new contract/unit tests for the routes/services above)

frontend/
├── src/
│   ├── App.tsx                     # existing shell — wires the editor + preview side by side
│   ├── api/
│   │   └── gifClient.ts            # fetch wrappers: upload, generate, poll job, gif URL
│   ├── components/
│   │   ├── VideoEditor.tsx         # <video> + trim range control (upload, start/end drag)
│   │   ├── TrimRangeControl.tsx    # dual-handle drag control over the video duration
│   │   └── GifPreviewPanel.tsx     # preview image, Generate/Download buttons, error banner
│   └── hooks/
│       └── useGifGenerationJob.ts  # owns job polling state machine (idle/pending/succeeded/failed)
└── src/ (existing test setup to be added: vitest config + setupTests)
```

**Structure Decision**: Web application using the two projects already scaffolded in this repo — `backend/` (Kotlin/Ktor) and `frontend/` (React/Vite) — extended with feature-specific modules under `videos/`, `gif/`, and `files/` on the backend, and `api/`, `components/`, `hooks/` on the frontend. No new top-level projects are introduced.

## Complexity Tracking

*No constitution violations to justify — section intentionally left empty (see Constitution Check above).*
