import React from 'react'
import { X, Play, Save, FileCode2, FileJson, FileText, File, Loader2 } from 'lucide-react'
import type { OpenTab } from '../../types'

type TabBarProps = {
  tabs: OpenTab[]
  activePath: string
  onSelectTab: (path: string) => void
  onCloseTab: (path: string) => void
  onSave: () => void
  onRun: () => void
  isDirty: boolean
  isWorking: boolean
  isRunning: boolean
  canRun: boolean
}

function getTabIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'py') return <FileCode2 size={13} className="text-python" />
  if (ext === 'json') return <FileJson size={13} className="text-amber" />
  if (ext === 'md' || ext === 'txt') return <FileText size={13} className="text-sky" />
  return <File size={13} className="text-muted" />
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activePath,
  onSelectTab,
  onCloseTab,
  onSave,
  onRun,
  isDirty,
  isWorking,
  isRunning,
  canRun,
}) => {
  return (
    <div className="tab-bar-container">
      <div className="tab-strip">
        {tabs.map((tab) => {
          const isActive = tab.path === activePath
          const tabIsDirty = tab.content !== tab.savedContent

          return (
            <div
              key={tab.path}
              className={`editor-tab ${isActive ? 'active-tab' : ''}`}
              onClick={() => onSelectTab(tab.path)}
              title={tab.path}
            >
              <span className="tab-icon">{getTabIcon(tab.name)}</span>
              <span className="tab-name">{tab.name}</span>

              {tabIsDirty && <span className="tab-dirty-dot" title="Unsaved changes" />}

              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.path)
                }}
                title="Close (Ctrl+W)"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="tab-actions">
        {activePath && (
          <button
            className={`action-btn save-btn ${isDirty ? 'save-btn-dirty' : ''}`}
            onClick={onSave}
            disabled={!isDirty || isWorking}
            title="Save file (Ctrl+S)"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        )}

        {canRun && (
          <button
            className="action-btn run-btn"
            onClick={onRun}
            disabled={isRunning}
            title="Run Python file (Ctrl+Shift+R)"
          >
            {isRunning ? (
              <>
                <Loader2 size={13} className="spin" />
                <span>Running…</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Run</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
