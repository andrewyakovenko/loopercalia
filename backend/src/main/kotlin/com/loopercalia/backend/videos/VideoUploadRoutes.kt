package com.loopercalia.backend.videos

import com.loopercalia.backend.api.ErrorResponseDto
import com.loopercalia.backend.api.VideoDto
import com.loopercalia.backend.files.TempFileStorage
import com.loopercalia.backend.gif.FfmpegGifEncoder
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.application.call
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.utils.io.toByteArray
import java.time.Instant
import java.util.UUID
import kotlin.io.path.deleteIfExists

fun Route.videoUploadRoutes(
    videoStore: VideoStore,
    tempFileStorage: TempFileStorage,
    ffmpegGifEncoder: FfmpegGifEncoder,
) {
    post("/videos") {
        var fileBytes: ByteArray? = null
        var originalFilename = "video"

        val multipart = call.receiveMultipart()
        multipart.forEachPart { part ->
            if (part is PartData.FileItem && fileBytes == null) {
                originalFilename = part.originalFileName ?: originalFilename
                fileBytes = part.provider().toByteArray()
            }
            part.dispose()
        }

        val bytes = fileBytes
        if (bytes == null || bytes.isEmpty()) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponseDto("No video file was uploaded"))
            return@post
        }

        val videoId = UUID.randomUUID().toString()
        val storedPath = tempFileStorage.saveVideo(videoId, originalFilename, bytes)

        val durationSeconds = try {
            ffmpegGifEncoder.probeDurationSeconds(storedPath)
        } catch (e: FfmpegGifEncoder.FfmpegException) {
            storedPath.deleteIfExists()
            call.respond(HttpStatusCode.BadRequest, ErrorResponseDto("Uploaded file is not a valid video"))
            return@post
        }

        val video = videoStore.save(
            Video(
                id = videoId,
                originalFilename = originalFilename,
                filePath = storedPath,
                durationSeconds = durationSeconds,
                uploadedAt = Instant.now(),
            ),
        )

        call.respond(HttpStatusCode.Created, VideoDto(videoId = video.id, durationSeconds = video.durationSeconds))
    }
}
