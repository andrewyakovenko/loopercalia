package com.loopercalia.backend

import com.loopercalia.backend.files.TempFileStorage
import com.loopercalia.backend.files.fileDownloadRoutes
import com.loopercalia.backend.gif.FfmpegGifEncoder
import com.loopercalia.backend.gif.GifJobService
import com.loopercalia.backend.gif.JobStore
import com.loopercalia.backend.gif.gifJobRoutes
import com.loopercalia.backend.videos.VideoStore
import com.loopercalia.backend.videos.videoUploadRoutes
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable
import org.slf4j.event.Level

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    install(CallLogging) {
        level = Level.INFO
    }
    install(ContentNegotiation) {
        json()
    }
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Post)
    }

    val videoStore = VideoStore()
    val jobStore = JobStore()
    val tempFileStorage = TempFileStorage()
    val ffmpegGifEncoder = FfmpegGifEncoder()
    val gifJobService = GifJobService(videoStore, jobStore, tempFileStorage, ffmpegGifEncoder)

    routing {
        get("/health") {
            call.respond(HealthResponse(status = "ok"))
        }
        videoUploadRoutes(videoStore, tempFileStorage, ffmpegGifEncoder)
        gifJobRoutes(videoStore, jobStore, gifJobService)
        fileDownloadRoutes(jobStore)
    }
}

@Serializable
data class HealthResponse(val status: String)
