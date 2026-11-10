// Utilitários de CPF: limpeza, máscara e validação.
// Espelhado do frontend/src/utils/cpf.ts do monorepo (mesmos comportamentos).

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Aplica a máscara 000.000.000-00 progressivamente enquanto o usuário digita */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
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
