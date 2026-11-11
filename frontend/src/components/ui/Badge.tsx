import type { ReactNode } from 'react'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'border-slate-300 bg-white text-slate-600',
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-mint-500/40 bg-mint-50 text-mint-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  danger: 'border-red-300 bg-red-50 text-red-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-px text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
