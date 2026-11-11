// Formatação de datas e números no padrão brasileiro.
// Espelhado do frontend/src/utils/format.ts do monorepo (só o que o app do paciente usa).

/** Converte "AAAA-MM-DD" ou ISO completo em Date sem deslocar fuso para datas puras */
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
}

export function formatDate(value: string): string {
  return toDate(value).toLocaleDateString('pt-BR')
}

export function formatDateTime(value: string): string {
  return toDate(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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

/** Máscara dd/mm/aaaa progressiva para a data de nascimento no cadastro */
export function maskDateBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** dd/mm/aaaa → AAAA-MM-DD (para enviar à API) */
export function dateBrToIso(value: string): string | null {
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (year.length !== 4) return null
  const dayN = Number(day)
  const monthN = Number(month)
  if (dayN < 1 || dayN > 31 || monthN < 1 || monthN > 12) return null
  return `${year}-${month}-${day}`
}

/** Iniciais do nome (primeiro + último), usadas no avatar da carteira */
export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
