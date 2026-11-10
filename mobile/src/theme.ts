// Tema do app: paleta espelhada do site (frontend/src/index.css do monorepo).
// Azul-petróleo (brand) como primária e verde-água (mint) como secundária.

export const colors = {
  brand: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  mint: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    700: '#b45309',
  },
  white: '#ffffff',
} as const

/** Espaçamentos em dp (padding/margin) */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

/** Raios de borda */
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

/** Alvo mínimo de toque (Apple HIG: 44pt; Android MD: 48dp) */
export const touch = { min: 48 } as const
