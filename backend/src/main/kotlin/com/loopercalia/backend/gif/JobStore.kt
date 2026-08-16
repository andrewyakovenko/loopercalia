package com.loopercalia.backend.gif

import java.nio.file.Path
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

enum class JobStatus {
    PENDING,
    PROCESSING,
    SUCCEEDED,
    FAILED,
}

data class SelectionRange(
    val startSeconds: Double,
    val endSeconds: Double,
)

data class GenerationJob(
    val id: String,
    val videoId: String,
    val selection: SelectionRange,
    val status: JobStatus,
    val gifId: String? = null,
    val errorMessage: String? = null,
    val createdAt: Instant,
    val completedAt: Instant? = null,
)

data class GeneratedGif(
    val id: String,
    val jobId: String,
    val filePath: Path,
    val sizeBytes: Long,
)

class JobStore {
    private val jobs = ConcurrentHashMap<String, GenerationJob>()
    private val gifs = ConcurrentHashMap<String, GeneratedGif>()

    fun save(job: GenerationJob): GenerationJob {
        jobs[job.id] = job
        return job
    }

    fun getJob(id: String): GenerationJob? = jobs[id]

    /** Atomically replaces the stored job with the result of [transform], if it is still present. */
    fun update(id: String, transform: (GenerationJob) -> GenerationJob) {
        jobs.computeIfPresent(id) { _, job -> transform(job) }
    }

    fun saveGif(gif: GeneratedGif): GeneratedGif {
        gifs[gif.id] = gif
        return gif
    }

    fun getGif(id: String): GeneratedGif? = gifs[id]
}
