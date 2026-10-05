import { useEffect, useState, useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Topbar } from './components/layout/Topbar'
import { ActivityBar } from './components/layout/ActivityBar'
import { StatusBar } from './components/layout/StatusBar'
import { FileTree } from './components/explorer/FileTree'
import { WorkspaceModal } from './components/explorer/WorkspaceModal'
import { TabBar } from './components/editor/TabBar'
import { Breadcrumbs } from './components/editor/Breadcrumbs'
import { AgentTimeline } from './components/assistant/AgentTimeline'
import { PromptDeck } from './components/assistant/PromptDeck'
import { PatchCard } from './components/assistant/PatchCard'
import { TerminalDrawer } from './components/drawer/TerminalDrawer'
import { Sparkles, Bot, AlertCircle, Code2 } from 'lucide-react'
import type {
  ConnectionState,
  FileItem,
  AgentEvent,
  AgentResult,
  PatchStatus,
  PatchWithStatus,
  RunResult,
  OpenTab,
  ActiveDrawerTab,
  ActiveSidebarTab,
} from './types'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (window.location.port === '5173' ? 'http://127.0.0.1:8000' : '')

async function getErrorMessage(response: Response) {
  const data: { detail?: string } = await response.json().catch(() => ({}))
  return data.detail ?? 'Something went wrong. Please try again.'
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-dialog confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Confirm Action</h3>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
          <div className="patch-actions">
            <button className="primary-action-btn" type="button" onClick={onConfirm}>
              Run
            </button>
            <button className="patch-btn patch-btn-reject" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking')
  const [workspacePath, setWorkspacePath] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])

  // Multi-tab state
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activePath, setActivePath] = useState('')

  const [message, setMessage] = useState('Welcome to EeVe Studio. Open a project to begin.')
  const [isWorking, setIsWorking] = useState(false)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)

  // AI Agent State
  const [isAssistantOpen, setIsAssistantOpen] = useState(true)
  const [agentPrompt, setAgentPrompt] = useState('')
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [agentAnswer, setAgentAnswer] = useState('')
  const [agentError, setAgentError] = useState('')
  const [isAgentWorking, setIsAgentWorking] = useState(false)
  const [patches, setPatches] = useState<PatchWithStatus[]>([])

  // Drawer & Execution State
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [isDrawerMaximized, setIsDrawerMaximized] = useState(false)
  const [activeDrawerTab, setActiveDrawerTab] = useState<ActiveDrawerTab>('terminal')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(
    null
  )

  // Navigation Rail State
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('explorer')

  const activeTab = tabs.find((t) => t.path === activePath)
  const isDirty = Boolean(activeTab && activeTab.content !== activeTab.savedContent)
  const canRunFile = Boolean(activePath?.endsWith('.py') && !isRunning)
  const hasError = Boolean(
    runResult && (runResult.exit_code !== 0 || (runResult.stderr && runResult.stderr.trim().length > 0))
  )

  const checkBackend = useCallback(async () => {
    setConnection('checking')
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const data: { status?: string } = await response.json()
      setConnection(data.status === 'ok' ? 'connected' : 'offline')
    } catch {
      setConnection('offline')
    }
  }, [])

  const openWorkspace = async (path: string) => {
    if (!path.trim()) return
    setIsWorking(true)
    setMessage(`Opening workspace at ${path}…`)
    try {
      const workspaceResponse = await fetch(`${API_BASE_URL}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path.trim() }),
      })
      if (!workspaceResponse.ok) throw new Error(await getErrorMessage(workspaceResponse))
      const workspace: { name: string; path: string } = await workspaceResponse.json()

      const filesResponse = await fetch(`${API_BASE_URL}/files`)
      if (!filesResponse.ok) throw new Error(await getErrorMessage(filesResponse))
      const fileData: { items: FileItem[] } = await filesResponse.json()

      setWorkspaceName(workspace.name)
      setWorkspacePath(path.trim())
      setFiles(fileData.items)
      setTabs([])
      setActivePath('')
      setAgentEvents([])
      setAgentAnswer('')
      setAgentError('')
      setPatches([])
      setRunResult(null)
      setIsWorkspaceModalOpen(false)
      setMessage(`Opened project: ${workspace.name}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open workspace.')
    } finally {
      setIsWorking(false)
    }
  }

  const browseFolderFromPC = async () => {
    setIsBrowsing(true)
    setMessage('Opening native folder picker…')
    try {
      const response = await fetch(`${API_BASE_URL}/workspace/browse`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const data: { path: string } = await response.json()
      if (data.path && data.path.trim()) {
        void openWorkspace(data.path.trim())
        return data.path.trim()
      } else {
        setMessage('Folder selection cancelled.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not browse folder.')
    } finally {
      setIsBrowsing(false)
    }
  }

  const openFile = async (filePath: string) => {
    // If already open, simply activate tab
    const existing = tabs.find((t) => t.path === filePath)
    if (existing) {
      setActivePath(filePath)
      return
    }

    setIsWorking(true)
    setMessage(`Loading ${filePath}…`)
    try {
      const response = await fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(filePath)}`)
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const file: { path: string; content: string } = await response.json()

      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const newTab: OpenTab = {
        path: file.path,
        name: fileName,
        content: file.content,
        savedContent: file.content,
      }

      setTabs((prev) => [...prev, newTab])
      setActivePath(file.path)
      setMessage(`Opened ${file.path}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open file.')
    } finally {
      setIsWorking(false)
    }
  }

  const closeTab = (path: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.path !== path)
      if (activePath === path) {
        const nextActive = filtered[filtered.length - 1]?.path || ''
        setActivePath(nextActive)
      }
      return filtered
    })
  }

  const updateTabContent = (newContent: string) => {
    if (!activePath) return
    setTabs((prev) =>
      prev.map((t) => (t.path === activePath ? { ...t, content: newContent } : t))
    )
  }

  const saveFile = async () => {
    if (!activeTab || activeTab.content === activeTab.savedContent) return
    setIsWorking(true)
    setMessage(`Saving ${activeTab.path}…`)
    try {
      const response = await fetch(`${API_BASE_URL}/files/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))

      setTabs((prev) =>
        prev.map((t) => (t.path === activeTab.path ? { ...t, savedContent: t.content } : t))
      )
      setMessage(`Saved ${activeTab.path}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save file.')
    } finally {
      setIsWorking(false)
    }
  }

  const runAgent = async (overridePrompt?: string) => {
    const promptToRun = overridePrompt ?? agentPrompt
    if (!workspaceName) {
      setAgentError('Please open a project folder before asking Mivi.')
      return
    }
    if (!promptToRun.trim()) return

    setIsAgentWorking(true)
    setAgentEvents([])
    setAgentAnswer('')
    setAgentError('')
    setPatches([])
    try {
      const response = await fetch(`${API_BASE_URL}/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToRun.trim() }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const result: AgentResult = await response.json()
      setAgentEvents(result.events)
      if (result.error) setAgentError(result.error)
      if (result.answer) setAgentAnswer(result.answer)
      if (result.patches && result.patches.length > 0) {
        setPatches(result.patches.map((p) => ({ ...p, status: 'pending' as PatchStatus })))
      }
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Mivi could not complete this request.')
    } finally {
      setIsAgentWorking(false)
    }
  }

  const applyPatch = async (index: number) => {
    const patch = patches[index]
    if (!patch || patch.status !== 'pending') return

    setPatches((prev) =>
      prev.map((p, i) => (i === index ? { ...p, status: 'applying' as PatchStatus } : p))
    )

    try {
      const response = await fetch(`${API_BASE_URL}/patches/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: patch.path,
          original: patch.original,
          modified: patch.modified,
        }),
      })

      if (!response.ok) {
        const msg = await getErrorMessage(response)
        setPatches((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, status: 'failed' as PatchStatus, failMessage: msg } : p
          )
        )
        return
      }

      setPatches((prev) =>
        prev.map((p, i) => (i === index ? { ...p, status: 'applied' as PatchStatus } : p))
      )

      if (patch.is_new_file) {
        setMessage(`Created ${patch.path}`)
        // Refresh file tree
        const filesResponse = await fetch(`${API_BASE_URL}/files`)
        if (filesResponse.ok) {
          const fileData: { items: FileItem[] } = await filesResponse.json()
          setFiles(fileData.items)
        }
        void openFile(patch.path)
      } else {
        setMessage(`Patch applied to ${patch.path}`)
        // If file is open in editor, update content
        setTabs((prev) =>
          prev.map((t) =>
            t.path === patch.path
              ? { ...t, content: patch.modified, savedContent: patch.modified }
              : t
          )
        )
      }
    } catch (error) {
      setPatches((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, status: 'failed' as PatchStatus, failMessage: error instanceof Error ? error.message : 'Apply failed' }
            : p
        )
      )
    }
  }

  const rejectPatch = (index: number) => {
    setPatches((prev) =>
      prev.map((p, i) => (i === index ? { ...p, status: 'rejected' as PatchStatus } : p))
    )
    setMessage('Patch rejected.')
  }

  const executeRun = async (command: string, file?: string) => {
    setIsRunning(true)
    setRunResult(null)
    setIsDrawerOpen(true)
    setActiveDrawerTab(command === 'pytest' ? 'pytest' : 'terminal')
    setMessage(`Running ${command}${file ? ' ' + file : ''}…`)

    try {
      const body: { command: string; file?: string } = { command }
      if (file) body.file = file
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const result: RunResult = await response.json()
      setRunResult(result)
      if (result.timed_out) {
        setMessage(`Timed out: ${result.command_display}`)
      } else if (result.exit_code === 0) {
        setMessage(`✓ ${result.command_display} completed`)
      } else {
        setMessage(`✕ ${result.command_display} exited with ${result.exit_code}`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to execute command.')
    } finally {
      setIsRunning(false)
    }
  }

  const requestRunFile = (filePath?: string) => {
    const target = filePath || activePath
    if (!target || !target.endsWith('.py')) return
    setConfirmAction({
      message: `Run "python ${target}" in workspace?`,
      action: () => {
        setConfirmAction(null)
        void executeRun('python', target)
      },
    })
  }

  const requestRunPytest = () => {
    setConfirmAction({
      message: 'Run pytest test suite in the active workspace?',
      action: () => {
        setConfirmAction(null)
        void executeRun('pytest')
      },
    })
  }

  const explainError = () => {
    if (!runResult) return
    const errorContext = (runResult.stderr || runResult.stdout).slice(0, 2000)
    const prompt = `Explain this error from running ${runResult.command_display} and propose a fix:\n\n${errorContext}`
    setAgentPrompt(prompt)
    setIsAssistantOpen(true)
    void runAgent(prompt)
  }

  // Keyboard Shortcuts via Ref
  const shortcutsRef = useRef({ saveFile, requestRunFile, closeTab, activePath, canRunFile })
  useEffect(() => {
    shortcutsRef.current = { saveFile, requestRunFile, closeTab, activePath, canRunFile }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { saveFile, requestRunFile, closeTab, activePath, canRunFile } = shortcutsRef.current
      // Ctrl+S: Save file
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault()
        void saveFile()
      }
      // Ctrl+Shift+R: Run Python file
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        if (canRunFile) requestRunFile()
      }
      // Ctrl+P: Quick open workspace
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsWorkspaceModalOpen(true)
      }
      // Ctrl+W: Close active tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activePath) closeTab(activePath)
      }
      // Ctrl+`: Toggle bottom terminal drawer
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setIsDrawerOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let ignore = false
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data: { status?: string }) => {
        if (!ignore) setConnection(data.status === 'ok' ? 'connected' : 'offline')
      })
      .catch(() => {
        if (!ignore) setConnection('offline')
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="eeve-shell">
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmAction.action}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onOpenWorkspace={(path) => void openWorkspace(path)}
        onBrowseFromPC={browseFolderFromPC}
        currentPath={workspacePath}
        isWorking={isWorking}
        isBrowsing={isBrowsing}
      />

      {/* Topbar */}
      <Topbar
        connection={connection}
        workspaceName={workspaceName}
        onRetryConnection={() => void checkBackend()}
        onOpenWorkspaceClick={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Main Workspace Stage */}
      <div className="eeve-stage">
        {/* Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={setActiveSidebarTab}
          isAssistantOpen={isAssistantOpen}
          onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        />

        {/* Sidebar / Explorer */}
        {activeSidebarTab === 'explorer' && (
          <aside className="sidebar-panel">
            <FileTree
              items={files}
              selectedFile={activePath}
              onOpenFile={(path) => void openFile(path)}
              onRunFile={(path) => requestRunFile(path)}
              onAskAboutFile={(path) => {
                setAgentPrompt(`Explain the purpose and architecture of ${path}`)
                setIsAssistantOpen(true)
              }}
              workspaceName={workspaceName}
              onOpenWorkspacePrompt={() => setIsWorkspaceModalOpen(true)}
              onBrowseFromPC={() => void browseFolderFromPC()}
            />
          </aside>
        )}

        {/* Center: Tabs + Breadcrumbs + Monaco Editor + Bottom Drawer */}
        <main className="editor-work-area">
          <TabBar
            tabs={tabs}
            activePath={activePath}
            onSelectTab={setActivePath}
            onCloseTab={closeTab}
            onSave={() => void saveFile()}
            onRun={() => requestRunFile()}
            isDirty={isDirty}
            isWorking={isWorking}
            isRunning={isRunning}
            canRun={canRunFile}
          />

          <Breadcrumbs filePath={activePath} workspaceName={workspaceName} />

          <div className="monaco-wrapper">
            {activeTab ? (
              <Editor
                height="100%"
                language={
                  activeTab.name.endsWith('.json')
                    ? 'json'
                    : activeTab.name.endsWith('.md')
                    ? 'markdown'
                    : 'python'
                }
                theme="vs-dark"
                value={activeTab.content}
                onChange={(val) => updateTabContent(val ?? '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  automaticLayout: true,
                  cursorBlinking: 'phase',
                  cursorSmoothCaretAnimation: 'on',
                  bracketPairColorization: { enabled: true },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'all',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            ) : (
              <div className="empty-editor-splash">
                <Code2 size={40} className="splash-icon" />
                <h3 className="splash-title">No Files Open</h3>
                <p className="splash-hint">
                  {workspaceName
                    ? 'Select a file from the explorer on the left or press Ctrl+P to open.'
                    : 'Open a project workspace to begin editing code.'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Drawer */}
          <TerminalDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            activeTab={activeDrawerTab}
            onSelectTab={setActiveDrawerTab}
            runResult={runResult}
            isRunning={isRunning}
            onRunPytest={requestRunPytest}
            onExplainError={explainError}
            onClear={() => setRunResult(null)}
            hasError={hasError}
            workspaceName={workspaceName}
            statusMessage={message}
            isMaximized={isDrawerMaximized}
            onToggleMaximize={() => setIsDrawerMaximized(!isDrawerMaximized)}
          />
        </main>

        {/* Right Panel: Mivi AI Co-Pilot */}
        {isAssistantOpen && (
          <aside className="assistant-panel">
            <div className="assistant-header">
              <div className="assistant-title-group">
                <Bot size={16} className="text-purple" />
                <span className="assistant-title">Mivi AI Assistant</span>
              </div>
              <Sparkles size={14} className="text-muted" />
            </div>

            <div className="assistant-scroll-area">
              <PromptDeck
                prompt={agentPrompt}
                onChange={setAgentPrompt}
                onSubmit={() => void runAgent()}
                isWorking={isAgentWorking}
                hasWorkspace={Boolean(workspaceName)}
                activeFileName={activeTab?.name}
              />

              {agentError && (
                <div className="patch-feedback feedback-failed" role="alert">
                  <AlertCircle size={14} />
                  <span>{agentError}</span>
                </div>
              )}

              <AgentTimeline events={agentEvents} isWorking={isAgentWorking} />

              {/* Proposed Patches Section */}
              {patches.length > 0 && (
                <div className="patches-deck">
                  <div className="timeline-header">
                    <span>PROPOSED PATCHES ({patches.length})</span>
                  </div>
                  {patches.map((patch, idx) => (
                    <PatchCard
                      key={`patch-${idx}`}
                      patch={patch}
                      index={idx}
                      onApply={(i) => void applyPatch(i)}
                      onReject={(i) => rejectPatch(i)}
                    />
                  ))}
                </div>
              )}

              {/* Final Answer */}
              {agentAnswer && (
                <div className="agent-answer-card">
                  <div className="answer-header">
                    <Sparkles size={13} />
                    <span>Mivi's Solution</span>
                  </div>
                  <div className="answer-body">{agentAnswer}</div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Footer Status Bar */}
      <StatusBar
        isAgentWorking={isAgentWorking}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        selectedFile={activePath}
      />
    </div>
  )
}

export default App
