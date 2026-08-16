import { useCallback, useEffect, useRef, useState } from 'react'
import { getJobStatus, startGifGeneration } from '../api/gifClient'
import type { JobStatusValue, SelectionRange } from '../api/types'

const POLL_INTERVAL_MS = 1000

interface GifGenerationState {
  jobStatus: JobStatusValue | 'idle'
  gifId: string | null
  errorMessage: string | null
}

export function useGifGenerationJob() {
  const [state, setState] = useState<GifGenerationState>({
    jobStatus: 'idle',
    gifId: null,
    errorMessage: null,
  })
  const pollTimeoutRef = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const poll = useCallback(
    (jobId: string) => {
      getJobStatus(jobId)
        .then((job) => {
          if (job.status === 'pending' || job.status === 'processing') {
            setState((prev) => ({ ...prev, jobStatus: job.status }))
            pollTimeoutRef.current = window.setTimeout(() => poll(jobId), POLL_INTERVAL_MS)
            return
          }

          if (job.status === 'succeeded') {
            setState({ jobStatus: 'succeeded', gifId: job.gifId ?? null, errorMessage: null })
            return
          }

          setState((prev) => ({
            jobStatus: 'failed',
            gifId: prev.gifId,
            errorMessage: job.errorMessage ?? 'GIF generation failed',
          }))
        })
        .catch((error: unknown) => {
          setState((prev) => ({
            jobStatus: 'failed',
            gifId: prev.gifId,
            errorMessage: error instanceof Error ? error.message : 'Failed to check job status',
          }))
        })
    },
    [],
  )

  const generate = useCallback(
    (videoId: string, selection: SelectionRange) => {
      stopPolling()
      setState((prev) => ({ jobStatus: 'pending', gifId: prev.gifId, errorMessage: null }))

      startGifGeneration(videoId, selection)
        .then(({ jobId }) => poll(jobId))
        .catch((error: unknown) => {
          setState((prev) => ({
            jobStatus: 'failed',
            gifId: prev.gifId,
            errorMessage: error instanceof Error ? error.message : 'Failed to start GIF generation',
          }))
        })
    },
    [poll, stopPolling],
  )

  const reset = useCallback(() => {
    stopPolling()
    setState({ jobStatus: 'idle', gifId: null, errorMessage: null })
  }, [stopPolling])

  const isGenerating = state.jobStatus === 'pending' || state.jobStatus === 'processing'

  return { ...state, isGenerating, generate, reset }
}
