# loopercalia
smart gif loop generator

The user uploads a video and gets an editor where they can pick the start and end points. A live preview shows how the 
resulting GIF will look, and a download button exports it.

Planned: automatically suggesting the best start and end points by detecting visually similar frames, so the loop can be 
trimmed with less manual guesswork.

The backend is built with Kotlin and uses FFmpeg for video processing, The frontend is built with React.

## Spec-driven development

This repo uses [Spec Kit](https://github.com/github/spec-kit) with Claude Code (`/speckit-specify`, `/speckit-plan`, 
`/speckit-tasks`, etc.). The skills and scripts are already committed, so no extra setup is needed — except for one 
requirement:

> **!!Requires `jq`.** The Spec Kit scripts under `.specify/scripts/bash/` depend on it. Install it with `brew install jq` 
> (macOS) before using any `/speckit-*` command.