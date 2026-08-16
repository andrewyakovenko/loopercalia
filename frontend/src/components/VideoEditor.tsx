import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { uploadVideo } from '../api/gifClient'
import type { SelectionRange, Video } from '../api/types'
import { MediaFrame } from './MediaFrame'
import { VideoFilmstrip } from './VideoFilmstrip'

const END_EPSILON = 0.05

interface VideoEditorProps {
  hasVideo: boolean
  objectUrl: string | null
  durationSeconds: number | null
  selection: SelectionRange | null
  onVideoLoaded: (video: Video, objectUrl: string) => void
  onSelectionChange: (selection: SelectionRange) => void
  actions?: ReactNode
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

export function VideoEditor({
  hasVideo,
  objectUrl,
  durationSeconds,
  selection,
  onVideoLoaded,
  onSelectionChange,
  actions,
}: VideoEditorProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const selectionRef = useRef<SelectionRange | null>(selection)

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    const video: HTMLVideoElement = videoEl

    function handleTimeUpdate() {
      const sel = selectionRef.current
      if (!sel) return
      if (video.currentTime > sel.endSeconds) {
        video.currentTime = sel.endSeconds
        video.pause()
      } else if (video.currentTime < sel.startSeconds) {
        video.currentTime = sel.startSeconds
      }
      setCurrentTime(video.currentTime)
    }

    function handlePlay() {
      setIsPlaying(true)
    }

    function handlePause() {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [objectUrl])

  const handlePlaybackToggle = useCallback(() => {
    const video = videoRef.current
    const sel = selectionRef.current
    if (!video || !sel) return

    if (video.paused) {
      if (video.currentTime >= sel.endSeconds - END_EPSILON) {
        video.currentTime = sel.startSeconds
      }
      void video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleScrub = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
    }
  }, [])

  const handleFilmstripSelectionChange = useCallback(
    (nextSelection: SelectionRange, movedHandle: 'start' | 'end') => {
      onSelectionChange(nextSelection)
      if (videoRef.current) {
        videoRef.current.currentTime = movedHandle === 'start' ? nextSelection.startSeconds : nextSelection.endSeconds
      }
    },
    [onSelectionChange],
  )

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const video = await uploadVideo(file)
      onVideoLoaded(video, URL.createObjectURL(file))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload video')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="video-editor">
      <MediaFrame placeholderLabel="No video loaded yet">
        {hasVideo && objectUrl ? (
          <>
            <video ref={videoRef} className="video-editor-preview" src={objectUrl} playsInline />
            <button
              type="button"
              className="video-editor-playback-btn"
              onClick={handlePlaybackToggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          </>
        ) : undefined}
      </MediaFrame>

      {hasVideo && objectUrl && durationSeconds != null && selection && (
        <VideoFilmstrip
          objectUrl={objectUrl}
          durationSeconds={durationSeconds}
          selection={selection}
          onSelectionChange={handleFilmstripSelectionChange}
          currentTime={currentTime}
          onScrub={handleScrub}
        />
      )}

      <div className="video-editor-controls">
        <label className={`btn video-editor-upload${isUploading ? ' btn-disabled' : ''}`}>
          {isUploading ? 'Uploading…' : hasVideo ? 'Choose a different video' : 'Upload a video'}
          <input type="file" accept="video/*" onChange={handleFileSelected} disabled={isUploading} />
        </label>
        {actions}
      </div>

      {errorMessage && (
        <p className="video-editor-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
