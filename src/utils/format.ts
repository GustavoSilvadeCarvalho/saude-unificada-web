// Formatação de datas e números no padrão brasileiro.

/** Converte "AAAA-MM-DD" ou ISO completo em Date sem deslocamento de fuso para datas puras */
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
}

export function formatDate(value: string): string {
  return toDate(value).toLocaleDateString('pt-BR')
}

export function formatDateTime(value: string): string {
  return toDate(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const label = new Date(year, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  return label.replace('.', '')
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

export function calculateAge(birthDate: string): number {
  const birth = toDate(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}

/** Data de hoje no formato AAAA-MM-DD (fuso local) */
export function todayIso(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Gera um id simples para registros criados no front (mock) */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
