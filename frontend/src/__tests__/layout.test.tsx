import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Topbar } from '../components/layout/Topbar'
import { ActivityBar } from '../components/layout/ActivityBar'
import { StatusBar } from '../components/layout/StatusBar'

describe('Topbar Component', () => {
  it('renders EeVe brand and badge', () => {
    render(
      <Topbar
        connection="connected"
        workspaceName="my-app"
        onRetryConnection={vi.fn()}
        onOpenWorkspaceClick={vi.fn()}
      />
    )
    expect(screen.getByText('EeVe')).toBeInTheDocument()
    expect(screen.getByText('AI STUDIO')).toBeInTheDocument()
    expect(screen.getByText('my-app')).toBeInTheDocument()
  })

  it('displays placeholder when no workspace is active', () => {
    render(
      <Topbar
        connection="connected"
        workspaceName=""
        onRetryConnection={vi.fn()}
        onOpenWorkspaceClick={vi.fn()}
      />
    )
    expect(screen.getByText('Open Folder…')).toBeInTheDocument()
    expect(screen.getByText('Open a workspace folder to start…')).toBeInTheDocument()
  })

  it('renders connected status correctly', () => {
    render(
      <Topbar
        connection="connected"
        workspaceName="demo"
        onRetryConnection={vi.fn()}
        onOpenWorkspaceClick={vi.fn()}
      />
    )
    expect(screen.getByText('Backend Live')).toBeInTheDocument()
  })

  it('renders offline status and triggers retry callback', () => {
    const onRetry = vi.fn()
    render(
      <Topbar
        connection="offline"
        workspaceName="demo"
        onRetryConnection={onRetry}
        onOpenWorkspaceClick={vi.fn()}
      />
    )
    expect(screen.getByText('Offline')).toBeInTheDocument()
    const retryBtn = screen.getByTitle('Retry connection')
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenWorkspaceClick when workspace pill or search bar is clicked', () => {
    const onOpen = vi.fn()
    render(
      <Topbar
        connection="connected"
        workspaceName="demo"
        onRetryConnection={vi.fn()}
        onOpenWorkspaceClick={onOpen}
      />
    )
    fireEvent.click(screen.getByTitle('Click to open or switch project folder'))
    expect(onOpen).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Quick open (Ctrl+P)'))
    expect(onOpen).toHaveBeenCalledTimes(2)
  })
})

describe('ActivityBar Component', () => {
  it('renders navigation buttons and marks active tab', () => {
    render(
      <ActivityBar
        activeTab="explorer"
        onSelectTab={vi.fn()}
        isAssistantOpen={true}
        onToggleAssistant={vi.fn()}
        isDrawerOpen={false}
        onToggleDrawer={vi.fn()}
      />
    )
    expect(screen.getByTitle('Explorer (Ctrl+Shift+E)')).toHaveClass('active')
    expect(screen.getByTitle('Toggle Mivi AI Panel')).toHaveClass('active')
  })

  it('calls onSelectTab with selected tab identifier', () => {
    const onSelect = vi.fn()
    render(
      <ActivityBar
        activeTab="explorer"
        onSelectTab={onSelect}
        isAssistantOpen={false}
        onToggleAssistant={vi.fn()}
        isDrawerOpen={false}
        onToggleDrawer={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTitle('Search'))
    expect(onSelect).toHaveBeenCalledWith('search')

    fireEvent.click(screen.getByTitle('Source Control'))
    expect(onSelect).toHaveBeenCalledWith('git')
  })

  it('toggles assistant and terminal drawer', () => {
    const onToggleAI = vi.fn()
    const onToggleDrawer = vi.fn()
    render(
      <ActivityBar
        activeTab="explorer"
        onSelectTab={vi.fn()}
        isAssistantOpen={false}
        onToggleAssistant={onToggleAI}
        isDrawerOpen={false}
        onToggleDrawer={onToggleDrawer}
      />
    )
    fireEvent.click(screen.getByTitle('Toggle Mivi AI Panel'))
    expect(onToggleAI).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Toggle Terminal Drawer (Ctrl+`)'))
    expect(onToggleDrawer).toHaveBeenCalledTimes(1)
  })
})

describe('StatusBar Component', () => {
  it('displays git branch, terminal toggle, and python env badge', () => {
    render(
      <StatusBar
        isAgentWorking={false}
        isDrawerOpen={true}
        onToggleDrawer={vi.fn()}
        selectedFile="main.py"
      />
    )
    expect(screen.getByText('main*')).toBeInTheDocument()
    expect(screen.getByText('Terminal')).toBeInTheDocument()
    expect(screen.getByText('Mivi AI Ready')).toBeInTheDocument()
    expect(screen.getByText('Ln 1, Col 1')).toBeInTheDocument()
    expect(screen.getByText('Spaces: 4')).toBeInTheDocument()
    expect(screen.getByText('UTF-8')).toBeInTheDocument()
    expect(screen.getByText('Python 3.11 (.venv)')).toBeInTheDocument()
  })

  it('shows thinking spinner when agent is working', () => {
    render(
      <StatusBar
        isAgentWorking={true}
        isDrawerOpen={false}
        onToggleDrawer={vi.fn()}
        selectedFile=""
      />
    )
    expect(screen.getByText('Mivi is thinking…')).toBeInTheDocument()
  })

  it('calls onToggleDrawer on click', () => {
    const onToggle = vi.fn()
    render(
      <StatusBar
        isAgentWorking={false}
        isDrawerOpen={false}
        onToggleDrawer={onToggle}
        selectedFile=""
      />
    )
    fireEvent.click(screen.getByTitle('Toggle Terminal Drawer'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
