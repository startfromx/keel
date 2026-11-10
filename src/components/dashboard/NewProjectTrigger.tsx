'use client'

interface NewProjectTriggerProps {
  children: React.ReactNode
  className?: string
}

export function NewProjectTrigger({ children, className }: NewProjectTriggerProps) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('keel:new-project'))} className={className}>
      {children}
    </button>
  )
}
