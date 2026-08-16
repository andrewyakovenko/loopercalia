package com.loopercalia.backend.api

import kotlinx.serialization.Serializable

@Serializable
data class VideoDto(
    val videoId: String,
    val durationSeconds: Double,
)

@Serializable
data class SelectionRangeDto(
    val startSeconds: Double,
    val endSeconds: Double,
)

@Serializable
data class JobAcceptedDto(
    val jobId: String,
    val status: String,
)

@Serializable
data class JobStatusDto(
    val jobId: String,
    val status: String,
    val gifId: String? = null,
    val errorMessage: String? = null,
)

@Serializable
data class ErrorResponseDto(
    val message: String,
)
