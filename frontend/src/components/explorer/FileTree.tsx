import React, { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FileCode2,
  FileJson,
  FileText,
  File,
  Folder,
  FolderOpen,
  Play,
  Sparkles,
  FolderPlus,
  FolderSearch,
} from 'lucide-react'
import type { FileItem } from '../../types'

type FileTreeProps = {
  items: FileItem[]
  selectedFile: string
  onOpenFile: (path: string) => void
  onRunFile?: (path: string) => void
  onAskAboutFile?: (path: string) => void
  workspaceName: string
  onOpenWorkspacePrompt: () => void
  onBrowseFromPC?: () => void
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'py') return <FileCode2 size={14} className="file-icon text-python" />
  if (ext === 'json') return <FileJson size={14} className="file-icon text-amber" />
  if (ext === 'md' || ext === 'txt') return <FileText size={14} className="file-icon text-sky" />
  if (ext === 'env' || ext === 'toml' || ext === 'yaml' || ext === 'yml') {
    return <FileCode2 size={14} className="file-icon text-purple" />
  }
  return <File size={14} className="file-icon text-muted" />
}

type TreeItemProps = {
  item: FileItem
  selectedFile: string
  onOpenFile: (path: string) => void
  onRunFile?: (path: string) => void
  onAskAboutFile?: (path: string) => void
  depth?: number
}

const TreeItem: React.FC<TreeItemProps> = ({
  item,
  selectedFile,
  onOpenFile,
  onRunFile,
  onAskAboutFile,
  depth = 0,
}) => {
  const [isOpen, setIsOpen] = useState(true)

  if (item.type === 'directory') {
    return (
      <div className="tree-directory">
        <div
          className="tree-node tree-folder"
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="folder-arrow">
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          {isOpen ? (
            <FolderOpen size={14} className="folder-icon text-amber" />
          ) : (
            <Folder size={14} className="folder-icon text-amber" />
          )}
          <span className="node-name">{item.name}</span>
        </div>

        {isOpen && item.children && (
          <div className="folder-children">
            {item.children.map((child) => (
              <TreeItem
                key={child.path}
                item={child}
                selectedFile={selectedFile}
                onOpenFile={onOpenFile}
                onRunFile={onRunFile}
                onAskAboutFile={onAskAboutFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isSelected = selectedFile === item.path
  const isPython = item.name.endsWith('.py')

  return (
    <div
      className={`tree-node tree-file ${isSelected ? 'active-file' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 24}px` }}
      onClick={() => onOpenFile(item.path)}
    >
      {getFileIcon(item.name)}
      <span className="node-name" title={item.path}>
        {item.name}
      </span>

      <div className="file-actions" onClick={(e) => e.stopPropagation()}>
        {isPython && onRunFile && (
          <button
            className="file-action-btn"
            title="Run this Python file"
            onClick={() => onRunFile(item.path)}
          >
            <Play size={11} />
          </button>
        )}
        {onAskAboutFile && (
          <button
            className="file-action-btn"
            title="Ask Mivi about this file"
            onClick={() => onAskAboutFile(item.path)}
          >
            <Sparkles size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

export const FileTree: React.FC<FileTreeProps> = ({
  items,
  selectedFile,
  onOpenFile,
  onRunFile,
  onAskAboutFile,
  workspaceName,
  onOpenWorkspacePrompt,
  onBrowseFromPC,
}) => {
  return (
    <div className="file-tree-container">
      <div className="explorer-header">
        <span className="explorer-title">EXPLORER</span>
        <button
          className="explorer-action-btn"
          onClick={onOpenWorkspacePrompt}
          title="Open or change folder"
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {workspaceName ? (
        <div className="workspace-tree">
          <div className="workspace-root-label">
            <FolderOpen size={13} className="text-purple" />
            <span className="workspace-root-name">{workspaceName}</span>
          </div>

          <div className="tree-content">
            {items.length === 0 ? (
              <div className="empty-tree-msg">Folder is empty</div>
            ) : (
              items.map((item) => (
                <TreeItem
                  key={item.path}
                  item={item}
                  selectedFile={selectedFile}
                  onOpenFile={onOpenFile}
                  onRunFile={onRunFile}
                  onAskAboutFile={onAskAboutFile}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="no-workspace-card">
          <FolderPlus size={28} className="text-muted mb-2" />
          <p className="no-ws-title">No Folder Open</p>
          <p className="no-ws-desc">Select a project folder from your PC to browse files and run code.</p>
          {onBrowseFromPC ? (
            <div className="no-ws-actions">
              <button className="primary-action-btn w-full mb-2" onClick={onBrowseFromPC}>
                <FolderSearch size={14} />
                <span>Select Folder from PC</span>
              </button>
              <button className="secondary-action-btn w-full" onClick={onOpenWorkspacePrompt}>
                Enter Path Manually…
              </button>
            </div>
          ) : (
            <button className="primary-action-btn" onClick={onOpenWorkspacePrompt}>
              Open Project
            </button>
          )}
        </div>
      )}
    </div>
  )
}
