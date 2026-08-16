---

description: "Task list template for feature implementation"
---

# Tasks: Video-to-GIF Trim Editor

**Input**: Design documents from `/specs/001-gif-trim-editor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml, quickstart.md

**Tests**: Not explicitly requested in the feature spec, so no dedicated automated test-writing tasks are generated. `quickstart.md` provides the manual validation script (see Polish phase); its own "Automated test entry points" section can be used later if the team decides to add tests.

**Organization**: Tasks are grouped by user story (from spec.md: US1–US4) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact and relative to the repository root

## Path Conventions

Web app per plan.md: `backend/src/main/kotlin/com/loopercalia/backend/` (Kotlin/Ktor) and `frontend/src/` (React/TypeScript/Vite).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add tooling and shared type definitions needed before any feature code is written.

- [X] T001 [P] Add Vitest + React Testing Library dev tooling to the frontend (`frontend/package.json`, new `frontend/vitest.config.ts`, new `frontend/src/setupTests.ts`) per research.md §1
- [X] T002 [P] Define backend DTOs matching `contracts/api.yaml` component schemas (`VideoDto`, `SelectionRangeDto`, `JobAcceptedDto`, `JobStatusDto`, `ErrorResponseDto`) in `backend/src/main/kotlin/com/loopercalia/backend/api/Dto.kt`
- [X] T003 [P] Define frontend TypeScript types matching `contracts/api.yaml` (`Video`, `SelectionRange`, `JobStatus`, `ErrorResponse`) in `frontend/src/api/types.ts`

**Checkpoint**: Shared types exist on both sides; no feature behavior yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core in-memory stores, FFmpeg integration, API client, and page shell that every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Implement thread-safe in-memory `VideoStore` (registry of `Video` records keyed by id, per data-model.md "Video") in `backend/src/main/kotlin/com/loopercalia/backend/videos/VideoStore.kt`
- [X] T005 [P] Implement thread-safe in-memory `JobStore` (registry of `Generation Job` and `Generated GIF` records, per data-model.md state machine `pending→processing→succeeded/failed`) in `backend/src/main/kotlin/com/loopercalia/backend/gif/JobStore.kt`
- [X] T006 [P] Implement `TempFileStorage` helper (per-video/per-gif temp directories, save/read bytes, per research.md §4) in `backend/src/main/kotlin/com/loopercalia/backend/files/TempFileStorage.kt`
- [X] T007 [P] Implement `FfmpegGifEncoder` (two-step `palettegen`/`paletteuse` trim+encode per research.md §2, plus an `ffprobe`-based duration lookup used on upload) in `backend/src/main/kotlin/com/loopercalia/backend/gif/FfmpegGifEncoder.kt`
- [X] T008 [P] Implement frontend API client (`uploadVideo`, `startGifGeneration`, `getJobStatus`, `gifUrl`, using the types from T003, per research.md §5) in `frontend/src/api/gifClient.ts`
- [X] T009 [P] Build the side-by-side layout shell (editor pane + preview pane placeholders per FR-006) replacing the current health-check-only content in `frontend/src/App.tsx`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Trim a video into a GIF preview (Priority: P1) 🎯 MVP

**Goal**: A user can upload a video, see it in the editor, select a start/end range, click Generate, and see a GIF preview next to the editor.

**Independent Test**: Upload a video, drag the start/end markers to a range, click "Generate", confirm a GIF preview appears next to the editor corresponding to the selected range (spec.md Independent Test for US1).

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `POST /videos` upload route — validate the file is a real video via `ffprobe` (FR-001a), store it via `TempFileStorage`/`VideoStore`, return 201 `VideoDto` with `durationSeconds` or 400 `ErrorResponseDto` (FR-001, FR-002) in `backend/src/main/kotlin/com/loopercalia/backend/videos/VideoUploadRoutes.kt`
- [X] T011 [P] [US1] Implement `GifJobService` — launches a `Dispatchers.IO` coroutine per job that runs `FfmpegGifEncoder`, advances job status `pending→processing→succeeded/failed` in `JobStore`, and records the `Generated GIF` on success (data-model.md Generation Job) in `backend/src/main/kotlin/com/loopercalia/backend/gif/GifJobService.kt`
- [X] T012 [US1] Implement `POST /videos/{videoId}/gif` (re-validate selection range per FR-008 server-side — reject start>=end or range<1s with 400; 404 for unknown videoId; delegate to `GifJobService`, return 202 `JobAcceptedDto`) and `GET /jobs/{jobId}` (return `JobStatusDto`, 404 if unknown) routes — depends on T011 — in `backend/src/main/kotlin/com/loopercalia/backend/gif/GifJobRoutes.kt`. Note: `contracts/api.yaml` documents a 409 response for a concurrent generation request on the same video; per data-model.md, this is intentionally left unimplemented for MVP since the frontend disables "Generate" while a job is active (FR-011a) and never sends one — not a gap.
- [X] T013 [P] [US1] Implement `GET /gifs/{gifId}` route streaming `image/gif` bytes from `TempFileStorage`, 404 if unknown (FR-006 preview support) in `backend/src/main/kotlin/com/loopercalia/backend/files/FileDownloadRoutes.kt`
- [X] T014 [US1] Register the videos/gif/files route modules in the Ktor routing block — depends on T010, T012, T013 — in `backend/src/main/kotlin/com/loopercalia/backend/Application.kt`
- [X] T015 [P] [US1] Build `VideoEditor` component — file upload input, `<video>` element wired to the uploaded file (FR-001, FR-002) — in `frontend/src/components/VideoEditor.tsx`
- [X] T016 [US1] Handle upload rejection in `VideoEditor` — on a 400 response from `POST /videos`, display the backend's error message inline and leave the editor empty/unloaded, no video shown (FR-001a, Edge Cases) — depends on T015 — in `frontend/src/components/VideoEditor.tsx`
- [X] T017 [P] [US1] Build `TrimRangeControl` component — dual-handle drag control over the video duration, enforcing min-1-second gap and start<end (FR-008), defaulting to `[0, duration]` on load (FR-005a), per research.md §6 — in `frontend/src/components/TrimRangeControl.tsx`
- [X] T018 [P] [US1] Build `useGifGenerationJob` hook — calls `startGifGeneration`, polls `getJobStatus` at a ~1s interval until `succeeded`/`failed` (FR-006b, FR-011) — in `frontend/src/hooks/useGifGenerationJob.ts`
- [X] T019 [US1] Build `GifPreviewPanel` component — Generate button (disabled without a valid selection or while a job is active, FR-011a), loading/progress indicator (FR-011), GIF `<img>` preview (FR-006), inline error banner on failure that leaves any prior successful preview untouched (FR-012, FR-012a) — depends on T018 — in `frontend/src/components/GifPreviewPanel.tsx`
- [X] T020 [US1] Wire `VideoEditor`, `TrimRangeControl`, and `GifPreviewPanel` together via `useGifGenerationJob`, laid out side by side (FR-006) — depends on T015, T016, T017, T018, T019 — in `frontend/src/App.tsx`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Download the generated GIF (Priority: P2)

**Goal**: After a GIF is generated, the user can download it; Download stays disabled until one exists.

**Independent Test**: Generate a GIF preview, click "Download", confirm a matching GIF file is saved; confirm Download is disabled before any GIF exists (spec.md Independent Test for US2).

### Implementation for User Story 2

- [X] T021 [P] [US2] Add the Download action (enabled only once a GIF exists, per FR-009) linking to the current GIF's URL with a `download` attribute (FR-007) in `frontend/src/components/GifPreviewPanel.tsx`
- [X] T022 [P] [US2] Set a `Content-Disposition` header with a sensible `.gif` filename on the `GET /gifs/{gifId}` response so downloads get a proper filename in `backend/src/main/kotlin/com/loopercalia/backend/files/FileDownloadRoutes.kt`

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Adjust the selection and regenerate (Priority: P3)

**Goal**: After seeing a preview, the user changes the start/end range and regenerates without re-uploading.

**Independent Test**: Generate a GIF, change the start or end point, click "Generate" again, confirm the preview updates to the new range without a new upload (spec.md Independent Test for US3).

### Implementation for User Story 3

- [X] T023 [P] [US3] Extend `useGifGenerationJob` to start a new job for the same `videoId` with an updated selection, resetting only job-related state (not the video or its stores) so it can be called repeatedly (FR-010) in `frontend/src/hooks/useGifGenerationJob.ts` — already generic/repeatable as built in T018 (`generate()` resets only `jobStatus`/`errorMessage`, preserves prior `gifId` until a new job resolves); verified no changes needed.
- [X] T024 [P] [US3] Ensure `GifPreviewPanel`'s Generate action reuses the current `videoId` plus the latest `TrimRangeControl` selection, and that a new successful job's GIF replaces the previous preview/download target (SC-004) in `frontend/src/components/GifPreviewPanel.tsx` — `App.tsx`'s `handleGenerate` already reuses current `video.id` + latest `selection` state on every click, and a successful job overwrites `gifId` in hook state, which flows straight into `GifPreviewPanel`; verified no changes needed.

**Checkpoint**: All of US1–US3 work independently; regeneration without re-upload is confirmed.

---

## Phase 6: User Story 4 - Select a different video (Priority: P3)

**Goal**: The user can pick a different video mid-session, replacing the current one and resetting selection/preview state.

**Independent Test**: Load a video, select a different one from disk, confirm the new video replaces the old one in the editor and selection state resets (spec.md Independent Test for US4).

### Implementation for User Story 4

- [X] T025 [P] [US4] Add a "choose a different video" re-upload control that can be used after a video is already loaded (calls the same upload flow as initial load, including the T016 error-handling path) in `frontend/src/components/VideoEditor.tsx` — the single file input in `VideoEditor` (built in T015/T016) stays visible whether or not a video is already loaded, with its label text swapping to "Choose a different video"; it always runs through the same `uploadVideo`/error-handling path.
- [X] T026 [P] [US4] On successful re-upload, reset `TrimRangeControl` to the new video's `[0, duration]` default and clear any existing GIF/job state from the previous video (FR-005a) in `frontend/src/App.tsx` and `frontend/src/hooks/useGifGenerationJob.ts` — `App.tsx`'s `handleVideoLoaded` (T020) already resets `selection` to `[0, durationSeconds]` and calls `gifJob.reset()` on every successful upload, initial or replacement; verified no changes needed.

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and presentation polish across all stories.

- [X] T027 [P] Add basic responsive styling for the side-by-side editor/preview layout (FR-006, per plan.md's "narrow/mobile layout is an implementation detail") in `frontend/src/App.css` — added a `@media (max-width: 720px)` rule that stacks `.editor-preview-row` into a single column.
- [X] T028 Run the `specs/001-gif-trim-editor/quickstart.md` validation script end-to-end (all 4 scenarios + edge cases) and fix any discrepancies found — validated the full backend contract live (local `ffmpeg`/`ffprobe` was broken on this machine; repaired via `brew reinstall ffmpeg` with user approval before testing): upload → `ffprobe`-derived duration → generate → poll → succeeded → GIF download all verified via curl against a real synthetic test video, plus every edge case (invalid file upload, inverted range, sub-1s range, unknown videoId/jobId/gifId) returns the correct 400/404 + error body. `tsc -b && vite build` production build succeeds, `oxlint` is clean, and the Vite `/api` dev proxy was confirmed live. The Chrome browser extension was not connected in this session, so the drag-handle UI and visual side-by-side layout were not exercised in an actual browser — only reviewed by code; recommend a manual click-through before considering this fully done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T008 uses types from T003) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion — no dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational + User Story 1 (reuses the `GET /gifs/{gifId}` route and `GifPreviewPanel` from US1)
- **User Story 3 (Phase 5)**: Depends on Foundational + User Story 1 (reuses the generate/poll flow)
- **User Story 4 (Phase 6)**: Depends on Foundational + User Story 1 (reuses the upload flow and editor state)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Within Each Phase

- Foundational: all tasks (T004–T009) touch independent files and can run in parallel
- US1: routes/service (T010–T014) have an internal dependency chain (T012 needs T011; T014 needs T010+T012+T013); components (T015–T020) have T016 depend on T015, T019 depend on T018, and T020 depend on T015–T019
- US2/US3/US4: each phase's two tasks touch independent files and can run in parallel with each other

### Parallel Opportunities

- All Setup tasks (T001–T003) in parallel
- All Foundational tasks (T004–T009) in parallel
- Within US1: T010, T011, T013, T015, T017, T018 in parallel; T012 after T011; T016 after T015; T019 after T018; T014 after T010+T012+T013; T020 after T015–T019
- T021 and T022 (US2) in parallel
- T023 and T024 (US3) in parallel
- T025 and T026 (US4) in parallel
- Different user story phases can be staffed to different developers once Foundational is done, though US2–US4 each build on US1's UI components

---

## Parallel Example: User Story 1

```bash
# Backend, once Foundational is done:
Task: "Implement POST /videos upload route in backend/src/main/kotlin/com/loopercalia/backend/videos/VideoUploadRoutes.kt"
Task: "Implement GifJobService in backend/src/main/kotlin/com/loopercalia/backend/gif/GifJobService.kt"
Task: "Implement GET /gifs/{gifId} route in backend/src/main/kotlin/com/loopercalia/backend/files/FileDownloadRoutes.kt"

# Frontend, once Foundational is done:
Task: "Build VideoEditor component in frontend/src/components/VideoEditor.tsx"
Task: "Build TrimRangeControl component in frontend/src/components/TrimRangeControl.tsx"
Task: "Build useGifGenerationJob hook in frontend/src/hooks/useGifGenerationJob.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run the US1 portion of `quickstart.md` (Scenario 1) independently
5. Demo if ready — this alone delivers "upload → trim → generate → preview"

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → demo (MVP: preview only, no download yet)
3. Add User Story 2 → validate → demo (adds Download)
4. Add User Story 3 → validate → demo (adds iterate-without-reupload)
5. Add User Story 4 → validate → demo (adds swap-video)
6. Polish → full `quickstart.md` pass

### Parallel Team Strategy

With two developers after Foundational is done:

- Developer A: backend route/service tasks (T010–T014, then T022)
- Developer B: frontend component/hook tasks (T015–T020, then T021, T023–T026)
- Regroup for T014 (route registration) and T020 (App.tsx wiring), which each depend on both sides' pieces being ready

---

## Notes

- [P] tasks touch different files and have no unmet same-phase dependency
- [Story] label maps each task to its user story for traceability
- No automated test tasks were generated (not requested in spec.md); use `quickstart.md` for validation, or add tests later using the Vitest/RTL (T001) and `kotlin.test`/`ktor-server-test-host` tooling already in place
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving to the next
