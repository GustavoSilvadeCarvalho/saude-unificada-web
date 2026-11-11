import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Mantido por compatibilidade: as seções não mostram mais ícone no título */
  icon?: ReactNode
  /** Ações exibidas à direita do título */
  actions?: ReactNode
  as?: 'section' | 'div' | 'article'
}

export function Card({ title, icon: _icon, actions, as: Tag = 'section', className = '', children, ...props }: CardProps) {
  return (
    <Tag className={`rounded-lg border border-slate-300 bg-white p-5 ${className}`} {...props}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          {title && (
            <h2 className="text-base font-semibold text-slate-900">
              {title}
            </h2>
          )}
          {actions}
        </header>
      )}
      {children}
    </Tag>
  )
}
