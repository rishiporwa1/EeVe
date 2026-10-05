import React from 'react'
import {
  Terminal,
  TestTube2,
  ListFilter,
  Play,
  Sparkles,
  ChevronDown,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { RunResult, ActiveDrawerTab } from '../../types'

type TerminalDrawerProps = {
  isOpen: boolean
  onClose: () => void
  activeTab: ActiveDrawerTab
  onSelectTab: (tab: ActiveDrawerTab) => void
  runResult: RunResult | null
  isRunning: boolean
  onRunPytest: () => void
  onExplainError: () => void
  onClear: () => void
  hasError: boolean
  workspaceName: string
  statusMessage: string
  isMaximized: boolean
  onToggleMaximize: () => void
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  runResult,
  isRunning,
  onRunPytest,
  onExplainError,
  onClear,
  hasError,
  workspaceName,
  statusMessage,
  isMaximized,
  onToggleMaximize,
}) => {
  if (!isOpen) return null

  // Analyze pytest output if command was pytest
  const isPytest = runResult?.command_display.includes('pytest')
  const passedMatch = runResult?.stdout.match(/(\d+)\s+passed/)
  const failedMatch = runResult?.stdout.match(/(\d+)\s+failed/)
  const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0
  const failedCount = failedMatch ? parseInt(failedMatch[1], 10) : 0

  return (
    <section className={`terminal-drawer ${isMaximized ? 'drawer-maximized' : ''}`}>
      {/* Drawer Header */}
      <div className="drawer-header">
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeTab === 'terminal' ? 'drawer-tab-active' : ''}`}
            onClick={() => onSelectTab('terminal')}
          >
            <Terminal size={13} />
            <span>Terminal</span>
          </button>

          <button
            className={`drawer-tab ${activeTab === 'pytest' ? 'drawer-tab-active' : ''}`}
            onClick={() => onSelectTab('pytest')}
          >
            <TestTube2 size={13} />
            <span>Test Runner</span>
            {isPytest && runResult && (
              <span className={`mini-badge ${failedCount > 0 ? 'badge-fail' : 'badge-pass'}`}>
                {passedCount}P {failedCount > 0 ? `${failedCount}F` : ''}
              </span>
            )}
          </button>

          <button
            className={`drawer-tab ${activeTab === 'logs' ? 'drawer-tab-active' : ''}`}
            onClick={() => onSelectTab('logs')}
          >
            <ListFilter size={13} />
            <span>Status</span>
          </button>
        </div>

        {/* Header Actions */}
        <div className="drawer-actions">
          {workspaceName && (
            <button
              className="drawer-action-btn run-pytest-btn"
              onClick={onRunPytest}
              disabled={isRunning}
              title="Run pytest in workspace"
            >
              <Play size={11} fill="currentColor" />
              <span>{isRunning ? 'Running…' : 'Run Tests'}</span>
            </button>
          )}

          {hasError && (
            <button
              className="drawer-action-btn explain-error-btn"
              onClick={onExplainError}
              title="Ask Mivi to analyze this error and propose a fix"
            >
              <Sparkles size={11} className="text-amber" />
              <span>Explain Error</span>
            </button>
          )}

          <button
            className="drawer-icon-btn"
            onClick={onClear}
            title="Clear Output"
          >
            <Trash2 size={13} />
          </button>

          <button
            className="drawer-icon-btn"
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore Drawer Height' : 'Maximize Drawer'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            className="drawer-icon-btn"
            onClick={onClose}
            title="Close Drawer (Ctrl+`)"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="drawer-content">
        {isRunning && (
          <div className="drawer-running-indicator">
            <Loader2 size={14} className="spin text-purple" />
            <span>Executing command in environment…</span>
          </div>
        )}

        {/* Tab 1: Terminal stdout/stderr */}
        {activeTab === 'terminal' && (
          <div className="terminal-view">
            {runResult ? (
              <div className="terminal-log-output">
                <div className="command-banner">
                  <span className="cmd-prompt">$</span>
                  <span className="cmd-text">{runResult.command_display}</span>
                  <span
                    className={`exit-badge ${runResult.exit_code === 0 ? 'exit-ok' : 'exit-fail'}`}
                  >
                    {runResult.timed_out
                      ? 'TIMED OUT'
                      : runResult.exit_code === 0
                      ? '0 (SUCCESS)'
                      : `EXIT ${runResult.exit_code}`}
                  </span>
                </div>

                {runResult.stdout && (
                  <pre className="stdout-block">{runResult.stdout}</pre>
                )}
                {runResult.stderr && (
                  <pre className="stderr-block">{runResult.stderr}</pre>
                )}
              </div>
            ) : (
              <div className="terminal-placeholder">
                <p className="terminal-muted-text">
                  {statusMessage || 'Terminal ready. Run a Python script or execute tests.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Test Runner Visual Suite */}
        {activeTab === 'pytest' && (
          <div className="pytest-view">
            {isPytest && runResult ? (
              <div className="test-dashboard">
                <div className="test-summary-card">
                  <div className="summary-status">
                    {runResult.exit_code === 0 ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald" />
                        <span className="summary-text-pass">All Tests Passed</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="text-rose" />
                        <span className="summary-text-fail">Test Failures Encountered</span>
                      </>
                    )}
                  </div>
                  <div className="summary-counts">
                    <span className="count-pill pass-pill">{passedCount} Passed</span>
                    {failedCount > 0 && (
                      <span className="count-pill fail-pill">{failedCount} Failed</span>
                    )}
                  </div>
                </div>

                <div className="test-raw-output">
                  <pre className="stdout-block">{runResult.stdout || runResult.stderr}</pre>
                </div>
              </div>
            ) : (
              <div className="pytest-placeholder">
                <TestTube2 size={24} className="text-muted mb-2" />
                <p>Run tests with Pytest to view test cases and assertion results.</p>
                <button
                  className="primary-action-btn"
                  onClick={onRunPytest}
                  disabled={isRunning || !workspaceName}
                >
                  <Play size={12} fill="currentColor" />
                  <span>Run Pytest Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Status / Logs */}
        {activeTab === 'logs' && (
          <div className="logs-view">
            <div className="log-entry">
              <span className="log-time">{new Date().toLocaleTimeString()}</span>
              <span className="log-msg">{statusMessage}</span>
            </div>
            {hasError && (
              <div className="log-entry log-error">
                <AlertTriangle size={12} className="text-rose" />
                <span className="log-msg">
                  Command failed with exit code {runResult?.exit_code}.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
