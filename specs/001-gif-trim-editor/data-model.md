# Phase 1 Data Model: Video-to-GIF Trim Editor

All entities are in-memory / temp-filesystem only for this MVP (no database) — see [research.md](./research.md) §3–4. Lifetimes are bounded by the backend process; nothing is guaranteed to survive a restart, matching the spec's session-only persistence assumption.

## Video

The uploaded source file the user is editing.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Generated on upload; identifies this video for subsequent generate/regenerate calls |
| `originalFilename` | string | As provided by the browser, for display only |
| `filePath` | path (server-internal) | Location of the stored temp file; never exposed to the client |
| `durationSeconds` | number (double) | Probed from the file after upload (e.g., via `ffprobe`); returned to the client to drive the trim range control and default start/end (FR-005a) |
| `uploadedAt` | timestamp | Bookkeeping only |

**Validation / rules**:
- Created only after the upload passes the "is this a valid video" check (FR-001a). Invalid uploads never produce a `Video` record.
- Selecting a different video (User Story 4) creates a new `Video` and does not reuse or mutate the previous one; the previous video's temp file becomes eligible for cleanup.

## Selection Range

The start/end trim points, expressed as an offset into a specific `Video`'s duration. Not persisted as its own record — it is the request payload for starting a Generation Job and is owned by frontend UI state between generations.

| Field | Type | Notes |
|---|---|---|
| `startSeconds` | number (double) | `0 <= startSeconds < endSeconds` |
| `endSeconds` | number (double) | `endSeconds <= video.durationSeconds` |

**Validation / rules** (FR-008, enforced both client-side in the drag control and server-side on job creation):
- `endSeconds - startSeconds >= 1.0` (minimum 1-second range)
- `startSeconds < endSeconds` (start can never be at/after end)
- On successful upload, defaults to `startSeconds = 0`, `endSeconds = video.durationSeconds` (FR-005a)

## Generation Job

Represents one asynchronous "Generate" invocation (FR-006b). This is the aggregate that the client polls.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Returned immediately from the generate call |
| `videoId` | string | FK to `Video.id` |
| `selection` | Selection Range | Snapshot of the range this job was started with |
| `status` | enum: `pending` \| `processing` \| `succeeded` \| `failed` | `pending` immediately after creation, `processing` once the FFmpeg subprocess starts, terminal states are `succeeded`/`failed` |
| `gifId` | string, nullable | Set only when `status = succeeded`; FK to `Generated GIF.id` |
| `errorMessage` | string, nullable | Set only when `status = failed`; human-readable, safe to show in the inline error banner (FR-012) |
| `createdAt` / `completedAt` | timestamp | Bookkeeping / potential future timeout logic |

**State transitions**:

```
pending → processing → succeeded (gifId set)
                     └→ failed (errorMessage set)
```

- No transition out of `succeeded`/`failed` — a new "Generate" click always creates a **new** Generation Job, never mutates a finished one (supports FR-012a: a failed job leaves any prior successful job/GIF untouched).
- Only one *active* (`pending`/`processing`) job may exist per `Video` at a time — the frontend enforces this by disabling "Generate" while a job is active (FR-011a); the backend may treat a second concurrent job request for the same video as a conflict, but need not implement queuing since the UI never sends one.

## Generated GIF

The output artifact of a successful Generation Job.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Referenced by `Generation Job.gifId`; used to build the preview/download URL |
| `jobId` | string | FK back to the Generation Job that produced it |
| `filePath` | path (server-internal) | Location of the encoded `.gif` temp file |
| `sizeBytes` | number | Optional, informational |

**Rules**:
- Exists only once its owning job reaches `succeeded` (Key Entities: "Exists only after Generate succeeds").
- Immutable once created — a new successful job creates a new `Generated GIF` record and the frontend simply swaps its preview `src`/download link to the new one; old GIF files may be cleaned up opportunistically but are not required to be (no persistence requirement).
- "Download" always resolves to whichever `Generated GIF` the frontend currently holds as "current" — i.e., the last one whose owning job succeeded — regardless of any later job's failure (FR-012a, FR-009).

## Relationships

```
Video (1) ──< Generation Job (many, one active at a time) >── Selection Range (embedded/snapshot)
                     │
                     └─(0..1, on success)─> Generated GIF (1)
```

- A `Video` may have many `Generation Job`s over its lifetime (User Story 3: adjust and regenerate).
- Each `Generation Job` produces at most one `Generated GIF` (only on success).
- Uploading a different `Video` (User Story 4) starts this whole graph over: new `Video`, reset `Selection Range` defaults, no carryover of prior jobs/GIFs into the new video's state.
