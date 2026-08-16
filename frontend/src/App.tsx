import { useCallback, useState } from 'react'
import './App.css'
import type { SelectionRange, Video } from './api/types'
import { GifPreviewPanel } from './components/GifPreviewPanel'
import { VideoEditor } from './components/VideoEditor'
import { useGifGenerationJob } from './hooks/useGifGenerationJob'

interface LoadedVideo {
  id: string
  durationSeconds: number
  objectUrl: string
}

function App() {
  const [video, setVideo] = useState<LoadedVideo | null>(null)
  const [selection, setSelection] = useState<SelectionRange | null>(null)
  const gifJob = useGifGenerationJob()

  const handleVideoLoaded = useCallback(
    (uploaded: Video, objectUrl: string) => {
      setVideo((prev) => {
        if (prev) URL.revokeObjectURL(prev.objectUrl)
        return { id: uploaded.videoId, durationSeconds: uploaded.durationSeconds, objectUrl }
      })
      setSelection({ startSeconds: 0, endSeconds: uploaded.durationSeconds })
      gifJob.reset()
    },
    [gifJob],
  )

  const handleGenerate = useCallback(() => {
    if (!video || !selection) return
    gifJob.generate(video.id, selection)
  }, [gifJob, video, selection])

  return (
    <main className="app-layout">
      <h1>loopercalia</h1>
      <p className="tagline">smart gif loop generator</p>
      <div className="editor-preview-row">
        <section className="editor-pane">
          <h2>Editor</h2>
          <VideoEditor
            hasVideo={!!video}
            objectUrl={video?.objectUrl ?? null}
            durationSeconds={video?.durationSeconds ?? null}
            selection={selection}
            onVideoLoaded={handleVideoLoaded}
            onSelectionChange={setSelection}
            actions={
              <button
                type="button"
                className="btn generate-button"
                onClick={handleGenerate}
                disabled={!video || !selection || gifJob.isGenerating}
              >
                Generate gif
              </button>
            }
          />
        </section>
        <section className="preview-pane">
          <h2>Preview</h2>
          <GifPreviewPanel
            isGenerating={gifJob.isGenerating}
            jobStatus={gifJob.jobStatus}
            gifId={gifJob.gifId}
            errorMessage={gifJob.errorMessage}
          />
        </section>
      </div>
    </main>
  )
}

export default App
