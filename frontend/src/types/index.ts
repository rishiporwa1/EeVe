export type ConnectionState = 'checking' | 'connected' | 'offline'

export type FileItem = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileItem[]
}

export type AgentEventKind = 'plan' | 'tool' | 'observation' | 'answer' | 'error' | 'patch'

export type AgentEvent = {
  kind: AgentEventKind
  content: string
}

export type PatchProposal = {
  path: string
  original: string
  modified: string
  diff: string
  explanation: string
  is_new_file?: boolean
}

export type AgentResult = {
  events: AgentEvent[]
  answer?: string | null
  error?: string | null
  patches?: PatchProposal[]
}

export type PatchStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'failed'

export type PatchWithStatus = PatchProposal & {
  status: PatchStatus
  failMessage?: string
}

export type RunResult = {
  command_display: string
  stdout: string
  stderr: string
  exit_code: number
  timed_out: boolean
}

export type OpenTab = {
  path: string
  name: string
  content: string
  savedContent: string
}

export type ActiveDrawerTab = 'terminal' | 'pytest' | 'logs'
export type ActiveSidebarTab = 'explorer' | 'search' | 'git' | 'settings'
