package com.loopercalia.backend.videos

import java.nio.file.Path
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

data class Video(
    val id: String,
    val originalFilename: String,
    val filePath: Path,
    val durationSeconds: Double,
    val uploadedAt: Instant,
)

class VideoStore {
    private val videos = ConcurrentHashMap<String, Video>()

    fun save(video: Video): Video {
        videos[video.id] = video
        return video
    }

    fun get(id: String): Video? = videos[id]
}
