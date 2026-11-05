// Regras de CPF da plataforma. O CPF é a chave do prontuário unificado, então
// só entra no sistema um número com formato, dígitos e cara de documento de verdade.
// Confirmar que o CPF existe na Receita Federal é papel do Serpro (ver src/cpf-verification).

/** Só "22916926402" ou "229.169.264-02". Qualquer outra coisa (letras, espaços no meio, máscara torta) é recusada */
const CPF_FORMAT = /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/

/**
 * CPFs com dígitos verificadores corretos, mas que circulam em tutoriais, geradores,
 * documentações de APIs e formulários de exemplo. Nenhum paciente real é cadastrado com eles.
 */
export const EXAMPLE_CPFS: ReadonlySet<string> = new Set([
  '12345678909',
  '11144477735',
  '52998224725',
  '98765432100',
  '01234567890',
  '00000000191',
  '40442820135',
  '91708635203',
  '39053344705',
  '86288366757',
  '12312312387',
  '11122233396',
])

export const CPF_INVALID_MESSAGE = 'CPF inválido.'
export const CPF_EXAMPLE_MESSAGE = 'Este é um CPF de exemplo e não pode ser usado. Informe o CPF real do paciente.'

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Devolve só os dígitos se o texto estiver num formato aceito; senão, null */
export function normalizeCpf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return CPF_FORMAT.test(text) ? onlyDigits(text) : null
}

function checkDigit(base: string): number {
  const factorStart = base.length + 1
  const sum = base.split('').reduce((acc, digit, i) => acc + Number(digit) * (factorStart - i), 0)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

function hasValidCheckDigits(cpf: string): boolean {
  const first = checkDigit(cpf.slice(0, 9))
  const second = checkDigit(cpf.slice(0, 9) + first)
  return cpf.endsWith(`${first}${second}`)
}

/**
 * Motivo pelo qual o CPF não é aceito, ou null se estiver tudo certo.
 * Checa: formato, 11 dígitos repetidos (000.000.000-00...), dígitos verificadores e CPFs de exemplo.
 */
export function cpfProblem(value: unknown): string | null {
  const cpf = normalizeCpf(value)
  if (!cpf || /^(\d)\1{10}$/.test(cpf) || !hasValidCheckDigits(cpf)) return CPF_INVALID_MESSAGE
  if (EXAMPLE_CPFS.has(cpf)) return CPF_EXAMPLE_MESSAGE
  return null
}

export function isValidCpf(value: unknown): boolean {
  return cpfProblem(value) === null
}

/** Completa uma base de 9 dígitos com os dígitos verificadores (útil para gerar CPFs fictícios) */
export function completeCpf(base9: string): string {
  const first = checkDigit(base9)
  return base9 + first + checkDigit(base9 + first)
}
