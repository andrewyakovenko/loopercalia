import type { ErrorResponse, JobStatus, SelectionRange, Video } from './types'

const API_BASE = '/api'

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse
    return body.message || fallback
  } catch {
    return fallback
  }
}

export async function uploadVideo(file: File): Promise<Video> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/videos`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to upload video'))
  }

  return (await response.json()) as Video
}

export async function startGifGeneration(videoId: string, selection: SelectionRange): Promise<{ jobId: string }> {
  const response = await fetch(`${API_BASE}/videos/${videoId}/gif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to start GIF generation'))
  }

  return (await response.json()) as { jobId: string }
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`)

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to fetch job status'))
  }

  return (await response.json()) as JobStatus
}

export function gifUrl(gifId: string): string {
  return `${API_BASE}/gifs/${gifId}`
}
