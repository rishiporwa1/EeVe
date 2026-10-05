import React, { useState } from 'react'
import {
  FileCode2,
  Check,
  X,
  FilePlus,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { PatchWithStatus } from '../../types'

type PatchCardProps = {
  patch: PatchWithStatus
  index: number
  onApply: (index: number) => void
  onReject: (index: number) => void
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
        return (
          <div key={i} className={cls}>
            <span className="diff-line-content">{line}</span>
          </div>
        )
      })}
    </pre>
  )
}

export const PatchCard: React.FC<PatchCardProps> = ({
  patch,
  index,
  onApply,
  onReject,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const isPending = patch.status === 'pending'
  const isApplying = patch.status === 'applying'
  const isApplied = patch.status === 'applied'
  const isRejected = patch.status === 'rejected'
  const isFailed = patch.status === 'failed'

  return (
    <div className={`patch-card patch-${patch.status}`}>
      {/* Header */}
      <div className="patch-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="patch-title-group">
          {patch.is_new_file ? (
            <FilePlus size={14} className="text-emerald" />
          ) : (
            <FileCode2 size={14} className="text-purple" />
          )}
          <span className="patch-path">{patch.path}</span>
          {patch.is_new_file && <span className="badge badge-new">NEW</span>}
        </div>

        <div className="patch-status-group">
          <span className={`badge badge-${patch.status}`}>{patch.status}</span>
          <button className="patch-toggle-btn" title="Toggle Diff View">
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="patch-card-body">
          {patch.explanation && (
            <p className="patch-explanation">{patch.explanation}</p>
          )}

          <div className="diff-container">
            <DiffView diff={patch.diff} />
          </div>

          {isPending && (
            <div className="patch-actions">
              <button
                type="button"
                className="patch-btn patch-btn-apply"
                onClick={() => onApply(index)}
              >
                <Check size={13} />
                <span>Accept Patch</span>
              </button>
              <button
                type="button"
                className="patch-btn patch-btn-reject"
                onClick={() => onReject(index)}
              >
                <X size={13} />
                <span>Reject</span>
              </button>
            </div>
          )}

          {isApplying && (
            <div className="patch-applying-state">
              <Loader2 size={13} className="spin text-purple" />
              <span>Applying changes to workspace…</span>
            </div>
          )}

          {isApplied && (
            <div className="patch-feedback feedback-applied">
              <Check size={13} />
              <span>Changes applied successfully to file.</span>
            </div>
          )}

          {isRejected && (
            <div className="patch-feedback feedback-rejected">
              <X size={13} />
              <span>Patch was declined.</span>
            </div>
          )}

          {isFailed && (
            <div className="patch-feedback feedback-failed">
              <AlertCircle size={13} />
              <span>{patch.failMessage ?? 'Failed to apply patch.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
