import type { ReactNode } from 'react'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-mint-100 text-mint-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}
