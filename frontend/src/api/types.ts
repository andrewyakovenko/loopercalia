export interface Video {
  videoId: string
  durationSeconds: number
}

export interface SelectionRange {
  startSeconds: number
  endSeconds: number
}

export type JobStatusValue = 'pending' | 'processing' | 'succeeded' | 'failed'

export interface JobStatus {
  jobId: string
  status: JobStatusValue
  gifId?: string | null
  errorMessage?: string | null
}

export interface ErrorResponse {
  message: string
}
