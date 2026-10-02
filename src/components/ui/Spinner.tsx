export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]'
  return (
    <span
      className={`inline-block ${dimension} animate-spin rounded-full border-current border-t-transparent`}
      aria-hidden="true"
    />
  )
}

/** Indicador de carregamento de página/seção, anunciado para leitores de tela */
export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-brand-700">
      <Spinner />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  )
}
