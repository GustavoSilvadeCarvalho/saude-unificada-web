// Utilitários de CPF (mesma lógica de frontend/src/utils/cpf.ts)

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function checkDigit(base: string): number {
  const factorStart = base.length + 1
  const sum = base.split('').reduce((acc, digit, i) => acc + Number(digit) * (factorStart - i), 0)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/** Valida o CPF pelos dígitos verificadores */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const first = checkDigit(cpf.slice(0, 9))
  const second = checkDigit(cpf.slice(0, 9) + first)
  return cpf.endsWith(`${first}${second}`)
}

/** Completa uma base de 9 dígitos com os dígitos verificadores (usado no seed) */
export function completeCpf(base9: string): string {
  const first = checkDigit(base9)
  return base9 + first + checkDigit(base9 + first)
}
