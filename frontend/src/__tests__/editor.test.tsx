import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../components/editor/TabBar'
import { Breadcrumbs } from '../components/editor/Breadcrumbs'
import type { OpenTab } from '../types'

const mockTabs: OpenTab[] = [
  { path: 'main.py', name: 'main.py', content: 'print("hello")', savedContent: 'print("hello")' },
  { path: 'agent/service.py', name: 'service.py', content: 'edited code', savedContent: 'original code' },
]

describe('TabBar Component', () => {
  it('renders all open tabs and highlights the active tab', () => {
    render(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={vi.fn()}
        onRun={vi.fn()}
        isDirty={false}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    expect(screen.getByText('main.py')).toBeInTheDocument()
    expect(screen.getByText('service.py')).toBeInTheDocument()

    const activeTab = screen.getByText('main.py').closest('.editor-tab')
    expect(activeTab).toHaveClass('active-tab')
  })

  it('displays unsaved dirty dot on modified tabs', () => {
    render(
      <TabBar
        tabs={mockTabs}
        activePath="agent/service.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={vi.fn()}
        onRun={vi.fn()}
        isDirty={true}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    expect(screen.getByTitle('Unsaved changes')).toBeInTheDocument()
  })

  it('selects and closes tabs', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={onSelect}
        onCloseTab={onClose}
        onSave={vi.fn()}
        onRun={vi.fn()}
        isDirty={false}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    fireEvent.click(screen.getByText('service.py'))
    expect(onSelect).toHaveBeenCalledWith('agent/service.py')

    const closeBtns = screen.getAllByTitle('Close (Ctrl+W)')
    fireEvent.click(closeBtns[0])
    expect(onClose).toHaveBeenCalledWith('main.py')
  })

  it('enables Save button only when isDirty is true', () => {
    const onSave = vi.fn()
    const { rerender } = render(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={onSave}
        onRun={vi.fn()}
        isDirty={false}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    const saveBtn = screen.getByTitle('Save file (Ctrl+S)')
    expect(saveBtn).toBeDisabled()

    rerender(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={onSave}
        onRun={vi.fn()}
        isDirty={true}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('handles Run button state and click', () => {
    const onRun = vi.fn()
    const { rerender } = render(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={vi.fn()}
        onRun={onRun}
        isDirty={false}
        isWorking={false}
        isRunning={false}
        canRun={true}
      />
    )
    const runBtn = screen.getByTitle('Run Python file (Ctrl+Shift+R)')
    expect(screen.getByText('Run')).toBeInTheDocument()
    fireEvent.click(runBtn)
    expect(onRun).toHaveBeenCalledTimes(1)

    rerender(
      <TabBar
        tabs={mockTabs}
        activePath="main.py"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onSave={vi.fn()}
        onRun={onRun}
        isDirty={false}
        isWorking={false}
        isRunning={true}
        canRun={true}
      />
    )
    expect(screen.getByText('Running…')).toBeInTheDocument()
    expect(runBtn).toBeDisabled()
  })
})

describe('Breadcrumbs Component', () => {
  it('returns null when filePath is empty', () => {
    const { container } = render(<Breadcrumbs filePath="" workspaceName="my-app" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders workspace name and path segments', () => {
    render(<Breadcrumbs filePath="agent/service.py" workspaceName="my-python-app" />)
    expect(screen.getByText('my-python-app')).toBeInTheDocument()
    expect(screen.getByText('agent')).toBeInTheDocument()
    expect(screen.getByText('service.py')).toBeInTheDocument()
  })
})
