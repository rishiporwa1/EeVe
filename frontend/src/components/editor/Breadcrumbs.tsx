import React from 'react'
import { ChevronRight, FileCode2, Folder } from 'lucide-react'

type BreadcrumbsProps = {
  filePath: string
  workspaceName: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ filePath, workspaceName }) => {
  if (!filePath) return null

  const parts = filePath.split(/[/\\]/).filter(Boolean)

  return (
    <div className="breadcrumbs-bar">
      {workspaceName && (
        <>
          <div className="breadcrumb-item">
            <Folder size={12} className="text-muted" />
            <span>{workspaceName}</span>
          </div>
          <ChevronRight size={11} className="breadcrumb-separator" />
        </>
      )}

      {parts.map((part, index) => {
        const isLast = index === parts.length - 1
        return (
          <React.Fragment key={index}>
            <div className={`breadcrumb-item ${isLast ? 'breadcrumb-active' : ''}`}>
              {isLast ? (
                <FileCode2 size={12} className="text-python" />
              ) : (
                <Folder size={12} className="text-muted" />
              )}
              <span>{part}</span>
            </div>
            {!isLast && <ChevronRight size={11} className="breadcrumb-separator" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
