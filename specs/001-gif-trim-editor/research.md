# Phase 0 Research: Video-to-GIF Trim Editor

## 1. Frontend testing framework

**Decision**: Add Vitest + React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`) as new frontend devDependencies.

**Rationale**: The frontend currently has no test runner configured (only `oxlint` for linting). Vitest is the standard pairing for a Vite project — same config/transform pipeline, near-zero extra setup, fast watch mode — and React Testing Library is the de facto way to test component behavior (trim handle dragging, button enable/disable states, polling-driven UI updates) without testing implementation details.

**Alternatives considered**:
- *Jest*: works but needs extra transform config to align with Vite/ESM/TS; no benefit over Vitest here.
- *No frontend tests for MVP*: rejected — the trim-range validation (FR-008) and job-state-driven button enabling (FR-011a, FR-012a) are exactly the kind of logic that regresses silently without tests.

## 2. FFmpeg trim + GIF encoding approach

**Decision**: Two-step FFmpeg pipeline per generation job: (1) generate a palette from the selected range with `palettegen`, (2) encode the GIF with `paletteuse` against that palette, both scoped to the trim range via `-ss <start> -to <end>`.

**Rationale**: A naive single-pass `ffmpeg -ss -to -vf fps=... output.gif` produces noticeably banded/dithered GIFs. The palette-based two-pass approach (`palettegen`/`paletteuse` filters) is FFmpeg's documented best practice for GIF output quality and is a well-understood, single-dependency approach (no extra libraries beyond the `ffmpeg` binary already assumed by the spec).

**Alternatives considered**:
- *Single-pass simple encode*: simpler command, visibly worse quality; rejected since GIF preview quality is the core value proposition.
- *gifski or other external encoders*: better quality/size tradeoff but adds a second binary dependency not mentioned in the spec's FFmpeg-only assumption; rejected for MVP scope.

## 3. Async job execution model

**Decision**: Backend launches each generation job on a `kotlinx.coroutines` coroutine (`Dispatchers.IO`) that runs the FFmpeg subprocess and writes progress/result into a `ConcurrentHashMap<JobId, JobState>`. `POST /videos/{id}/gif` returns the job id immediately; `GET /jobs/{id}` reports `pending | processing | succeeded | failed` (+ gif id on success, error message on failure). No external queue/broker.

**Rationale**: Matches the spec's async-job-with-polling clarification (FR-006b) with the smallest possible mechanism appropriate to single-process, single-session MVP scale (per Technical Context: one job per video at a time, no multi-instance scaling requirement).

**Alternatives considered**:
- *Blocking request*: explicitly rejected by the clarification session.
- *WebSocket/SSE push instead of polling*: lower latency but more moving parts than the spec calls for ("client polls" was the explicit resolution); rejected as over-engineering for MVP.
- *External job queue (e.g., Redis-backed)*: unnecessary infrastructure for a single-process, no-persistence MVP; rejected.

## 4. Temp file storage & cleanup

**Decision**: Store uploaded videos and generated GIFs under a process-local temp directory (`Files.createTempDirectory` or OS temp dir + app subfolder), one subfolder per video id. Files are not proactively deleted during the session (simplicity); left for OS temp cleanup / process restart, consistent with the spec's "nothing persists beyond the session" assumption.

**Rationale**: No persistence requirement exists in the spec, so a durable object store or database is unnecessary complexity. Keeping files on local disk (rather than in memory) avoids holding potentially large video buffers in JVM heap.

**Alternatives considered**:
- *In-memory byte arrays*: simpler code, but risks excessive heap usage for larger videos; rejected.
- *Explicit cleanup job/TTL sweep*: reasonable future hardening, out of scope for MVP since spec sets no retention requirement.

## 5. Upload & polling client contract shape

**Decision**: Three REST endpoints, JSON except upload/download: `POST /videos` (multipart, returns `{videoId, durationSeconds}`), `POST /videos/{videoId}/gif` (JSON body `{startSeconds, endSeconds}`, returns `{jobId}`), `GET /jobs/{jobId}` (returns status + `gifId` once succeeded), `GET /gifs/{gifId}` (binary `image/gif`, used both for `<img>` preview `src` and as the Download link target).

**Rationale**: Keeps the contract minimal and RESTful, mirrors the spec's entities (Video, Selection Range, Generated GIF, and the async Job introduced by FR-006b) one-to-one, and lets the browser reuse the same GIF URL for both preview (`<img src>`) and download (`<a href download>`) without double-fetching or extra encoding.

**Alternatives considered**:
- *Base64-embed the GIF in the job-status JSON response*: avoids a second request but bloats polling payloads and complicates the Download action; rejected.
- *Single combined "upload+generate" endpoint*: doesn't fit the spec's "adjust selection and regenerate without re-upload" requirement (User Story 3 / FR-010), which needs the video and the generation job to be separable.

## 6. Frontend trim range interaction

**Decision**: Build a custom dual-handle drag control (two absolutely-positioned handles over a track representing the video duration) driven by pointer events, synced with the `<video>` element's `currentTime`/`duration`. No third-party range-slider library.

**Rationale**: The spec explicitly scoped interaction to drag/scrub only (no keyboard requirement — see Clarifications), and requirements are simple enough (two handles, 1-second minimum gap enforcement per FR-008, no overlap) that a small custom component avoids an extra dependency.

**Alternatives considered**:
- *Third-party range-slider library (e.g., rc-slider)*: saves some code but pulls in a dependency for a narrowly-scoped, already-simple interaction; rejected for MVP.

## Outstanding NEEDS CLARIFICATION

None — all Technical Context unknowns are resolved above.
