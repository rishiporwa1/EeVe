import React, { useState } from 'react'
import {
  Compass,
  Wrench,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileDiff,
} from 'lucide-react'
import type { AgentEvent, AgentEventKind } from '../../types'

type AgentTimelineProps = {
  events: AgentEvent[]
  isWorking: boolean
}

function getEventMeta(kind: AgentEventKind) {
  switch (kind) {
    case 'plan':
      return {
        icon: <Compass size={13} className="text-purple" />,
        label: 'Plan',
        cls: 'event-plan',
      }
    case 'tool':
      return {
        icon: <Wrench size={13} className="text-sky" />,
        label: 'Tool Execution',
        cls: 'event-tool',
      }
    case 'observation':
      return {
        icon: <Eye size={13} className="text-amber" />,
        label: 'Observation',
        cls: 'event-observation',
      }
    case 'patch':
      return {
        icon: <FileDiff size={13} className="text-purple" />,
        label: 'Patch Proposal',
        cls: 'event-patch',
      }
    case 'answer':
      return {
        icon: <CheckCircle2 size={13} className="text-emerald" />,
        label: 'Answer',
        cls: 'event-answer',
      }
    case 'error':
      return {
        icon: <AlertTriangle size={13} className="text-rose" />,
        label: 'Error',
        cls: 'event-error',
      }
  }
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ events, isWorking }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(events.length - 1)

  if (events.length === 0 && !isWorking) return null

  return (
    <div className="agent-timeline">
      <div className="timeline-header">
        <span className="timeline-title">REASONING TRACE</span>
        <span className="timeline-count">{events.length} steps</span>
      </div>

      <ol className="timeline-list">
        {events.map((event, index) => {
          const meta = getEventMeta(event.kind)
          const isExpanded = expandedIndex === index
          const isLast = index === events.length - 1

          return (
            <li key={`${event.kind}-${index}`} className={`timeline-node ${meta.cls}`}>
              <div
                className="node-header"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="node-icon-wrap">{meta.icon}</div>
                <span className="node-label">{meta.label}</span>
                <span className="node-preview">
                  {event.content.replace(/\n/g, ' ').slice(0, 48)}…
                </span>
                <span className="node-toggle">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              </div>

              {isExpanded && (
                <div className="node-body">
                  <pre className="node-content">{event.content}</pre>
                </div>
              )}

              {!isLast && <div className="timeline-stem" />}
            </li>
          )
        })}

        {isWorking && (
          <li className="timeline-node timeline-active">
            <div className="node-header">
              <div className="node-icon-wrap">
                <Loader2 size={13} className="spin text-purple" />
              </div>
              <span className="node-label">Thinking…</span>
            </div>
          </li>
        )}
      </ol>
    </div>
  )
}
