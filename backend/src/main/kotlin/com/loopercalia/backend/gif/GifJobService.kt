package com.loopercalia.backend.gif

import com.loopercalia.backend.files.TempFileStorage
import com.loopercalia.backend.videos.VideoStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.nio.file.Files
import java.time.Instant
import java.util.UUID

class GifJobService(
    private val videoStore: VideoStore,
    private val jobStore: JobStore,
    private val tempFileStorage: TempFileStorage,
    private val ffmpegGifEncoder: FfmpegGifEncoder,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
) {
    fun startJob(videoId: String, selection: SelectionRange): GenerationJob {
        val job = jobStore.save(
            GenerationJob(
                id = UUID.randomUUID().toString(),
                videoId = videoId,
                selection = selection,
                status = JobStatus.PENDING,
                createdAt = Instant.now(),
            ),
        )

        scope.launch { runJob(job.id) }

        return job
    }

    private fun runJob(jobId: String) {
        jobStore.update(jobId) { it.copy(status = JobStatus.PROCESSING) }

        val job = jobStore.getJob(jobId) ?: return
        val video = videoStore.get(job.videoId)

        if (video == null) {
            jobStore.update(jobId) {
                it.copy(status = JobStatus.FAILED, errorMessage = "Video no longer available", completedAt = Instant.now())
            }
            return
        }

        try {
            val gifId = UUID.randomUUID().toString()
            val outputPath = tempFileStorage.gifOutputPath(gifId)
            ffmpegGifEncoder.encodeTrimmedGif(video.filePath, outputPath, job.selection.startSeconds, job.selection.endSeconds)
            jobStore.saveGif(
                GeneratedGif(id = gifId, jobId = jobId, filePath = outputPath, sizeBytes = Files.size(outputPath)),
            )
            jobStore.update(jobId) {
                it.copy(status = JobStatus.SUCCEEDED, gifId = gifId, completedAt = Instant.now())
            }
        } catch (e: FfmpegGifEncoder.FfmpegException) {
            jobStore.update(jobId) {
                it.copy(status = JobStatus.FAILED, errorMessage = e.message ?: "GIF generation failed", completedAt = Instant.now())
            }
        }
    }
}
