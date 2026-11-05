import { Link } from 'react-router-dom'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Saúde Unificada — página inicial">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0e7490" />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="#fff" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Saúde<span className={light ? 'text-mint-100' : 'text-mint-600'}>Unificada</span>
      </span>
    </Link>
  )
}
