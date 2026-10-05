import React, { useRef } from 'react'
import { Sparkles, Send, Loader2, Bug, FileCode, TestTube2, Wand2 } from 'lucide-react'

type PromptDeckProps = {
  prompt: string
  onChange: (val: string) => void
  onSubmit: () => void
  isWorking: boolean
  hasWorkspace: boolean
  activeFileName?: string
}

export const PromptDeck: React.FC<PromptDeckProps> = ({
  prompt,
  onChange,
  onSubmit,
  isWorking,
  hasWorkspace,
  activeFileName,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim() && !isWorking && hasWorkspace) {
        onSubmit()
      }
    }
  }

  const applyPill = (text: string) => {
    onChange(text)
    textareaRef.current?.focus()
  }

  return (
    <div className="prompt-deck">
      {/* Quick Action Chips */}
      <div className="prompt-chips">
        {activeFileName && (
          <button
            type="button"
            className="chip-btn"
            onClick={() => applyPill(`Explain the purpose and logic of ${activeFileName}`)}
          >
            <FileCode size={11} className="text-purple" />
            <span>Explain file</span>
          </button>
        )}
        <button
          type="button"
          className="chip-btn"
          onClick={() =>
            applyPill(
              activeFileName
                ? `Generate pytest tests for ${activeFileName}`
                : 'Generate pytest tests for this project'
            )
          }
        >
          <TestTube2 size={11} className="text-emerald" />
          <span>Write tests</span>
        </button>
        <button
          type="button"
          className="chip-btn"
          onClick={() => applyPill('Check the workspace for bugs or edge cases')}
        >
          <Bug size={11} className="text-rose" />
          <span>Find bugs</span>
        </button>
        <button
          type="button"
          className="chip-btn"
          onClick={() => applyPill('Refactor and improve code clarity with docstrings')}
        >
          <Wand2 size={11} className="text-sky" />
          <span>Refactor</span>
        </button>
      </div>

      {/* Input container */}
      <div className="prompt-input-wrapper">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasWorkspace
              ? 'Ask Mivi to edit files, inspect errors, or explain architecture…'
              : 'Open a workspace first to ask Mivi…'
          }
          rows={3}
          disabled={!hasWorkspace || isWorking}
        />

        <div className="prompt-footer">
          <span className="prompt-hint">Press Enter to submit, Shift+Enter for newline</span>
          <button
            type="button"
            className="ask-primary-btn"
            onClick={onSubmit}
            disabled={!hasWorkspace || isWorking || !prompt.trim()}
          >
            {isWorking ? (
              <>
                <Loader2 size={13} className="spin" />
                <span>Thinking…</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Ask Mivi</span>
                <Send size={12} className="send-icon" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
