import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TerminalDrawer } from '../components/drawer/TerminalDrawer'
import type { RunResult } from '../types'

const mockRunResult: RunResult = {
  command_display: 'python main.py',
  stdout: 'Hello World from EeVe!',
  stderr: '',
  exit_code: 0,
  timed_out: false,
}

const mockPytestResult: RunResult = {
  command_display: 'pytest',
  stdout: '================= 14 passed in 0.42s =================',
  stderr: '',
  exit_code: 0,
  timed_out: false,
}

const mockFailResult: RunResult = {
  command_display: 'pytest',
  stdout: '',
  stderr: 'AssertionError: 2 != 3\nFAILED tests/test_agent.py - 1 failed',
  exit_code: 1,
  timed_out: false,
}

describe('TerminalDrawer Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <TerminalDrawer
        isOpen={false}
        onClose={vi.fn()}
        activeTab="terminal"
        onSelectTab={vi.fn()}
        runResult={null}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={vi.fn()}
        onClear={vi.fn()}
        hasError={false}
        workspaceName="my-app"
        statusMessage="Ready"
        isMaximized={false}
        onToggleMaximize={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders command execution output and status', () => {
    render(
      <TerminalDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="terminal"
        onSelectTab={vi.fn()}
        runResult={mockRunResult}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={vi.fn()}
        onClear={vi.fn()}
        hasError={false}
        workspaceName="my-app"
        statusMessage="Ready"
        isMaximized={false}
        onToggleMaximize={vi.fn()}
      />
    )
    expect(screen.getByText('python main.py')).toBeInTheDocument()
    expect(screen.getByText('Hello World from EeVe!')).toBeInTheDocument()
    expect(screen.getByText('0 (SUCCESS)')).toBeInTheDocument()
  })

  it('switches between Terminal, Test Runner, and Status tabs', () => {
    const onSelectTab = vi.fn()
    render(
      <TerminalDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="terminal"
        onSelectTab={onSelectTab}
        runResult={mockPytestResult}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={vi.fn()}
        onClear={vi.fn()}
        hasError={false}
        workspaceName="my-app"
        statusMessage="Ready"
        isMaximized={false}
        onToggleMaximize={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Test Runner'))
    expect(onSelectTab).toHaveBeenCalledWith('pytest')

    fireEvent.click(screen.getByText('Status'))
    expect(onSelectTab).toHaveBeenCalledWith('logs')
  })

  it('displays pytest summary card with pass count', () => {
    render(
      <TerminalDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="pytest"
        onSelectTab={vi.fn()}
        runResult={mockPytestResult}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={vi.fn()}
        onClear={vi.fn()}
        hasError={false}
        workspaceName="my-app"
        statusMessage="Ready"
        isMaximized={false}
        onToggleMaximize={vi.fn()}
      />
    )
    expect(screen.getByText('All Tests Passed')).toBeInTheDocument()
    expect(screen.getByText('14 Passed')).toBeInTheDocument()
  })

  it('shows Explain Error button when hasError is true and calls handler', () => {
    const onExplain = vi.fn()
    render(
      <TerminalDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="terminal"
        onSelectTab={vi.fn()}
        runResult={mockFailResult}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={onExplain}
        onClear={vi.fn()}
        hasError={true}
        workspaceName="my-app"
        statusMessage="Failure"
        isMaximized={false}
        onToggleMaximize={vi.fn()}
      />
    )
    const explainBtn = screen.getByTitle('Ask Mivi to analyze this error and propose a fix')
    expect(explainBtn).toBeInTheDocument()

    fireEvent.click(explainBtn)
    expect(onExplain).toHaveBeenCalledTimes(1)
  })

  it('calls onClear, onToggleMaximize, and onClose when respective buttons are clicked', () => {
    const onClear = vi.fn()
    const onMaximize = vi.fn()
    const onClose = vi.fn()
    render(
      <TerminalDrawer
        isOpen={true}
        onClose={onClose}
        activeTab="terminal"
        onSelectTab={vi.fn()}
        runResult={mockRunResult}
        isRunning={false}
        onRunPytest={vi.fn()}
        onExplainError={vi.fn()}
        onClear={onClear}
        hasError={false}
        workspaceName="my-app"
        statusMessage="Ready"
        isMaximized={false}
        onToggleMaximize={onMaximize}
      />
    )
    fireEvent.click(screen.getByTitle('Clear Output'))
    expect(onClear).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Maximize Drawer'))
    expect(onMaximize).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Close Drawer (Ctrl+`)'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
