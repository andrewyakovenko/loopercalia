package com.loopercalia.backend.gif

import com.loopercalia.backend.api.ErrorResponseDto
import com.loopercalia.backend.api.JobAcceptedDto
import com.loopercalia.backend.api.JobStatusDto
import com.loopercalia.backend.api.SelectionRangeDto
import com.loopercalia.backend.videos.VideoStore
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post

private const val MIN_RANGE_SECONDS = 1.0

fun Route.gifJobRoutes(
    videoStore: VideoStore,
    jobStore: JobStore,
    gifJobService: GifJobService,
) {
    post("/videos/{videoId}/gif") {
        val videoId = call.parameters["videoId"]!!
        if (videoStore.get(videoId) == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponseDto("Unknown videoId"))
            return@post
        }

        val selectionDto = call.receive<SelectionRangeDto>()
        val isValidRange = selectionDto.startSeconds >= 0 &&
            selectionDto.startSeconds < selectionDto.endSeconds &&
            (selectionDto.endSeconds - selectionDto.startSeconds) >= MIN_RANGE_SECONDS

        if (!isValidRange) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponseDto("Invalid selection range"))
            return@post
        }

        val job = gifJobService.startJob(videoId, SelectionRange(selectionDto.startSeconds, selectionDto.endSeconds))
        call.respond(HttpStatusCode.Accepted, JobAcceptedDto(jobId = job.id, status = "pending"))
    }

    get("/jobs/{jobId}") {
        val jobId = call.parameters["jobId"]!!
        val job = jobStore.getJob(jobId)
        if (job == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponseDto("Unknown jobId"))
            return@get
        }

        call.respond(
            HttpStatusCode.OK,
            JobStatusDto(
                jobId = job.id,
                status = job.status.name.lowercase(),
                gifId = job.gifId,
                errorMessage = job.errorMessage,
            ),
        )
    }
}
