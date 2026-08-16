package com.loopercalia.backend.files

import com.loopercalia.backend.api.ErrorResponseDto
import com.loopercalia.backend.gif.JobStore
import io.ktor.http.ContentDisposition
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import kotlin.io.path.readBytes

fun Route.fileDownloadRoutes(jobStore: JobStore) {
    get("/gifs/{gifId}") {
        val gifId = call.parameters["gifId"]!!
        val gif = jobStore.getGif(gifId)
        if (gif == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponseDto("Unknown gifId"))
            return@get
        }

        call.response.header(
            HttpHeaders.ContentDisposition,
            ContentDisposition.Attachment
                .withParameter(ContentDisposition.Parameters.FileName, "$gifId.gif")
                .toString(),
        )
        call.respondBytes(bytes = gif.filePath.readBytes(), contentType = ContentType.Image.GIF)
    }
}
