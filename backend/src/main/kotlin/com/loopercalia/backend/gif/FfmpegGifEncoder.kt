package com.loopercalia.backend.gif

import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit
import kotlin.io.path.deleteIfExists

class FfmpegGifEncoder {

    class FfmpegException(message: String) : Exception(message)

    /** Probes a video's duration in seconds via `ffprobe`; used both to validate uploads and to size the trim range control. */
    fun probeDurationSeconds(videoPath: Path): Double {
        val process = ProcessBuilder(
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            videoPath.toString(),
        ).redirectErrorStream(false).start()

        val output = process.inputStream.bufferedReader().readText().trim()
        val errorOutput = process.errorStream.bufferedReader().readText().trim()
        val finished = process.waitFor(30, TimeUnit.SECONDS)
        if (!finished) {
            process.destroyForcibly()
            throw FfmpegException("ffprobe timed out")
        }
        val duration = output.toDoubleOrNull()
        if (process.exitValue() != 0 || duration == null) {
            throw FfmpegException(errorOutput.ifBlank { "not a valid video file" })
        }
        return duration
    }

    /** Two-pass palettegen/paletteuse encode of the [startSeconds, endSeconds) range, per research.md §2. */
    fun encodeTrimmedGif(sourcePath: Path, outputPath: Path, startSeconds: Double, endSeconds: Double) {
        val paletteFile = Files.createTempFile("loopercalia-palette", ".png")
        try {
            runFfmpeg(
                "-ss", startSeconds.toString(), "-to", endSeconds.toString(),
                "-i", sourcePath.toString(),
                "-vf", "fps=15,scale=480:-1:flags=lanczos,palettegen",
                "-y", paletteFile.toString(),
            )
            runFfmpeg(
                "-ss", startSeconds.toString(), "-to", endSeconds.toString(),
                "-i", sourcePath.toString(),
                "-i", paletteFile.toString(),
                "-lavfi", "fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse",
                "-y", outputPath.toString(),
            )
        } finally {
            paletteFile.deleteIfExists()
        }
    }

    private fun runFfmpeg(vararg args: String) {
        val process = ProcessBuilder(listOf("ffmpeg") + args).redirectErrorStream(true).start()
        val output = process.inputStream.bufferedReader().readText()
        val finished = process.waitFor(180, TimeUnit.SECONDS)
        if (!finished) {
            process.destroyForcibly()
            throw FfmpegException("ffmpeg timed out")
        }
        if (process.exitValue() != 0) {
            throw FfmpegException(output.ifBlank { "ffmpeg failed with exit code ${process.exitValue()}" })
        }
    }
}
