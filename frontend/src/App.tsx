import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import './App.css'

type ConnectionState = 'checking' | 'connected' | 'offline'
type FileItem = { name: string; path: string; type: 'file' | 'directory'; children?: FileItem[] }
type AgentEvent = { kind: 'plan' | 'tool' | 'observation' | 'answer' | 'error' | 'patch'; content: string }
type PatchProposal = { path: string; original: string; modified: string; diff: string; explanation: string; is_new_file?: boolean }
type AgentResult = { events: AgentEvent[]; answer?: string | null; error?: string | null; patches?: PatchProposal[] }
type PatchStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'failed'
type PatchWithStatus = PatchProposal & { status: PatchStatus; failMessage?: string }
type RunResult = { command_display: string; stdout: string; stderr: string; exit_code: number; timed_out: boolean }

const API_BASE_URL = 'http://127.0.0.1:8000'

async function getErrorMessage(response: Response) {
  const data: { detail?: string } = await response.json().catch(() => ({}))
  return data.detail ?? 'Something went wrong. Please try again.'
}

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n')
  return (
    <pre className="diff-block">
      {lines.map((line, i) => {
        let cls = 'diff-context'
        if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-add'
        else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-remove'
        else if (line.startsWith('@@')) cls = 'diff-hunk'
        return <div key={i} className={cls}>{line}</div>
      })}
    </pre>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-yes" type="button" onClick={onConfirm}>Run</button>
          <button className="confirm-btn confirm-no" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking')
  const [workspacePath, setWorkspacePath] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [message, setMessage] = useState('Enter a folder path to open a local project.')
  const [isWorking, setIsWorking] = useState(false)
  const [agentPrompt, setAgentPrompt] = useState('')
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [agentAnswer, setAgentAnswer] = useState('')
  const [agentError, setAgentError] = useState('')
  const [isAgentWorking, setIsAgentWorking] = useState(false)
  const [patches, setPatches] = useState<PatchWithStatus[]>([])

  // Phase 5 — terminal and run state
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(null)

  async function checkBackend() {
    setConnection('checking')
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const data: { status?: string } = await response.json()
      setConnection(data.status === 'ok' ? 'connected' : 'offline')
    } catch { setConnection('offline') }
  }

  async function openWorkspace() {
    if (!workspacePath.trim()) { setMessage('Enter the full path of an existing project folder first.'); return }
    setIsWorking(true); setMessage('Opening workspace…')
    try {
      const workspaceResponse = await fetch(`${API_BASE_URL}/workspace`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: workspacePath.trim() }) })
      if (!workspaceResponse.ok) throw new Error(await getErrorMessage(workspaceResponse))
      const workspace: { name: string } = await workspaceResponse.json()
      const filesResponse = await fetch(`${API_BASE_URL}/files`)
      if (!filesResponse.ok) throw new Error(await getErrorMessage(filesResponse))
      const fileData: { items: FileItem[] } = await filesResponse.json()
      setWorkspaceName(workspace.name); setFiles(fileData.items); setSelectedFile(''); setContent(''); setSavedContent('')
      setAgentEvents([]); setAgentAnswer(''); setAgentError(''); setPatches([]); setRunResult(null)
      setMessage(`Opened ${workspace.name}. Choose a text file from Explorer.`)
    } catch (error) {
      setFiles([]); setWorkspaceName(''); setMessage(error instanceof Error ? error.message : 'Could not open workspace.')
    } finally { setIsWorking(false) }
  }

  async function openFile(path: string) {
    setIsWorking(true); setMessage(`Opening ${path}…`)
    try {
      const response = await fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(path)}`)
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const file: { path: string; content: string } = await response.json()
      setSelectedFile(file.path); setContent(file.content); setSavedContent(file.content); setMessage(`Opened ${file.path}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open file.') } finally { setIsWorking(false) }
  }

  async function saveFile() {
    if (!selectedFile || content === savedContent) return
    setIsWorking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/files/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: selectedFile, content }) })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setSavedContent(content); setMessage(`Saved ${selectedFile}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save file.') } finally { setIsWorking(false) }
  }

  async function runAgent() {
    if (!workspaceName) { setAgentError('Open a workspace before asking Mivi.'); return }
    if (!agentPrompt.trim()) return
    setIsAgentWorking(true); setAgentEvents([]); setAgentAnswer(''); setAgentError(''); setPatches([])
    try {
      const response = await fetch(`${API_BASE_URL}/agent/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: agentPrompt.trim() }) })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const result: AgentResult = await response.json()
      setAgentEvents(result.events)
      if (result.error) setAgentError(result.error)
      if (result.answer) setAgentAnswer(result.answer)
      if (result.patches && result.patches.length > 0) {
        setPatches(result.patches.map(p => ({ ...p, status: 'pending' as PatchStatus })))
      }
    } catch (error) { setAgentError(error instanceof Error ? error.message : 'Mivi could not complete this request.') } finally { setIsAgentWorking(false) }
  }

  async function applyPatch(index: number) {
    const patch = patches[index]
    if (!patch || patch.status !== 'pending') return
    setPatches(prev => prev.map((p, i) => i === index ? { ...p, status: 'applying' as PatchStatus } : p))
    try {
      const response = await fetch(`${API_BASE_URL}/patches/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: patch.path, original: patch.original, modified: patch.modified }),
      })
      if (!response.ok) {
        const msg = await getErrorMessage(response)
        setPatches(prev => prev.map((p, i) => i === index ? { ...p, status: 'failed' as PatchStatus, failMessage: msg } : p))
        return
      }
      setPatches(prev => prev.map((p, i) => i === index ? { ...p, status: 'applied' as PatchStatus } : p))
      if (patch.is_new_file) {
        setMessage(`Created ${patch.path}`)
        // Refresh file tree to show the new file
        try {
          const filesResponse = await fetch(`${API_BASE_URL}/files`)
          if (filesResponse.ok) {
            const fileData: { items: FileItem[] } = await filesResponse.json()
            setFiles(fileData.items)
          }
        } catch { /* file tree refresh is best-effort */ }
        void openFile(patch.path)
      } else {
        setMessage(`Patch applied to ${patch.path}`)
        if (selectedFile === patch.path) {
          void openFile(patch.path)
        }
      }
    } catch (error) {
      setPatches(prev => prev.map((p, i) => i === index ? { ...p, status: 'failed' as PatchStatus, failMessage: error instanceof Error ? error.message : 'Apply failed' } : p))
    }
  }

  function rejectPatch(index: number) {
    setPatches(prev => prev.map((p, i) => i === index ? { ...p, status: 'rejected' as PatchStatus } : p))
    setMessage('Patch rejected — no files were changed.')
  }

  // Phase 5 — Run commands
  async function executeRun(command: string, file?: string) {
    setIsRunning(true); setRunResult(null); setMessage(`Running ${command}${file ? ' ' + file : ''}…`)
    try {
      const body: { command: string; file?: string } = { command }
      if (file) body.file = file
      const response = await fetch(`${API_BASE_URL}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const result: RunResult = await response.json()
      setRunResult(result)
      if (result.timed_out) {
        setMessage(`Command timed out: ${result.command_display}`)
      } else if (result.exit_code === 0) {
        setMessage(`✓ ${result.command_display} — exit code 0`)
      } else {
        setMessage(`✕ ${result.command_display} — exit code ${result.exit_code}`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to run command.')
    } finally { setIsRunning(false) }
  }

  function requestRunFile() {
    if (!selectedFile || !selectedFile.endsWith('.py')) return
    setConfirmAction({
      message: `Run python ${selectedFile}?`,
      action: () => { setConfirmAction(null); void executeRun('python', selectedFile) },
    })
  }

  function requestRunPytest() {
    setConfirmAction({
      message: 'Run pytest in the workspace?',
      action: () => { setConfirmAction(null); void executeRun('pytest') },
    })
  }

  function explainError() {
    if (!runResult) return
    const errorContext = (runResult.stderr || runResult.stdout).slice(0, 2000)
    const prompt = `Explain this error from running ${runResult.command_display}:\n\n${errorContext}`
    setAgentPrompt(prompt)
    // Auto-trigger after a tick so the prompt is set
    setTimeout(() => { void runAgent() }, 50)
  }

  useEffect(() => { void checkBackend() }, [])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !event.shiftKey) {
        event.preventDefault(); void saveFile()
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        if (selectedFile?.endsWith('.py')) requestRunFile()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const connectionLabel = { checking: 'Checking backend…', connected: 'Backend connected', offline: 'Backend offline' }[connection]
  const isDirty = selectedFile !== '' && content !== savedContent
  const canRunFile = selectedFile.endsWith('.py') && !isRunning
  const hasError = runResult && (runResult.exit_code !== 0 || (runResult.stderr && runResult.stderr.trim().length > 0))

  function renderItems(items: FileItem[]) {
    return <ul className="file-list">{items.map((item) => item.type === 'directory' ? <li key={item.path}><details><summary>{item.name}</summary>{renderItems(item.children ?? [])}</details></li> : <li key={item.path}><button className={selectedFile === item.path ? 'file-button active-file' : 'file-button'} type="button" onClick={() => void openFile(item.path)}>{item.name}</button></li>)}</ul>
  }

  return (
    <main className="mivi-shell">
      {confirmAction && <ConfirmDialog message={confirmAction.message} onConfirm={confirmAction.action} onCancel={() => setConfirmAction(null)} />}
      <header className="topbar"><div className="brand" aria-label="Mivi"><span className="brand-mark">M</span><span>Mivi</span></div><div className={`connection connection--${connection}`}><span className="status-dot" aria-hidden="true" />{connectionLabel}<button type="button" onClick={() => void checkBackend()}>Retry</button></div></header>
      <section className="workspace" aria-label="Mivi workspace">
        <aside className="panel explorer"><p className="panel-label">Explorer</p><label className="workspace-label" htmlFor="workspace-path">Workspace folder</label><input id="workspace-path" value={workspacePath} onChange={(event) => setWorkspacePath(event.target.value)} placeholder="C:\\Projects\\my-python-app" /><button className="open-button" type="button" onClick={() => void openWorkspace()} disabled={isWorking}>Open workspace</button>{workspaceName ? <p className="workspace-name">{workspaceName}</p> : <p className="muted">No folder open</p>}<nav aria-label="Workspace files">{renderItems(files)}</nav></aside>
        <section className="panel editor" aria-label="Code editor">
          <div className="editor-tab">
            <span>{selectedFile || 'No file open'}</span>
            {isDirty && <span className="unsaved">● Unsaved</span>}
            <div className="editor-tab-actions">
              <button type="button" onClick={() => void saveFile()} disabled={!isDirty || isWorking}>Save</button>
              {canRunFile && <button className="run-button" type="button" onClick={requestRunFile} disabled={isRunning}>{isRunning ? 'Running…' : '▶ Run'}</button>}
            </div>
          </div>
          {selectedFile ? <Editor height="100%" language="python" theme="vs-dark" value={content} onChange={(value) => setContent(value ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }} /> : <div className="empty-editor">Open a text file from Explorer to start editing.</div>}
        </section>
        <aside className="panel assistant-panel">
          <p className="panel-label">Mivi AI</p>
          <h2>AI Project Assistant</h2>
          <p className="muted">Ask Mivi to explain code, search the workspace, or suggest changes. Proposed changes require your approval before they are applied.</p>
          <textarea aria-label="Ask Mivi" value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} placeholder="Explain main.py, find usage of Workspace, or add validation to get_weather" rows={3} />
          <button className="ask-button" type="button" onClick={() => void runAgent()} disabled={isAgentWorking || !agentPrompt.trim()}>{isAgentWorking ? 'Mivi is thinking…' : 'Ask Mivi'}</button>
          {agentError && <p className="agent-error" role="alert">{agentError}</p>}
          {agentEvents.length > 0 && (
            <ol className="agent-events">
              {agentEvents.map((event, index) => (
                <li key={`${event.kind}-${index}`} className={`event-${event.kind}`}>
                  <strong>{event.kind}</strong>
                  <span>{event.content}</span>
                </li>
              ))}
            </ol>
          )}
          {patches.length > 0 && (
            <section className="patches-section" aria-label="Proposed changes">
              <h3>Proposed Changes</h3>
              {patches.map((patch, index) => (
                <div key={`patch-${index}`} className={`patch-card patch-${patch.status}`}>
                  <div className="patch-header">
                    <span className="patch-file">{patch.is_new_file ? '✦ ' : ''}{patch.path}</span>
                    {patch.is_new_file && <span className="patch-badge patch-badge--new">New file</span>}
                    <span className={`patch-badge patch-badge--${patch.status}`}>{patch.status}</span>
                  </div>
                  <p className="patch-explanation">{patch.explanation}</p>
                  <DiffView diff={patch.diff} />
                  {patch.status === 'pending' && (
                    <div className="patch-actions">
                      <button className="patch-apply" type="button" onClick={() => void applyPatch(index)}>✓ Apply</button>
                      <button className="patch-reject" type="button" onClick={() => rejectPatch(index)}>✕ Reject</button>
                    </div>
                  )}
                  {patch.status === 'failed' && patch.failMessage && (
                    <p className="patch-fail-message">{patch.failMessage}</p>
                  )}
                </div>
              ))}
            </section>
          )}
          {agentAnswer && <section className="agent-answer" aria-label="Mivi answer"><strong>Mivi</strong><p>{agentAnswer}</p></section>}
        </aside>
      </section>
      <section className="terminal" aria-label="Terminal">
        <div className="terminal-header">
          <span className="terminal-title">Terminal</span>
          <div className="terminal-header-actions">
            {workspaceName && <button className="run-pytest-button" type="button" onClick={requestRunPytest} disabled={isRunning}>{isRunning ? 'Running…' : 'Run pytest'}</button>}
            {hasError && <button className="explain-error-button" type="button" onClick={explainError} disabled={isAgentWorking}>Explain this error</button>}
          </div>
        </div>
        {isRunning && <p className="terminal-running">Running command…</p>}
        {runResult ? (
          <div className="terminal-output">
            <div className="terminal-command-bar">
              <span className="terminal-cmd">$ {runResult.command_display}</span>
              <span className={`terminal-exit ${runResult.exit_code === 0 ? 'exit-ok' : 'exit-fail'}`}>
                {runResult.timed_out ? 'TIMED OUT' : `exit ${runResult.exit_code}`}
              </span>
            </div>
            {runResult.stdout && <pre className="terminal-stdout">{runResult.stdout}</pre>}
            {runResult.stderr && <pre className="terminal-stderr">{runResult.stderr}</pre>}
          </div>
        ) : (
          <p className="terminal-empty">{message}</p>
        )}
      </section>
    </main>
  )
}

export default App
