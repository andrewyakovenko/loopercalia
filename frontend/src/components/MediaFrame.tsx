import type { ReactNode } from 'react'

interface MediaFrameProps {
  children?: ReactNode
  placeholderLabel: string
}

export function MediaFrame({ children, placeholderLabel }: MediaFrameProps) {
  return (
    <div className="media-frame">
      {children ?? (
        <div className="media-frame-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="2" y="5" width="14" height="14" rx="2" />
            <path d="M16 9l6-3v12l-6-3" />
          </svg>
          <span>{placeholderLabel}</span>
        </div>
      )}
    </div>
  )
}
