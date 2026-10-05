import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../components/explorer/FileTree'
import { WorkspaceModal } from '../components/explorer/WorkspaceModal'
import type { FileItem } from '../types'

const mockFiles: FileItem[] = [
  {
    name: 'agent',
    path: 'agent',
    type: 'directory',
    children: [
      { name: 'service.py', path: 'agent/service.py', type: 'file' },
      { name: 'schemas.py', path: 'agent/schemas.py', type: 'file' },
    ],
  },
  { name: 'main.py', path: 'main.py', type: 'file' },
  { name: 'config.json', path: 'config.json', type: 'file' },
]

describe('FileTree Component', () => {
  it('renders empty workspace prompt when no folder is open', () => {
    const onOpenPrompt = vi.fn()
    render(
      <FileTree
        items={[]}
        selectedFile=""
        onOpenFile={vi.fn()}
        workspaceName=""
        onOpenWorkspacePrompt={onOpenPrompt}
      />
    )
    expect(screen.getByText('No Folder Open')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Open Project'))
    expect(onOpenPrompt).toHaveBeenCalledTimes(1)
  })

  it('renders workspace root name and file items', () => {
    render(
      <FileTree
        items={mockFiles}
        selectedFile="main.py"
        onOpenFile={vi.fn()}
        workspaceName="my-python-app"
        onOpenWorkspacePrompt={vi.fn()}
      />
    )
    expect(screen.getByText('my-python-app')).toBeInTheDocument()
    expect(screen.getByText('agent')).toBeInTheDocument()
    expect(screen.getByText('main.py')).toBeInTheDocument()
    expect(screen.getByText('config.json')).toBeInTheDocument()
  })

  it('opens file when a file node is clicked', () => {
    const onOpen = vi.fn()
    render(
      <FileTree
        items={mockFiles}
        selectedFile=""
        onOpenFile={onOpen}
        workspaceName="my-python-app"
        onOpenWorkspacePrompt={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('main.py'))
    expect(onOpen).toHaveBeenCalledWith('main.py')
  })

  it('collapses and expands directory when clicked', () => {
    render(
      <FileTree
        items={mockFiles}
        selectedFile=""
        onOpenFile={vi.fn()}
        workspaceName="my-python-app"
        onOpenWorkspacePrompt={vi.fn()}
      />
    )
    // Initially open
    expect(screen.getByText('service.py')).toBeInTheDocument()

    // Click folder to collapse
    fireEvent.click(screen.getByText('agent'))
    expect(screen.queryByText('service.py')).not.toBeInTheDocument()

    // Click folder again to expand
    fireEvent.click(screen.getByText('agent'))
    expect(screen.getByText('service.py')).toBeInTheDocument()
  })

  it('triggers quick run and ask-about-file buttons on hover actions', () => {
    const onRun = vi.fn()
    const onAsk = vi.fn()
    render(
      <FileTree
        items={mockFiles}
        selectedFile=""
        onOpenFile={vi.fn()}
        onRunFile={onRun}
        onAskAboutFile={onAsk}
        workspaceName="my-python-app"
        onOpenWorkspacePrompt={vi.fn()}
      />
    )
    const runBtns = screen.getAllByTitle('Run this Python file')
    fireEvent.click(runBtns[0])
    expect(onRun).toHaveBeenCalledWith('agent/service.py')

    const askBtns = screen.getAllByTitle('Ask Mivi about this file')
    fireEvent.click(askBtns[0])
    expect(onAsk).toHaveBeenCalledWith('agent/service.py')
  })
})

describe('WorkspaceModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <WorkspaceModal
        isOpen={false}
        onClose={vi.fn()}
        onOpenWorkspace={vi.fn()}
        currentPath=""
        isWorking={false}
      />
    )
    expect(screen.queryByText('Open Local Project')).not.toBeInTheDocument()
  })

  it('renders modal dialog and submits entered path', () => {
    const onOpen = vi.fn()
    render(
      <WorkspaceModal
        isOpen={true}
        onClose={vi.fn()}
        onOpenWorkspace={onOpen}
        currentPath=""
        isWorking={false}
      />
    )
    expect(screen.getByText('Open Local Project')).toBeInTheDocument()

    const input = screen.getByPlaceholderText('e.g. C:\\Users\\Username\\Projects\\my-app')
    fireEvent.change(input, { target: { value: 'C:\\Users\\Test\\Project' } })
    fireEvent.click(screen.getByText('Open'))

    expect(onOpen).toHaveBeenCalledWith('C:\\Users\\Test\\Project')
  })

  it('calls onOpenWorkspace when clicking suggested chips', () => {
    const onOpen = vi.fn()
    render(
      <WorkspaceModal
        isOpen={true}
        onClose={vi.fn()}
        onOpenWorkspace={onOpen}
        currentPath=""
        isWorking={false}
      />
    )
    const chip = screen.getByText('c:\\Users\\HELLO H P\\Desktop\\EeVe')
    fireEvent.click(chip)
    expect(onOpen).toHaveBeenCalledWith('c:\\Users\\HELLO H P\\Desktop\\EeVe')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <WorkspaceModal
        isOpen={true}
        onClose={onClose}
        onOpenWorkspace={vi.fn()}
        currentPath=""
        isWorking={false}
      />
    )
    const backdrop = document.querySelector('.modal-backdrop')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('triggers onBrowseFromPC when clicking Select Folder from this PC', () => {
    const onBrowse = vi.fn()
    render(
      <WorkspaceModal
        isOpen={true}
        onClose={vi.fn()}
        onOpenWorkspace={vi.fn()}
        onBrowseFromPC={onBrowse}
        currentPath=""
        isWorking={false}
      />
    )
    const browseBtn = screen.getByText('Select Folder from this PC')
    fireEvent.click(browseBtn)
    expect(onBrowse).toHaveBeenCalledTimes(1)
  })

  it('triggers onBrowseFromPC from FileTree empty state', () => {
    const onBrowse = vi.fn()
    render(
      <FileTree
        items={[]}
        selectedFile=""
        onOpenFile={vi.fn()}
        workspaceName=""
        onOpenWorkspacePrompt={vi.fn()}
        onBrowseFromPC={onBrowse}
      />
    )
    const browseBtn = screen.getByText('Select Folder from PC')
    fireEvent.click(browseBtn)
    expect(onBrowse).toHaveBeenCalledTimes(1)
  })
})

