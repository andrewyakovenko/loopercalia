import { gifUrl } from '../api/gifClient'
import type { JobStatusValue } from '../api/types'
import { MediaFrame } from './MediaFrame'

interface GifPreviewPanelProps {
  isGenerating: boolean
  jobStatus: JobStatusValue | 'idle'
  gifId: string | null
  errorMessage: string | null
}

export function GifPreviewPanel({ isGenerating, jobStatus, gifId, errorMessage }: GifPreviewPanelProps) {
  return (
    <div className="gif-preview-panel">
      <MediaFrame placeholderLabel="No GIF generated yet">
        {gifId ? <img className="gif-preview-image" src={gifUrl(gifId)} alt="Generated GIF preview" /> : undefined}
      </MediaFrame>

      <div className="gif-preview-actions">
        <a
          className={`btn${gifId ? '' : ' btn-disabled'}`}
          href={gifId ? gifUrl(gifId) : undefined}
          download={gifId ? `${gifId}.gif` : undefined}
          aria-disabled={!gifId}
          onClick={(event) => {
            if (!gifId) event.preventDefault()
          }}
        >
          Download gif
        </a>
      </div>

      {isGenerating && <p className="gif-preview-status">Generating GIF… ({jobStatus})</p>}
      {errorMessage && (
        <p className="gif-preview-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
