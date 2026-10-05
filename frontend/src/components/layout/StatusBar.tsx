import React from 'react'
import { GitBranch, Terminal, Sparkles, CheckCircle2 } from 'lucide-react'

type StatusBarProps = {
  isAgentWorking: boolean
  isDrawerOpen: boolean
  onToggleDrawer: () => void
  selectedFile: string
  lineCount?: number
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isAgentWorking,
  isDrawerOpen,
  onToggleDrawer,
  selectedFile,
}) => {
  return (
    <footer className="eeve-statusbar">
      <div className="status-left">
        <button className="status-item branch-btn" title="Git Branch">
          <GitBranch size={12} className="status-icon" />
          <span>main*</span>
        </button>

        <button
          className={`status-item drawer-btn ${isDrawerOpen ? 'drawer-active' : ''}`}
          onClick={onToggleDrawer}
          title="Toggle Terminal Drawer"
        >
          <Terminal size={12} className="status-icon" />
          <span>Terminal</span>
        </button>
      </div>

      <div className="status-right">
        {isAgentWorking ? (
          <div className="status-item ai-active">
            <Sparkles size={12} className="status-icon spin text-purple" />
            <span>Mivi is thinking…</span>
          </div>
        ) : (
          <div className="status-item ai-ready">
            <CheckCircle2 size={12} className="status-icon text-emerald" />
            <span>Mivi AI Ready</span>
          </div>
        )}

        {selectedFile && (
          <>
            <span className="status-item">Ln 1, Col 1</span>
            <span className="status-item">Spaces: 4</span>
            <span className="status-item">UTF-8</span>
          </>
        )}

        <div className="status-item env-pill" title="Python Virtual Environment">
          <span className="env-dot" />
          <span>Python 3.11 (.venv)</span>
        </div>
      </div>
    </footer>
  )
}
