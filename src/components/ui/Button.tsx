import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'bg-mint-600 text-white hover:bg-mint-700',
  outline: 'border border-brand-700 text-brand-700 bg-white hover:bg-brand-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  /** Para fundos escuros/coloridos */
  inverse: 'border border-white text-white hover:bg-white/15',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({ variant, size, loading, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

/** Link do React Router com aparência de botão */
export function ButtonLink({ variant, size, className = '', ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}
