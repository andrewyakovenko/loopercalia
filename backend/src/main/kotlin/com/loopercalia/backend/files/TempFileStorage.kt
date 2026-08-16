package com.loopercalia.backend.files

import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeBytes

class TempFileStorage(
    private val rootDir: Path = Files.createTempDirectory("loopercalia-gif-editor"),
) {
    private fun videoDir(videoId: String): Path =
        rootDir.resolve("videos").resolve(videoId).also { it.createDirectories() }

    private fun gifDir(gifId: String): Path =
        rootDir.resolve("gifs").resolve(gifId).also { it.createDirectories() }

    fun saveVideo(videoId: String, originalFilename: String, bytes: ByteArray): Path {
        val extension = originalFilename.substringAfterLast('.', missingDelimiterValue = "mp4")
        val path = videoDir(videoId).resolve("source.$extension")
        path.writeBytes(bytes)
        return path
    }

    fun gifOutputPath(gifId: String): Path = gifDir(gifId).resolve("output.gif")
}
