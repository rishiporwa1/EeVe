import React, { useState } from 'react'
import { Folder, X, ArrowRight, Clock, FolderSearch, Loader2, HardDrive } from 'lucide-react'

type WorkspaceModalProps = {
  isOpen: boolean
  onClose: () => void
  onOpenWorkspace: (path: string) => void
  onBrowseFromPC?: () => Promise<string | void> | void
  currentPath: string
  isWorking: boolean
  isBrowsing?: boolean
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onOpenWorkspace,
  onBrowseFromPC,
  currentPath,
  isWorking,
  isBrowsing = false,
}) => {
  const [pathInput, setPathInput] = useState(currentPath)
  const [prevCurrentPath, setPrevCurrentPath] = useState(currentPath)

  if (prevCurrentPath !== currentPath) {
    setPrevCurrentPath(currentPath)
    setPathInput(currentPath)
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pathInput.trim()) {
      onOpenWorkspace(pathInput.trim())
    }
  }

  const handleBrowseClick = async () => {
    if (onBrowseFromPC) {
      const selected = await onBrowseFromPC()
      if (selected && typeof selected === 'string') {
        setPathInput(selected)
      }
    }
  }

  // Pre-configured popular or recent local project paths as quick pills
  const samplePaths = [
    'c:\\Users\\HELLO H P\\Desktop\\EeVe',
    'c:\\Projects\\my-python-app',
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog workspace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Folder size={18} className="text-purple" />
            <h3 className="modal-title">Open Local Project</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Prominent Native Folder Browser Button */}
          {onBrowseFromPC && (
            <button
              type="button"
              className="browse-pc-btn"
              onClick={handleBrowseClick}
              disabled={isBrowsing || isWorking}
              title="Select folder using Windows Explorer dialog"
            >
              <div className="browse-pc-icon-wrap">
                {isBrowsing ? (
                  <Loader2 size={20} className="spin text-purple" />
                ) : (
                  <FolderSearch size={20} className="text-purple" />
                )}
              </div>
              <div className="browse-pc-text">
                <span className="browse-pc-title">
                  {isBrowsing ? 'Waiting for folder selection…' : 'Select Folder from this PC'}
                </span>
                <span className="browse-pc-desc">
                  Open native Windows folder browser dialog
                </span>
              </div>
              <HardDrive size={16} className="browse-pc-right-icon" />
            </button>
          )}

          <div className="modal-divider">
            <span>or enter path manually</span>
          </div>

          <form onSubmit={handleSubmit} className="manual-path-form">
            <label className="input-label" htmlFor="workspace-input">
              Absolute path to project directory
            </label>
            <div className="input-group">
              <input
                id="workspace-input"
                className="text-input"
                type="text"
                autoFocus
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="e.g. C:\Users\Username\Projects\my-app"
              />
              {onBrowseFromPC && (
                <button
                  type="button"
                  className="browse-inline-btn"
                  onClick={handleBrowseClick}
                  disabled={isBrowsing || isWorking}
                  title="Browse PC"
                >
                  <FolderSearch size={14} />
                  <span>Browse…</span>
                </button>
              )}
              <button
                type="submit"
                className="submit-btn"
                disabled={!pathInput.trim() || isWorking || isBrowsing}
              >
                {isWorking ? (
                  'Opening…'
                ) : (
                  <>
                    <span>Open</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="recent-paths-section">
            <div className="section-label">
              <Clock size={12} className="text-muted" />
              <span>Suggested / Recent Locations</span>
            </div>
            <div className="path-chips">
              {samplePaths.map((path) => (
                <button
                  key={path}
                  type="button"
                  className="path-chip"
                  onClick={() => {
                    setPathInput(path)
                    onOpenWorkspace(path)
                  }}
                >
                  <Folder size={12} className="text-muted" />
                  <span>{path}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
