import React from 'react'
import { Files, Search, Bot, Terminal, GitBranch, Settings } from 'lucide-react'
import type { ActiveSidebarTab } from '../../types'

type ActivityBarProps = {
  activeTab: ActiveSidebarTab
  onSelectTab: (tab: ActiveSidebarTab) => void
  isAssistantOpen: boolean
  onToggleAssistant: () => void
  isDrawerOpen: boolean
  onToggleDrawer: () => void
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  isAssistantOpen,
  onToggleAssistant,
  isDrawerOpen,
  onToggleDrawer,
}) => {
  return (
    <aside className="activity-bar">
      <div className="activity-top">
        <button
          className={`activity-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => onSelectTab('explorer')}
          title="Explorer (Ctrl+Shift+E)"
        >
          <Files size={19} />
          {activeTab === 'explorer' && <span className="active-indicator" />}
        </button>

        <button
          className={`activity-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => onSelectTab('search')}
          title="Search"
        >
          <Search size={19} />
          {activeTab === 'search' && <span className="active-indicator" />}
        </button>

        <button
          className={`activity-btn ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => onSelectTab('git')}
          title="Source Control"
        >
          <GitBranch size={19} />
          {activeTab === 'git' && <span className="active-indicator" />}
        </button>

        <button
          className={`activity-btn ${isAssistantOpen ? 'active' : ''}`}
          onClick={onToggleAssistant}
          title="Toggle Mivi AI Panel"
        >
          <Bot size={19} />
          {isAssistantOpen && <span className="active-indicator" />}
        </button>

        <button
          className={`activity-btn ${isDrawerOpen ? 'active' : ''}`}
          onClick={onToggleDrawer}
          title="Toggle Terminal Drawer (Ctrl+`)"
        >
          <Terminal size={19} />
        </button>
      </div>

      <div className="activity-bottom">
        <button
          className={`activity-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  )
}
