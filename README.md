# loopercalia
smart gif loop generator

The user uploads a video and gets an editor where they can pick the start and end points. A live preview shows how the resulting GIF will look, and a download button exports it.

Planned: automatically suggesting the best start and end points by detecting visually similar frames, so the loop can be trimmed with less manual guesswork.

The backend is built with Kotlin and uses FFmpeg for video processing, The frontend is built with React.