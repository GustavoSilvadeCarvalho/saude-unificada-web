import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Ícone ou elemento exibido à esquerda do título */
  icon?: ReactNode
  /** Ações exibidas à direita do título */
  actions?: ReactNode
  as?: 'section' | 'div' | 'article'
}

export function Card({ title, icon, actions, as: Tag = 'section', className = '', children, ...props }: CardProps) {
  return (
    <Tag className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...props}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {icon}
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
