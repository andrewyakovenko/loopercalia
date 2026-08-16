import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { SelectionRange } from '../api/types'

const THUMBNAIL_COUNT = 24
const MIN_RANGE_SECONDS = 1
const PLAYHEAD_EPSILON = 0.05

type Handle = 'start' | 'end'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    function onSeeked() {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

interface VideoFilmstripProps {
  objectUrl: string
  durationSeconds: number
  selection: SelectionRange
  onSelectionChange: (selection: SelectionRange, movedHandle: Handle) => void
  currentTime: number
  onScrub: (seconds: number) => void
}

export function VideoFilmstrip({
  objectUrl,
  durationSeconds,
  selection,
  onSelectionChange,
  currentTime,
  onScrub,
}: VideoFilmstripProps) {
  const [thumbnails, setThumbnails] = useState<(string | null)[]>(() => Array(THUMBNAIL_COUNT).fill(null))
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setThumbnails(Array(THUMBNAIL_COUNT).fill(null))

    const videoEl = hiddenVideoRef.current
    if (!videoEl || durationSeconds <= 0) return
    const video: HTMLVideoElement = videoEl

    let cancelled = false

    async function generate() {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          function onLoaded() {
            video.removeEventListener('loadedmetadata', onLoaded)
            resolve()
          }
          video.addEventListener('loadedmetadata', onLoaded)
        })
      }
      if (cancelled) return

      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      for (let i = 0; i < THUMBNAIL_COUNT; i++) {
        if (cancelled) return
        const t = ((i + 0.5) * durationSeconds) / THUMBNAIL_COUNT
        await seekTo(video, t)
        if (cancelled) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        if (cancelled) return
        setThumbnails((prev) => {
          const next = [...prev]
          next[i] = dataUrl
          return next
        })
      }
    }

    generate()

    return () => {
      cancelled = true
    }
  }, [objectUrl, durationSeconds])

  const secondsFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current
      if (!track || durationSeconds <= 0) return 0
      const rect = track.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return ratio * durationSeconds
    },
    [durationSeconds],
  )

  const handlePointerDown = useCallback(
    (handle: Handle) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const startSeconds = selection.startSeconds
      const endSeconds = selection.endSeconds

      function handleMove(moveEvent: PointerEvent) {
        const seconds = secondsFromClientX(moveEvent.clientX)
        if (handle === 'start') {
          const maxStart = Math.max(0, endSeconds - MIN_RANGE_SECONDS)
          onSelectionChange({ startSeconds: clamp(seconds, 0, maxStart), endSeconds }, 'start')
        } else {
          const minEnd = Math.min(durationSeconds, startSeconds + MIN_RANGE_SECONDS)
          onSelectionChange({ startSeconds, endSeconds: clamp(seconds, minEnd, durationSeconds) }, 'end')
        }
      }

      function handleUp() {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [durationSeconds, onSelectionChange, secondsFromClientX, selection.endSeconds, selection.startSeconds],
  )

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const seconds = secondsFromClientX(event.clientX)
      onScrub(clamp(seconds, selection.startSeconds, selection.endSeconds))
    },
    [onScrub, secondsFromClientX, selection.endSeconds, selection.startSeconds],
  )

  const startPercent = durationSeconds > 0 ? (selection.startSeconds / durationSeconds) * 100 : 0
  const endPercent = durationSeconds > 0 ? (selection.endSeconds / durationSeconds) * 100 : 100
  const playheadPercent = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0
  const playheadVisible =
    currentTime >= selection.startSeconds - PLAYHEAD_EPSILON && currentTime <= selection.endSeconds + PLAYHEAD_EPSILON

  return (
    <div className="video-filmstrip">
      <video ref={hiddenVideoRef} src={objectUrl} muted playsInline preload="auto" className="filmstrip-hidden-video" />
      <div className="filmstrip-track" ref={trackRef} onPointerDown={handleTrackPointerDown}>
        {thumbnails.map((thumb, index) => (
          <div
            key={index}
            className="filmstrip-thumb"
            style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
          />
        ))}
        <div className="filmstrip-dim-left" style={{ width: `${startPercent}%` }} />
        <div className="filmstrip-dim-right" style={{ left: `${endPercent}%`, width: `${100 - endPercent}%` }} />
        {playheadVisible && <div className="filmstrip-playhead" style={{ left: `${playheadPercent}%` }} />}
        <div
          className="filmstrip-handle filmstrip-handle-start"
          style={{ left: `${startPercent}%` }}
          onPointerDown={handlePointerDown('start')}
          role="slider"
          aria-label="Start point"
          aria-valuemin={0}
          aria-valuemax={durationSeconds}
          aria-valuenow={selection.startSeconds}
        />
        <div
          className="filmstrip-handle filmstrip-handle-end"
          style={{ left: `${endPercent}%` }}
          onPointerDown={handlePointerDown('end')}
          role="slider"
          aria-label="End point"
          aria-valuemin={0}
          aria-valuemax={durationSeconds}
          aria-valuenow={selection.endSeconds}
        />
      </div>
      <div className="filmstrip-labels">
        <span>{selection.startSeconds.toFixed(1)}s</span>
        <span>{selection.endSeconds.toFixed(1)}s</span>
      </div>
    </div>
  )
}
