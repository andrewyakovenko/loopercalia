# Feature Specification: Video-to-GIF Trim Editor

**Feature Branch**: `001-gif-trim-editor`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Now let's implement the MVP. The user should be able to upload a video and view it in a simple editor where they can select the start and end points of the future GIF. There should be a Generate button that generates and displays a GIF preview, and a Download button that downloads the currently generated GIF. The video editor and the GIF preview should be positioned side by side horizontally."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trim a video into a GIF preview (Priority: P1)

A user uploads a video, sees it loaded into an editor, and selects a start point and an end point for the portion they want to turn into a GIF. They click "Generate" and a preview of the resulting GIF appears next to the editor, reflecting exactly the selected range.

**Why this priority**: This is the core value of the product — turning a chosen slice of a video into a GIF the user can see before committing to it. Without this, there is no product.

**Independent Test**: Can be fully tested by uploading a video, dragging the start/end markers to a range, clicking "Generate", and confirming a GIF preview appears next to the editor that visibly corresponds to the selected range.

**Acceptance Scenarios**:

1. **Given** no video is loaded, **When** the user uploads a video file, **Then** the video appears in the editor, ready for trimming.
2. **Given** a video is loaded in the editor, **When** the user sets a start point and an end point, **Then** both points are visibly marked in the editor.
3. **Given** a valid start and end point are selected, **When** the user clicks "Generate", **Then** a GIF preview appears next to the editor, covering exactly the selected range.

---

### User Story 2 - Download the generated GIF (Priority: P2)

After generating a GIF preview, the user clicks "Download" to save the currently generated GIF to their device.

**Why this priority**: Previewing a GIF has no lasting value unless the user can actually take it with them — this is what completes the MVP's purpose.

**Independent Test**: Can be fully tested by generating a GIF preview and then clicking "Download", confirming a GIF file matching the preview is saved.

**Acceptance Scenarios**:

1. **Given** a GIF has been generated and is showing in the preview, **When** the user clicks "Download", **Then** a GIF file matching the preview is downloaded to the user's device.
2. **Given** no GIF has been generated yet, **When** the user looks at the "Download" action, **Then** it is disabled or otherwise clearly unavailable.

---

### User Story 3 - Adjust the selection and regenerate (Priority: P3)

After seeing a GIF preview, the user is not satisfied with the range and adjusts the start and/or end point, then clicks "Generate" again to update the preview — without re-uploading the video.

**Why this priority**: This turns the tool from a one-shot generator into a usable editor, letting users iterate toward the loop they actually want. It builds directly on User Story 1 and is not required for a first working version.

**Independent Test**: Can be fully tested by generating a GIF, changing the start or end point, clicking "Generate" again, and confirming the preview updates to reflect the new range without requiring a new upload.

**Acceptance Scenarios**:

1. **Given** a GIF preview is already showing, **When** the user changes the start or end point and clicks "Generate" again, **Then** the preview updates to reflect the new selection.

---

### User Story 4 - Select a different video (Priority: P3)

The user can select a different video from their device to replace the currently loaded video and start editing the new one.

**Why this priority**: This allows users to switch between videos without restarting the application. It improves usability but is not required for the core GIF generation flow.

**Independent Test**:  Can be fully tested by loading a video, selecting a different video from the device, and confirming that the newly selected video replaces the previous one in the editor.

**Acceptance Scenarios**:

1. **Given** a video is already loaded, **When** the user selects a different video from their device, **Then** the new video replaces the current video in the editor and the selection state is reset.

---

### Edge Cases

- When the user attempts to set the start point after the end point (or vice versa): the selection controls prevent this state from being created (see FR-008); no invalid range can ever be submitted for generation.
- When the user attempts to select a range shorter than 1 second: the selection controls prevent it (see FR-008), enforcing a minimum 1-second range at all times.
- When the user uploads a file that is not a valid video: the file is rejected with an inline error message, and the editor remains empty/unloaded (no video is displayed).
- When the user clicks "Generate" while a previous generation is still in progress: the "Generate" action is disabled until the in-progress generation completes, preventing overlapping requests. The selection controls are not disable.
- When GIF generation fails (e.g., corrupted video, unsupported codec): the error is shown separately (e.g., inline banner) and, if a previously generated GIF is already showing, that preview remains visible and downloadable — a failed regeneration attempt does not clear or invalidate the last successful GIF.

## Clarifications

### Session 2026-08-12

- Q: Where should the actual video-to-GIF conversion happen — entirely in the user's browser, or by uploading the video to a backend server for processing? → A: Server-side using ffmpeg
- Q: What should happen if the user clicks "Generate" again while a previous generation is still in progress? → A: Disable "Generate" until the in-progress generation completes. Selection controls should remain enabled, since the start and end points for the current generation have already been sent to the backend.
- Q: What should happen when the user uploads a file that is not a valid video? → A: Reject the file and show an inline error message; the editor stays empty/unloaded, no video is displayed
- Q: Should the "Generate" action be disabled until the user has selected a valid start and end point, or should it be clickable but show an error if clicked without one? → A: The start/end selection controls themselves must prevent invalid states from being created (matching FR-008); "Generate" is only enabled once a valid selection exists. 
- Q: Where should the start and end points be positioned immediately after a video is uploaded? → The start point should be set to the beginning of the video, and the end point should be set to the end of the video.
- Q: Is there a maximum video length or file size the system needs to support for upload? → A: No explicit limit for MVP; any reasonably-sized browser-playable video is in scope, with a practical technical ceiling left as an implementation detail
- Q: When a GIF generation attempt fails, what should happen to the previously generated GIF preview (if one exists) and its download availability? → A: Keep the last successful GIF preview visible and downloadable; show the error separately (e.g., inline banner) without clearing the preview
- Q: Should GIF generation be a single blocking request that the client waits on, or does the backend need to support long-running jobs with progress polling? → A: Async job + polling — the backend returns a job id immediately, and the client polls for status/progress until the GIF is ready
- Q: Do the start/end trim points need to be adjustable via keyboard input, or is drag/scrub-only interaction sufficient for this MVP? → A: Drag/scrub only — no dedicated keyboard-only path is required for the MVP

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to upload a video file from their device.
- **FR-001a**: System MUST reject files that are not valid video files, showing an inline error message and leaving the editor empty/unloaded.
- **FR-002**: System MUST display the uploaded video in an editor view immediately after a successful upload.
- **FR-003**: Users MUST be able to select a start point and an end point within the video's duration.
- **FR-004**: System MUST visually indicate the currently selected start and end points within the editor.
- **FR-005**: Users MUST be able to trigger GIF generation via a "Generate" action, using the currently selected start and end points.
- **FR-005a**: Upon successful upload, System MUST default the start point to the beginning of the video and the end point to the end of the video, so a valid selection exists immediately and the "Generate" action is enabled from the start; the selection controls themselves MUST continue to prevent an invalid range (per FR-008) from being created thereafter.
- **FR-006**: System MUST display the generated GIF as a preview positioned side by side (horizontally) with the video editor.
- **FR-006a**: GIF generation MUST be performed server-side: the client sends the uploaded video (or the relevant range) to a backend service, which uses ffmpeg to produce the GIF and returns it to the client for preview and download.
- **FR-006b**: GIF generation MUST run as an asynchronous job: the backend accepts the generation request and returns a job identifier immediately, and the client polls for job status/progress until the job completes (successfully or with failure) and the GIF becomes available.
- **FR-007**: Users MUST be able to download the currently generated GIF via a "Download" action.
- **FR-008**: System MUST prevent the user from selecting start and end points that are less than 1 second apart, and MUST NOT allow the start point to be set after the end point.
- **FR-009**: System MUST prevent downloading before any GIF has been generated in the current session.
- **FR-010**: Users MUST be able to change the start/end selection and regenerate the GIF without re-uploading the video.
- **FR-011**: System MUST indicate to the user when a GIF is currently being generated (e.g., a loading/progress state), reflecting the polled job status while the async generation job is in progress.
- **FR-011a**: System MUST disable the "Generate" action while a generation is in progress, and re-enable it only once that generation completes (successfully or with failure).
- **FR-012**: System MUST inform the user if GIF generation fails (e.g., via an inline error banner), rather than leaving the preview area in an unclear state.
- **FR-012a**: If a previously generated GIF is currently showing when a subsequent generation attempt fails, System MUST keep that last successful GIF preview visible and downloadable; a failed regeneration MUST NOT clear or invalidate it.

### Key Entities

- **Video**: The uploaded source file the user is editing. Key attributes: duration, and the fact that it is the basis for the selection range.
- **Selection Range**: The start point and end point, expressed as positions within the video's duration, that define what portion becomes the GIF.
- **Generation Job**: One asynchronous "Generate" invocation for a Video plus a Selection Range (FR-006b). Progresses through pending → processing → succeeded/failed; a new "Generate" click always starts a new Generation Job rather than mutating a finished one. Only succeeded jobs produce a Generated GIF; failed jobs leave any prior Generated GIF untouched (FR-012a).
- **Generated GIF**: The output artifact produced from a Video plus a Selection Range. Exists only after "Generate" succeeds, is shown as a preview, and is what "Download" saves. A new successful "Generate" replaces it; a failed "Generate" attempt leaves the existing Generated GIF (if any) untouched and still downloadable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from uploading a video to downloading a matching GIF using only 4 actions: upload, select start/end, generate, download.
- **SC-002**: 100% of "Generate" actions performed with a valid start/end selection result in a visible GIF preview, without a page reload.
- **SC-003**: The downloaded GIF file always matches what was shown in the preview at the time "Download" was clicked.
- **SC-004**: Users can revise their selection and produce an updated preview at least once without re-uploading the video.
- **SC-005**: Invalid actions (generating without a valid selection, downloading without a generated GIF) are prevented or clearly explained 100% of the time, with no silent failures.

## Assumptions

- This MVP is a single-session flow driven by client interactions: one video, one editor, one GIF preview at a time — no multi-project management, accounts, or saved history are in scope. GIF generation itself is performed server-side (FFmpeg); the video is uploaded to the backend for processing rather than converted in-browser.
- The GIF preview always reflects the most recently *successfully* generated GIF; a successful "Generate" replaces the previous preview and, implicitly, invalidates the previously downloadable GIF. A *failed* generation attempt does not affect the existing preview (see FR-012a).
- Reasonable browser-standard video formats (e.g., MP4, WebM, MOV) are accepted for upload; exhaustive format support is an implementation detail, not a scope boundary for this spec.
- No explicit maximum video length or file size is mandated for this MVP; any reasonably-sized browser-playable video is in scope, with a practical technical ceiling (if any) left as an implementation detail.
- There is no explicit requirement for the uploaded video or generated GIF to be persisted beyond the current session — once the user navigates away, nothing is expected to be retrievable.
- "Side by side horizontally" means the video editor and the GIF preview are both visible at once, next to each other, on typical desktop screen widths; narrow/mobile layout behavior is an implementation detail left to the frontend.
- Start/end trim point selection is drag/scrub-based for this MVP; a dedicated keyboard-only interaction path for setting trim points is out of scope.
