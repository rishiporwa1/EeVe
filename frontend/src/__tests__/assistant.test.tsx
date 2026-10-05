import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentTimeline } from '../components/assistant/AgentTimeline'
import { PromptDeck } from '../components/assistant/PromptDeck'
import { PatchCard } from '../components/assistant/PatchCard'
import type { AgentEvent, PatchWithStatus } from '../types'

const mockEvents: AgentEvent[] = [
  { kind: 'plan', content: 'Step 1: Inspect the repository' },
  { kind: 'tool', content: 'read_text_file(path="main.py")' },
  { kind: 'observation', content: 'Found def main() function' },
  { kind: 'patch', content: 'Proposed diff patch' },
  { kind: 'answer', content: 'Code refactored cleanly' },
]

const mockPatch: PatchWithStatus = {
  path: 'main.py',
  original: 'print("old")',
  modified: 'print("new")',
  diff: '@@ -1 +1 @@\n-print("old")\n+print("new")',
  explanation: 'Upgraded print statement to new message',
  status: 'pending',
}

describe('AgentTimeline Component', () => {
  it('returns null when events array is empty and not working', () => {
    const { container } = render(<AgentTimeline events={[]} isWorking={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all event kinds and labels', () => {
    render(<AgentTimeline events={mockEvents} isWorking={false} />)
    expect(screen.getByText('REASONING TRACE')).toBeInTheDocument()
    expect(screen.getByText('5 steps')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Tool Execution')).toBeInTheDocument()
    expect(screen.getByText('Observation')).toBeInTheDocument()
    expect(screen.getByText('Patch Proposal')).toBeInTheDocument()
    expect(screen.getByText('Answer')).toBeInTheDocument()
  })

  it('shows thinking spinner when isWorking is true', () => {
    render(<AgentTimeline events={mockEvents} isWorking={true} />)
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })

  it('toggles expansion of event details', () => {
    render(<AgentTimeline events={mockEvents} isWorking={false} />)
    // Initially the last item (Answer) is expanded
    expect(screen.getByText('Code refactored cleanly')).toBeInTheDocument()

    // Click on Plan node to toggle its details
    fireEvent.click(screen.getByText('Plan'))
    expect(screen.getByText('Step 1: Inspect the repository')).toBeInTheDocument()
  })
})

describe('PromptDeck Component', () => {
  it('renders quick action chips and populates prompt on click', () => {
    const onChange = vi.fn()
    render(
      <PromptDeck
        prompt=""
        onChange={onChange}
        onSubmit={vi.fn()}
        isWorking={false}
        hasWorkspace={true}
        activeFileName="main.py"
      />
    )
    expect(screen.getByText('Explain file')).toBeInTheDocument()
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('Find bugs')).toBeInTheDocument()
    expect(screen.getByText('Refactor')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Explain file'))
    expect(onChange).toHaveBeenCalledWith('Explain the purpose and logic of main.py')
  })

  it('disables input and submit button when no workspace is active', () => {
    render(
      <PromptDeck
        prompt="hello"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isWorking={false}
        hasWorkspace={false}
      />
    )
    const textarea = screen.getByPlaceholderText('Open a workspace first to ask Mivi…')
    expect(textarea).toBeDisabled()

    const submitBtn = screen.getByRole('button', { name: /ask mivi/i })
    expect(submitBtn).toBeDisabled()
  })

  it('submits on button click and on Enter key without shift', () => {
    const onSubmit = vi.fn()
    render(
      <PromptDeck
        prompt="Explain main.py"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isWorking={false}
        hasWorkspace={true}
      />
    )
    const submitBtn = screen.getByRole('button', { name: /ask mivi/i })
    fireEvent.click(submitBtn)
    expect(onSubmit).toHaveBeenCalledTimes(1)

    const textarea = screen.getByPlaceholderText('Ask Mivi to edit files, inspect errors, or explain architecture…')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSubmit).toHaveBeenCalledTimes(2)

    // Shift+Enter should NOT submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})

describe('PatchCard Component', () => {
  it('renders diff details, explanation, and action buttons', () => {
    const onApply = vi.fn()
    const onReject = vi.fn()
    render(
      <PatchCard
        patch={mockPatch}
        index={0}
        onApply={onApply}
        onReject={onReject}
      />
    )
    expect(screen.getByText('main.py')).toBeInTheDocument()
    expect(screen.getByText('Upgraded print statement to new message')).toBeInTheDocument()
    expect(screen.getByText('-print("old")')).toBeInTheDocument()
    expect(screen.getByText('+print("new")')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Accept Patch'))
    expect(onApply).toHaveBeenCalledWith(0)

    fireEvent.click(screen.getByText('Reject'))
    expect(onReject).toHaveBeenCalledWith(0)
  })

  it('renders applied status feedback', () => {
    const appliedPatch: PatchWithStatus = { ...mockPatch, status: 'applied' }
    render(
      <PatchCard
        patch={appliedPatch}
        index={0}
        onApply={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText('Changes applied successfully to file.')).toBeInTheDocument()
    expect(screen.queryByText('Accept Patch')).not.toBeInTheDocument()
  })

  it('renders rejected status feedback', () => {
    const rejectedPatch: PatchWithStatus = { ...mockPatch, status: 'rejected' }
    render(
      <PatchCard
        patch={rejectedPatch}
        index={0}
        onApply={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText('Patch was declined.')).toBeInTheDocument()
  })

  it('renders failed message when patch fails', () => {
    const failedPatch: PatchWithStatus = {
      ...mockPatch,
      status: 'failed',
      failMessage: 'Conflict detected in target line',
    }
    render(
      <PatchCard
        patch={failedPatch}
        index={0}
        onApply={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText('Conflict detected in target line')).toBeInTheDocument()
  })
})
