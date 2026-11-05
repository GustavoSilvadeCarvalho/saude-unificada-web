import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error' | 'warning'

const tones: Record<Tone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-mint-500/40 bg-mint-50 text-mint-700',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  )
}
