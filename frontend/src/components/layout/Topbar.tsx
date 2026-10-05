import React from 'react'
import { Sparkles, RefreshCw, Folder, Search, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ConnectionState } from '../../types'

type TopbarProps = {
  connection: ConnectionState
  workspaceName: string
  onRetryConnection: () => void
  onOpenWorkspaceClick: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  connection,
  workspaceName,
  onRetryConnection,
  onOpenWorkspaceClick,
}) => {
  return (
    <header className="eeve-topbar">
      {/* Brand */}
      <div className="topbar-left">
        <div className="eeve-brand" aria-label="EeVe Studio">
          <div className="brand-logo">
            <Sparkles size={15} className="brand-icon" />
          </div>
          <span className="brand-title">EeVe</span>
          <span className="brand-badge">AI STUDIO</span>
        </div>

        {/* Current Workspace Pill */}
        <button
          className="workspace-pill"
          onClick={onOpenWorkspaceClick}
          title="Click to open or switch project folder"
        >
          <Folder size={14} className="pill-icon" />
          <span className="pill-text">{workspaceName || 'Open Folder…'}</span>
        </button>
      </div>

      {/* Center Command Search Trigger */}
      <div className="topbar-center">
        <div className="command-bar" onClick={onOpenWorkspaceClick} title="Quick open (Ctrl+P)">
          <Search size={13} className="search-icon" />
          <span className="search-placeholder">
            {workspaceName ? `Search in ${workspaceName}…` : 'Open a workspace folder to start…'}
          </span>
          <kbd className="search-kbd">Ctrl+P</kbd>
        </div>
      </div>

      {/* Right Controls: Backend connection + Window controls */}
      <div className="topbar-right">
        <div className={`connection-badge connection--${connection}`}>
          {connection === 'connected' && <CheckCircle2 size={13} className="conn-icon text-emerald" />}
          {connection === 'offline' && <AlertCircle size={13} className="conn-icon text-rose" />}
          {connection === 'checking' && <RefreshCw size={13} className="conn-icon spin text-amber" />}
          <span className="conn-label">
            {connection === 'connected' ? 'Backend Live' : connection === 'offline' ? 'Offline' : 'Connecting…'}
          </span>
          {connection === 'offline' && (
            <button className="retry-btn" onClick={onRetryConnection} title="Retry connection">
              <RefreshCw size={11} />
            </button>
          )}
        </div>

        {/* Window controls */}
        <div className="window-dots" aria-hidden="true">
          <span className="win-dot dot-minimize" />
          <span className="win-dot dot-maximize" />
          <span className="win-dot dot-close" />
        </div>
      </div>
    </header>
  )
}
