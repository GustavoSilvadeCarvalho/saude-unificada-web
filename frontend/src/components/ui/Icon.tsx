// Conjunto pequeno de ícones SVG inline (evita adicionar uma biblioteca só para isso).
// Traços no estilo "outline", 24x24, herdando a cor do texto.

const paths = {
  heart: 'M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2 0 3.4 1.1 4.4 2.5 1-1.4 2.4-2.5 4.4-2.5 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z',
  shield: 'M12 3l8 3v6c0 4.6-3.4 8.4-8 9-4.6-.6-8-4.4-8-9V6l8-3zM9 12l2 2 4-4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  stethoscope: 'M6 3v6a4 4 0 008 0V3M10 13v3a5 5 0 0010 0v-2M20 14a2 2 0 100-4 2 2 0 000 4z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  history: 'M3 12a9 9 0 103-6.7M3 4v5h5M12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  file: 'M14 3H6v18h12V7l-4-4zM14 3v4h4M9 13h6M9 17h6',
  pill: 'M10.5 20.5a5 5 0 01-7-7l6-6a5 5 0 017 7l-6 6zM7 10l7 7',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17.5v.5',
  drop: 'M12 3s7 7.5 7 12a7 7 0 01-14 0c0-4.5 7-12 7-12z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  chat: 'M4 5h16v11H8l-4 4V5z',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevronDown: 'M6 9l6 6 6-6',
  check: 'M5 12l5 5 9-10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  map: 'M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
} as const

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  className?: string
  /** Se informado, o ícone é anunciado por leitores de tela */
  label?: string
}

export function Icon({ name, className = 'h-5 w-5', label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={paths[name]} />
    </svg>
  )
}
